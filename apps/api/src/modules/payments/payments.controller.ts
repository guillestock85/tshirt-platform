import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt.guard'
import { GuestId } from '../../common/decorators/guest-id.decorator'
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator'

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('preference/:orderId')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  createPreference(
    @Request() req: { user?: AuthenticatedUser },
    @GuestId() guestId: string | undefined,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.createPreference(orderId, req.user?.id, guestId)
  }

  // MercadoPago sends POST with no auth – must be public
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() payload: Record<string, unknown>) {
    return this.paymentsService.handleWebhook(payload as any)
  }
}
