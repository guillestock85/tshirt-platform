import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common'
import { OrdersService } from './orders.service'
import { CreateOrderDto, CreateOrderFromCartDto } from './dto/order.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt.guard'
import { GuestId } from '../../common/decorators/guest-id.decorator'
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../common/decorators/current-user.decorator'

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Create order from server-side cart (production endpoint).
   * Supports both authenticated users and guests.
   * Re-validates prices, variants, and upload ownership server-side.
   * Order is auto-confirmed so guests can go straight to payment.
   */
  @Post('from-cart')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  createOrderFromCart(
    @Request() req: { user?: AuthenticatedUser },
    @GuestId() guestId: string | undefined,
    @Body() dto: CreateOrderFromCartDto,
  ) {
    return this.ordersService.createOrderFromCart(dto, req.user?.id, guestId)
  }

  /**
   * @deprecated Use POST /orders/from-cart instead.
   * Legacy single-item order creation kept for backwards compatibility.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(user.id, dto)
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getUserOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.getUserOrders(user.id)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getOrder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.getOrderById(user.id, id)
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  confirmOrder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.confirmOrder(user.id, id)
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  cancelOrder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.cancelOrder(user.id, id)
  }
}
