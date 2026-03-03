import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { CreateOrderDto, CreateOrderFromCartDto } from './dto/order.dto'
import { OrderStatus, StockStatus } from '@prisma/client'

// Valid transitions for user-initiated actions
const USER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.CANCELLED],
  PAID: [],
  IN_PRODUCTION: [],
  SHIPPED: [],
  DELIVERED: [],
  CANCELLED: [],
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name)

  constructor(private readonly prisma: PrismaService) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.productVariantId },
      include: { product: true },
    })

    if (!variant || !variant.product.isActive) {
      throw new NotFoundException('Variante de producto no encontrada')
    }

    if (variant.stockStatus === 'OUT_OF_STOCK') {
      throw new BadRequestException('Variante sin stock disponible')
    }

    // Collect zone→uploadId pairs, ignoring undefined entries
    const zoneUploads: Array<{ zone: string; uploadId: string }> = Object.entries(
      dto.uploads,
    )
      .filter(([, id]) => id != null)
      .map(([zone, id]) => ({ zone, uploadId: id as string }))

    if (zoneUploads.length === 0) {
      throw new BadRequestException('Se requiere al menos un diseño (FRONT, BACK o TAG)')
    }

    // Validate every upload exists, belongs to user, and is VALIDATED
    const uploadIds = zoneUploads.map((z) => z.uploadId)
    const uploads = await this.prisma.upload.findMany({
      where: { id: { in: uploadIds } },
    })

    for (const { zone, uploadId } of zoneUploads) {
      const upload = uploads.find((u) => u.id === uploadId)
      if (!upload) {
        throw new NotFoundException(`Upload ${uploadId} no encontrado`)
      }
      if (upload.userId !== userId) {
        throw new ForbiddenException(`No tenés acceso al upload de zona ${zone}`)
      }
      if (upload.status !== 'VALIDATED') {
        throw new BadRequestException(
          `El upload de zona ${zone} no está validado (estado: ${upload.status})`,
        )
      }
    }

    const unitPrice = variant.product.basePrice + variant.additionalPrice
    const subtotal = unitPrice * dto.quantity
    const total = subtotal

    // Primary upload is the first zone; all zone mappings stored in customizations
    const primaryUploadId = zoneUploads[0].uploadId
    const zonesMap = Object.fromEntries(zoneUploads.map(({ zone, uploadId }) => [zone, uploadId]))

    const order = await this.prisma.order.create({
      data: {
        userId,
        status: OrderStatus.DRAFT,
        subtotal,
        total,
        currency: 'ARS',
        shippingAddress: {
          street: dto.shippingAddress.street,
          city: dto.shippingAddress.city,
          province: dto.shippingAddress.province,
          postalCode: dto.shippingAddress.postalCode,
          country: dto.shippingAddress.country ?? 'AR',
        },
        notes: dto.notes,
        items: {
          create: {
            productVariantId: dto.productVariantId,
            uploadId: primaryUploadId,
            quantity: dto.quantity,
            unitPrice,
            customizations: zonesMap,
          },
        },
      },
      include: this.orderIncludes(),
    })

    this.logger.log(`Order created: ${order.id} for user ${userId}`)
    return order
  }

  async confirmOrder(userId: string, orderId: string) {
    const order = await this.findOrderForUser(userId, orderId)
    this.validateUserTransition(order.status, OrderStatus.CONFIRMED)

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CONFIRMED },
      include: this.orderIncludes(),
    })
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.findOrderForUser(userId, orderId)
    this.validateUserTransition(order.status, OrderStatus.CANCELLED)

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
      include: this.orderIncludes(),
    })
  }

  async getUserOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: this.orderIncludes(),
      orderBy: { createdAt: 'desc' },
    })
  }

  async getOrderById(userId: string, orderId: string) {
    return this.findOrderForUser(userId, orderId)
  }

  /**
   * Create order from server-side cart.
   * Supports both authenticated users and guests (via guestId header).
   * Re-validates all prices, stock, and upload ownership.
   * Never trusts client-supplied prices.
   * Auto-confirms the order so guests can go straight to payment.
   */
  async createOrderFromCart(
    dto: CreateOrderFromCartDto,
    userId?: string,
    guestId?: string,
  ) {
    if (!userId && !guestId) {
      throw new ForbiddenException('Se requiere autenticación o sesión de invitado')
    }

    // 1. Fetch cart with items — validate ownership by userId OR guestId
    const cart = await this.prisma.cart.findUnique({
      where: { id: dto.cartId },
      include: { items: true },
    })

    if (!cart) throw new NotFoundException('Carrito no encontrado')

    const ownedByUser = userId && cart.userId === userId
    const ownedByGuest = guestId && cart.guestId === guestId
    if (!ownedByUser && !ownedByGuest) {
      throw new ForbiddenException('No tenés acceso a este carrito')
    }

    if (cart.items.length === 0) throw new BadRequestException('El carrito está vacío')

    // 2. Validate each item server-side
    const orderItemsData: Array<{
      productVariantId: string
      uploadId: string | null
      quantity: number
      unitPrice: number
      customizations: Record<string, string>
    }> = []

    let subtotal = 0

    for (const item of cart.items) {
      // Re-fetch variant + product
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: item.variantId },
        include: { product: true },
      })

      if (!variant || !variant.product.isActive) {
        throw new NotFoundException(
          `Variante ${item.variantId} no encontrada o producto inactivo`,
        )
      }

      if (variant.stockStatus === StockStatus.OUT_OF_STOCK) {
        throw new BadRequestException(
          `Variante "${variant.color} / ${variant.size}" sin stock`,
        )
      }

      // Server-side price (never from snapshot)
      const unitPrice = variant.product.basePrice + variant.additionalPrice
      subtotal += unitPrice * item.quantity

      // Validate uploads from draft
      let primaryUploadId: string | null = null
      let zonesMap: Record<string, string> = {}

      if (item.draftDesignId) {
        const draft = await this.prisma.draftDesign.findUnique({
          where: { id: item.draftDesignId },
        })

        if (draft) {
          const uploadIds = draft.uploadIds as Record<string, string>
          const uploadEntries = Object.entries(uploadIds).filter(([, id]) => id)

          for (const [zone, uploadId] of uploadEntries) {
            const upload = await this.prisma.upload.findUnique({
              where: { id: uploadId },
            })

            if (!upload) {
              throw new NotFoundException(`Upload ${uploadId} no encontrado`)
            }
            // Only validate ownership for authenticated users (guests can't upload)
            if (userId && upload.userId !== userId) {
              throw new ForbiddenException(`Upload en zona ${zone} no te pertenece`)
            }
            if (upload.status !== 'VALIDATED') {
              throw new BadRequestException(
                `Upload en zona ${zone} no está validado (estado: ${upload.status})`,
              )
            }

            zonesMap[zone] = uploadId
            if (!primaryUploadId) primaryUploadId = uploadId
          }
        }
      }

      orderItemsData.push({
        productVariantId: item.variantId,
        uploadId: primaryUploadId,
        quantity: item.quantity,
        unitPrice,
        customizations: zonesMap,
      })
    }

    const total = subtotal // shipping = 0 for now

    // 3. Create order + items in a transaction, then clear cart
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          // Authenticated users link by userId; guests use guestId + guestEmail
          userId: userId ?? null,
          guestId: userId ? null : (guestId ?? null),
          guestEmail: userId ? null : (dto.guestEmail ?? null),
          // Auto-confirm so guests can proceed straight to payment
          status: OrderStatus.CONFIRMED,
          subtotal,
          total,
          currency: 'ARS',
          shippingAddress: {
            street: dto.shippingAddress.street,
            city: dto.shippingAddress.city,
            province: dto.shippingAddress.province,
            postalCode: dto.shippingAddress.postalCode,
            country: dto.shippingAddress.country ?? 'AR',
          },
          notes: dto.notes,
          items: {
            create: orderItemsData.map((item) => ({
              productVariantId: item.productVariantId,
              uploadId: item.uploadId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              customizations: item.customizations,
            })),
          },
        },
        include: this.orderIncludes(),
      })

      // Clear cart items after order is created
      await tx.cartItem.deleteMany({
        where: { cartId: dto.cartId },
      })

      return newOrder
    })

    this.logger.log(
      `Order created from cart: ${order.id} for ${userId ? `user ${userId}` : `guest ${guestId}`}`,
    )
    return order
  }

  // Used internally by PaymentsService after webhook approval
  async markAsPaid(orderId: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID },
    })
  }

  async findOrderForUser(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.orderIncludes(),
    })

    if (!order) throw new NotFoundException('Pedido no encontrado')
    if (order.userId !== userId) throw new ForbiddenException('No tenés acceso a este pedido')

    return order
  }

  private validateUserTransition(current: OrderStatus, next: OrderStatus) {
    const allowed = USER_TRANSITIONS[current]
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Transición inválida: el pedido está en estado ${current} y no puede pasar a ${next}`,
      )
    }
  }

  private orderIncludes() {
    return {
      items: {
        include: {
          productVariant: { include: { product: true } },
          upload: true,
        },
      },
      payment: true,
      printJob: true,
    }
  }
}
