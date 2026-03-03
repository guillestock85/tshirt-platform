import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { CartService } from './cart.service'
import { AddToCartDto, UpdateCartItemDto, MergeCartDto } from './dto/cart.dto'
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator'
import { GuestId } from '../../common/decorators/guest-id.decorator'

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  getCart(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @GuestId() guestId: string | undefined,
  ) {
    return this.cartService.getCart(user?.id, guestId)
  }

  @Post('items')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  addToCart(
    @Body() dto: AddToCartDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @GuestId() guestId: string | undefined,
  ) {
    return this.cartService.addToCart(dto, user?.id, guestId)
  }

  @Patch('items/:id')
  @UseGuards(OptionalJwtAuthGuard)
  updateCartItem(
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @GuestId() guestId: string | undefined,
  ) {
    return this.cartService.updateCartItem(id, dto, user?.id, guestId)
  }

  @Delete('items/:id')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  removeCartItem(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @GuestId() guestId: string | undefined,
  ) {
    return this.cartService.removeCartItem(id, user?.id, guestId)
  }

  @Post('merge')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  mergeCart(
    @Body() dto: MergeCartDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cartService.mergeCart(user.id, dto.guestId)
  }
}
