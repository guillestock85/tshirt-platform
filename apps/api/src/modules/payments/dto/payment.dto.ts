import { IsString, IsOptional } from 'class-validator'

export class MercadoPagoWebhookDto {
  @IsOptional()
  id?: number

  @IsString()
  type: string

  @IsOptional()
  @IsString()
  action?: string

  @IsOptional()
  data?: { id: string }
}
