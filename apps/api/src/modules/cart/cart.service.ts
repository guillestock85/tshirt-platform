import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { DraftStatus, StockStatus } from '@prisma/client'
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto'

const GUEST_TTL_DAYS = 30

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get (or create) cart for the requester, with enriched items.
   * Computes currentUnitPrice live from DB for each item.
   */
  async getCart(userId?: string, guestId?: string) {
    const cart = await this.findOrCreateCart(userId, guestId)

    const enrichedItems = await Promise.all(
      cart.items.map(async (item) => {
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        })
        if (!variant) return null

        const currentUnitPrice = variant.product.basePrice + variant.additionalPrice
        const priceChanged = item.unitPriceSnapshot !== currentUnitPrice

        const draft = item.draftDesignId
          ? await this.prisma.draftDesign.findUnique({
              where: { id: item.draftDesignId },
            })
          : null

        return {
          id: item.id,
          draftDesignId: item.draftDesignId,
          variant: {
            id: variant.id,
            color: variant.color,
            colorHex: variant.colorHex,
            size: variant.size,
            product: {
              id: variant.product.id,
              name: variant.product.name,
              slug: variant.product.slug,
            },
          },
          quantity: item.quantity,
          unitPriceSnapshot: item.unitPriceSnapshot,
          currentUnitPrice,
          priceChanged,
          uploadIds: (draft?.uploadIds ?? {}) as Record<string, string>,
          previewS3Key: draft?.previewS3Key ?? null,
        }
      }),
    )

    const items = enrichedItems.filter(Boolean)
    const subtotal = items.reduce(
      (sum, item) => sum + item!.currentUnitPrice * item!.quantity,
      0,
    )

    return {
      id: cart.id,
      items,
      subtotal,
    }
  }

  /**
   * Add a draft design to the cart.
   * Server-side: reads variant/price from draft, never trusts client.
   */
  async addToCart(dto: AddToCartDto, userId?: string, guestId?: string) {
    // 1. Fetch and authorize draft
    const draft = await this.prisma.draftDesign.findUnique({
      where: { id: dto.draftDesignId },
    })

    if (!draft) throw new NotFoundException('Borrador no encontrado')
    if (draft.status !== DraftStatus.ACTIVE) {
      throw new BadRequestException('El borrador ya fue agregado al carrito o expiró')
    }

    const isOwner =
      (userId && draft.userId === userId) ||
      (guestId && draft.guestId === guestId)

    if (!isOwner) throw new ForbiddenException('No tenés acceso a este borrador')

    // 2. Server-side price calculation
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: draft.variantId },
      include: { product: true },
    })

    if (!variant || !variant.product.isActive) {
      throw new NotFoundException('Variante de producto no encontrada')
    }

    if (variant.stockStatus === StockStatus.OUT_OF_STOCK) {
      throw new BadRequestException('La variante seleccionada no tiene stock disponible')
    }

    const unitPrice = variant.product.basePrice + variant.additionalPrice

    // 3. Find or create cart
    const cart = await this.findOrCreateCart(userId, guestId)

    // 4. Create CartItem + mark draft as CONVERTED
    const [cartItem] = await this.prisma.$transaction([
      this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          draftDesignId: draft.id,
          variantId: draft.variantId,
          quantity: draft.quantity,
          unitPriceSnapshot: unitPrice,
        },
      }),
      this.prisma.draftDesign.update({
        where: { id: draft.id },
        data: { status: DraftStatus.CONVERTED },
      }),
    ])

    this.logger.log(`CartItem created: ${cartItem.id} for cart ${cart.id}`)
    return this.getCart(userId, guestId)
  }

  /**
   * Update quantity of a cart item.
   */
  async updateCartItem(
    itemId: string,
    dto: UpdateCartItemDto,
    userId?: string,
    guestId?: string,
  ) {
    await this.authorizeCartItem(itemId, userId, guestId)

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    })

    return this.getCart(userId, guestId)
  }

  /**
   * Remove a cart item.
   */
  async removeCartItem(itemId: string, userId?: string, guestId?: string) {
    await this.authorizeCartItem(itemId, userId, guestId)
    await this.prisma.cartItem.delete({ where: { id: itemId } })
    return this.getCart(userId, guestId)
  }

  /**
   * Merge guest cart into authenticated user cart after login.
   * Called by frontend after successful authentication.
   */
  async mergeCart(userId: string, guestId: string) {
    if (!guestId) return { merged: 0 }

    const guestCart = await this.prisma.cart.findUnique({
      where: { guestId },
      include: { items: true },
    })

    if (!guestCart || guestCart.items.length === 0) {
      return { merged: 0 }
    }

    // Find or create user cart
    const userCart = await this.findOrCreateCart(userId, undefined)

    let merged = 0

    await this.prisma.$transaction(async (tx) => {
      for (const guestItem of guestCart.items) {
        // Reassign item to user cart
        await tx.cartItem.update({
          where: { id: guestItem.id },
          data: { cartId: userCart.id },
        })
        merged++
      }

      // Transfer draft ownership for guest drafts
      await tx.draftDesign.updateMany({
        where: { guestId, userId: null },
        data: { userId },
      })

      // Delete guest cart (items already moved)
      await tx.cart.delete({ where: { id: guestCart.id } })
    })

    this.logger.log(`Merged ${merged} cart items from guest ${guestId} to user ${userId}`)
    return { merged }
  }

  /**
   * Internal: find or create a Cart for the requester.
   */
  async findOrCreateCart(userId?: string, guestId?: string) {
    if (!userId && !guestId) {
      throw new BadRequestException('Se requiere userId o guestId')
    }

    const where = userId ? { userId } : { guestId: guestId! }
    const existing = await this.prisma.cart.findUnique({
      where,
      include: { items: true },
    })

    if (existing) return existing

    const expiresAt =
      !userId && guestId
        ? new Date(Date.now() + GUEST_TTL_DAYS * 24 * 60 * 60 * 1000)
        : null

    return this.prisma.cart.create({
      data: {
        ...(userId ? { userId } : {}),
        ...(guestId && !userId ? { guestId } : {}),
        ...(expiresAt ? { expiresAt } : {}),
      },
      include: { items: true },
    })
  }

  private async authorizeCartItem(itemId: string, userId?: string, guestId?: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    })

    if (!item) throw new NotFoundException('Item no encontrado')

    const isOwner =
      (userId && item.cart.userId === userId) ||
      (guestId && item.cart.guestId === guestId)

    if (!isOwner) throw new ForbiddenException('No tenés acceso a este item')

    return item
  }
}
