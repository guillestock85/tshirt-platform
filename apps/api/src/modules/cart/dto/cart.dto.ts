import { IsUUID, IsInt, IsString, Min, Max } from 'class-validator'

export class AddToCartDto {
  @IsUUID()
  draftDesignId: string
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number
}

export class MergeCartDto {
  @IsString()
  guestId: string
}
