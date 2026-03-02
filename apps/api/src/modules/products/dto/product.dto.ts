import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator'

export enum TShirtSize {
  XS = 'XS',
  S = 'S',
  M = 'M',
  L = 'L',
  XL = 'XL',
  XXL = 'XXL',
}

export class CreateProductDto {
  @IsString()
  name: string

  @IsString()
  slug: string

  @IsString()
  @IsOptional()
  description?: string

  @IsNumber()
  @Min(0)
  basePrice: number
}

export class CreateVariantDto {
  @IsString()
  color: string

  @IsString()
  colorHex: string

  @IsEnum(TShirtSize)
  size: TShirtSize

  @IsNumber()
  @Min(0)
  @IsOptional()
  additionalPrice?: number
}