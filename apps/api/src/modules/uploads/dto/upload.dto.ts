import {
  IsEnum,
  IsString,
  IsNumber,
  IsPositive,
  IsUUID,
  Max,
} from 'class-validator'

export enum AllowedMimeType {
  PNG = 'image/png',
  JPEG = 'image/jpeg',
  WEBP = 'image/webp',
}

export enum PrintZone {
  FRONT = 'FRONT',
  BACK = 'BACK',
  TAG = 'TAG',
}

export class RequestPresignedUrlDto {
  @IsEnum(AllowedMimeType)
  mimeType: AllowedMimeType

  @IsNumber()
  @IsPositive()
  @Max(10 * 1024 * 1024)
  sizeBytes: number

  @IsEnum(PrintZone)
  zone: PrintZone
}

export class ConfirmUploadDto {
  @IsString()
  key: string

  @IsString()
  originalFilename: string

  @IsEnum(AllowedMimeType)
  mimeType: AllowedMimeType

  @IsNumber()
  @IsPositive()
  sizeBytes: number

  @IsEnum(PrintZone)
  zone: PrintZone
}

export class GetUploadDto {
  @IsUUID()
  id: string
}