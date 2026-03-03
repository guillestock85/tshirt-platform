import {
  IsUUID,
  IsInt,
  IsOptional,
  IsObject,
  Min,
  Max,
} from 'class-validator'

export class UpsertDraftDto {
  @IsUUID()
  productId: string

  @IsUUID()
  variantId: string

  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number

  /**
   * Canvas layers per zone.
   * Shape: { FRONT?: Layer[], BACK?: Layer[], TAG?: Layer[] }
   * Stored as-is in the DB; validated by the client.
   */
  @IsObject()
  zonesData: Record<string, unknown>

  /**
   * Confirmed upload IDs per zone.
   * Shape: { FRONT?: string, BACK?: string, TAG?: string }
   */
  @IsObject()
  uploadIds: Record<string, string>
}

export class UpdateDraftDto {
  @IsOptional()
  @IsUUID()
  variantId?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number

  @IsOptional()
  @IsObject()
  zonesData?: Record<string, unknown>

  @IsOptional()
  @IsObject()
  uploadIds?: Record<string, string>
}
