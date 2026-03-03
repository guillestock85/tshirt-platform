import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { DraftsService } from './drafts.service'
import { UpsertDraftDto, UpdateDraftDto } from './dto/draft.dto'
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt.guard'
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator'
import { GuestId } from '../../common/decorators/guest-id.decorator'

@Controller('drafts')
@UseGuards(OptionalJwtAuthGuard)
export class DraftsController {
  constructor(private readonly draftsService: DraftsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  upsertDraft(
    @Body() dto: UpsertDraftDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @GuestId() guestId: string | undefined,
  ) {
    return this.draftsService.upsertDraft(dto, user?.id, guestId)
  }

  @Get('active')
  getActiveDraft(
    @Query('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @GuestId() guestId: string | undefined,
  ) {
    return this.draftsService.getActiveDraft(productId, user?.id, guestId)
  }

  @Patch(':id')
  updateDraft(
    @Param('id') id: string,
    @Body() dto: UpdateDraftDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @GuestId() guestId: string | undefined,
  ) {
    return this.draftsService.updateDraft(id, dto, user?.id, guestId)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deleteDraft(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @GuestId() guestId: string | undefined,
  ) {
    return this.draftsService.deleteDraft(id, user?.id, guestId)
  }
}
