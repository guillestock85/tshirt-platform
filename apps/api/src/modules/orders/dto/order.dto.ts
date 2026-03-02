import {
  IsUUID,
  IsInt,
  IsOptional,
  IsString,
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
