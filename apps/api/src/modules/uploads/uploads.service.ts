import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { StorageService } from '../../infrastructure/storage/storage.interface'
import { RequestPresignedUrlDto, ConfirmUploadDto } from './dto/upload.dto'
import * as crypto from 'crypto'

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async requestPresignedUrl(
    userId: string | null,
    guestId: string | null,
    dto: RequestPresignedUrlDto,
  ) {
    if (!userId && !guestId) {
      throw new BadRequestException('Se requiere autenticación o ID de invitado')
    }

    if (!ALLOWED_MIME_TYPES.includes(dto.mimeType)) {
      throw new BadRequestException('Tipo de archivo no permitido')
    }

    if (dto.sizeBytes > MAX_FILE_SIZE) {
      throw new BadRequestException('El archivo supera el tamaño máximo de 10MB')
    }

    // Separate S3 paths for users vs guests
    const ownerSegment = userId ? `user/${userId}` : `guest/${guestId}`
    const key = `uploads/${ownerSegment}/${dto.zone.toLowerCase()}/${crypto.randomUUID()}`

    const { url, expiresIn } = await this.storage.generatePresignedUploadUrl(
      key,
      dto.mimeType,
      dto.sizeBytes,
    )

    const owner = userId ? `user ${userId}` : `guest ${guestId}`
    this.logger.log(`Presigned URL generated for ${owner}, zone ${dto.zone}`)

    return { url, key, expiresIn }
  }

  async confirmUpload(
    userId: string | null,
    guestId: string | null,
    dto: ConfirmUploadDto,
  ) {
    if (!userId && !guestId) {
      throw new BadRequestException('Se requiere autenticación o ID de invitado')
    }

    if (!ALLOWED_MIME_TYPES.includes(dto.mimeType)) {
      throw new BadRequestException('Tipo de archivo no permitido')
    }

    if (dto.sizeBytes > MAX_FILE_SIZE) {
      throw new BadRequestException('Archivo demasiado grande')
    }

    const exists = await this.storage.objectExists(dto.key)
    if (!exists) {
      throw new BadRequestException('El archivo no existe en el storage')
    }

    const upload = await this.prisma.upload.create({
      data: {
        userId,
        guestId,
        s3Key: dto.key,
        s3Bucket: process.env.STORAGE_BUCKET || 'local',
        originalFilename: dto.originalFilename,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        zone: dto.zone as any,
        status: 'VALIDATED',
        validatedAt: new Date(),
      },
    })

    const owner = userId ? `user ${userId}` : `guest ${guestId}`
    this.logger.log(`Upload confirmed: ${upload.id} for ${owner}`)
    return upload
  }

  async getUpload(userId: string, uploadId: string) {
    const upload = await this.prisma.upload.findUnique({
      where: { id: uploadId },
    })

    if (!upload) {
      throw new NotFoundException('Upload no encontrado')
    }

    if (upload.userId !== userId) {
      throw new ForbiddenException('No tenés acceso a este archivo')
    }

    const url = await this.storage.generatePresignedReadUrl(upload.s3Key)

    return { ...upload, url }
  }

  async getUserUploads(userId: string) {
    const uploads = await this.prisma.upload.findMany({
      where: { userId, status: 'VALIDATED' },
      orderBy: { createdAt: 'desc' },
    })

    const uploadsWithUrls = await Promise.all(
      uploads.map(async (upload) => ({
        ...upload,
        url: await this.storage.generatePresignedReadUrl(upload.s3Key),
      })),
    )

    return uploadsWithUrls
  }
}
