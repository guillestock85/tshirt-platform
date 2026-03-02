export interface PresignedUrlResult {
  url: string
  key: string
  expiresIn: number
}

export interface StorageObject {
  key: string
  bucket: string
  url: string
}

export abstract class StorageService {
  abstract generatePresignedUploadUrl(
    key: string,
    mimeType: string,
    maxSizeBytes: number,
  ): Promise<PresignedUrlResult>

  abstract generatePresignedReadUrl(
    key: string,
    expiresIn?: number,
  ): Promise<string>

  abstract deleteObject(key: string): Promise<void>

  abstract objectExists(key: string): Promise<boolean>
}