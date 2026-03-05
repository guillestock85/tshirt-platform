import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { UploadsService } from './uploads.service'
import { RequestPresignedUrlDto, ConfirmUploadDto } from './dto/upload.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard'
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator'

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * Generate a pre-signed S3 upload URL.
   * Accepts both authenticated users (JWT) and guests (X-Guest-Id header).
   */
  @Post('presign')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  requestPresignedUrl(
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers('x-guest-id') guestId: string,
    @Body() dto: RequestPresignedUrlDto,
  ) {
    return this.uploadsService.requestPresignedUrl(user?.id ?? null, guestId ?? null, dto)
  }

  /**
   * Confirm that a file was successfully uploaded to S3.
   * Accepts both authenticated users (JWT) and guests (X-Guest-Id header).
   */
  @Post('confirm')
  @UseGuards(OptionalJwtAuthGuard)
  confirmUpload(
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers('x-guest-id') guestId: string,
    @Body() dto: ConfirmUploadDto,
  ) {
    return this.uploadsService.confirmUpload(user?.id ?? null, guestId ?? null, dto)
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getUserUploads(@CurrentUser() user: AuthenticatedUser) {
    return this.uploadsService.getUserUploads(user.id)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.uploadsService.getUpload(user.id, id)
  }
}
