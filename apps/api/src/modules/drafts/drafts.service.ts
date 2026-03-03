import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { DraftStatus } from '@prisma/client'
import { UpsertDraftDto, UpdateDraftDto } from './dto/draft.dto'

const GUEST_TTL_DAYS = 30

@Injectable()
export class DraftsService {
  private readonly logger = new Logger(DraftsService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert the active draft for (userId OR guestId) + productId.
   * Creates a new draft on first save; updates existing on subsequent saves.
   */
  async upsertDraft(
    dto: UpsertDraftDto,
    userId?: string,
    guestId?: string,
  ) {
    const where = userId
      ? { userId_productId: { userId, productId: dto.productId } as never }
      : undefined

    // Find existing ACTIVE draft
    const existing = await this.prisma.draftDesign.findFirst({
      where: {
        productId: dto.productId,
        status: DraftStatus.ACTIVE,
        ...(userId ? { userId } : { guestId }),
      },
    })

    const expiresAt =
      !userId && guestId
        ? new Date(Date.now() + GUEST_TTL_DAYS * 24 * 60 * 60 * 1000)
        : null

    if (existing) {
      const updated = await this.prisma.draftDesign.update({
        where: { id: existing.id },
        data: {
          variantId: dto.variantId,
          quantity: dto.quantity,
          zonesData: dto.zonesData as never,
          uploadIds: dto.uploadIds as never,
          ...(expiresAt ? { expiresAt } : {}),
        },
      })
      return { id: updated.id, expiresAt: updated.expiresAt }
    }

    const created = await this.prisma.draftDesign.create({
      data: {
        productId: dto.productId,
        variantId: dto.variantId,
        quantity: dto.quantity,
        zonesData: dto.zonesData as never,
        uploadIds: dto.uploadIds as never,
        status: DraftStatus.ACTIVE,
        expiresAt,
        ...(userId ? { userId } : {}),
        ...(guestId && !userId ? { guestId } : {}),
      },
    })

    this.logger.log(`Draft created: ${created.id}`)
    return { id: created.id, expiresAt: created.expiresAt }
  }

  /**
   * Get the active draft for a product, or null if none/expired.
   */
  async getActiveDraft(productId: string, userId?: string, guestId?: string) {
    const draft = await this.prisma.draftDesign.findFirst({
      where: {
        productId,
        status: DraftStatus.ACTIVE,
        ...(userId ? { userId } : { guestId }),
      },
      include: {
        variant: { include: { product: true } },
      },
    })

    if (!draft) return null

    // Check TTL
    if (draft.expiresAt && draft.expiresAt < new Date()) {
      await this.prisma.draftDesign.update({
        where: { id: draft.id },
        data: { status: DraftStatus.EXPIRED },
      })
      return null
    }

    return draft
  }

  /**
   * Patch an existing draft (partial update).
   */
  async updateDraft(
    id: string,
    dto: UpdateDraftDto,
    userId?: string,
    guestId?: string,
  ) {
    const draft = await this.findAndAuthorize(id, userId, guestId)

    return this.prisma.draftDesign.update({
      where: { id: draft.id },
      data: {
        ...(dto.variantId !== undefined ? { variantId: dto.variantId } : {}),
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
        ...(dto.zonesData !== undefined ? { zonesData: dto.zonesData as never } : {}),
        ...(dto.uploadIds !== undefined ? { uploadIds: dto.uploadIds as never } : {}),
      },
    })
  }

  /**
   * Mark a draft as EXPIRED (soft delete / abandon).
   */
  async deleteDraft(id: string, userId?: string, guestId?: string) {
    const draft = await this.findAndAuthorize(id, userId, guestId)

    await this.prisma.draftDesign.update({
      where: { id: draft.id },
      data: { status: DraftStatus.EXPIRED },
    })

    return { success: true }
  }

  private async findAndAuthorize(id: string, userId?: string, guestId?: string) {
    const draft = await this.prisma.draftDesign.findUnique({ where: { id } })
    if (!draft) throw new NotFoundException('Borrador no encontrado')

    const isOwner =
      (userId && draft.userId === userId) ||
      (guestId && draft.guestId === guestId)

    if (!isOwner) throw new ForbiddenException('No tenés acceso a este borrador')

    // Only ACTIVE drafts can be updated. CONVERTED / EXPIRED drafts are read-only
    // so the frontend can detect the stale ID and fall back to creating a new draft.
    if (draft.status !== DraftStatus.ACTIVE) {
      throw new BadRequestException('El borrador ya fue convertido o expiró')
    }

    return draft
  }
}
