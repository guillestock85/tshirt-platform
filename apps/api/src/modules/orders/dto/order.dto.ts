import {
  IsUUID,
  IsInt,
  IsOptional,
  IsString,
  IsEmail,
  Min,
  Max,
  ValidateNested,
  MinLength,
} from 'class-validator'
import { Type } from 'class-transformer'

export class ShippingAddressDto {
  @IsString()
  @MinLength(1)
  street: string

  @IsString()
  @MinLength(1)
  city: string

  @IsString()
  @MinLength(1)
  province: string

  @IsString()
  @MinLength(1)
  postalCode: string

  @IsOptional()
  @IsString()
  country?: string
}

export class ZoneUploadsDto {
  @IsOptional()
  @IsUUID()
  FRONT?: string

  @IsOptional()
  @IsUUID()
  BACK?: string

  @IsOptional()
  @IsUUID()
  TAG?: string
}

/**
 * @deprecated Use CreateOrderFromCartDto instead.
 * Kept for backwards compatibility during transition.
 */
export class CreateOrderDto {
  @IsUUID()
  productVariantId: string

  @ValidateNested()
  @Type(() => ZoneUploadsDto)
  uploads: ZoneUploadsDto

  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number

  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto

  @IsOptional()
  @IsString()
  notes?: string
}

/**
 * Production order creation from a server-side cart.
 * Server re-validates prices, variants, and upload ownership.
 * guestEmail is required for unauthenticated (guest) checkouts.
 */
export class CreateOrderFromCartDto {
  @IsUUID()
  cartId: string

  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto

  /** Required for guest orders so the customer can receive confirmation */
  @IsOptional()
  @IsEmail()
  guestEmail?: string

  @IsOptional()
  @IsString()
  notes?: string
}
