import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { CreateOrderDto } from './dto/order.dto'
import { OrderStatus } from '@prisma/client'

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
