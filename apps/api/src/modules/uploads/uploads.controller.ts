import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { UploadsService } from './uploads.service'
import { RequestPresignedUrlDto, ConfirmUploadDto } from './dto/upload.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator'

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('presign')
  @HttpCode(HttpStatus.OK)
  requestPresignedUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestPresignedUrlDto,
  ) {
    return this.uploadsService.requestPresignedUrl(user.id, dto)
  }

  @Post('confirm')
  confirmUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmUploadDto,
  ) {
    return this.uploadsService.confirmUpload(user.id, dto)
  }

  @Get()
  getUserUploads(@CurrentUser() user: AuthenticatedUser) {
    return this.uploadsService.getUserUploads(user.id)
  }

  @Get(':id')
  getUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.uploadsService.getUpload(user.id, id)
  }
}