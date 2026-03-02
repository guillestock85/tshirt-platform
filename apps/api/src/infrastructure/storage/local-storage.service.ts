import { Injectable, Logger } from '@nestjs/common'
import { StorageService, PresignedUrlResult } from './storage.interface'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

@Injectable()
export class LocalStorageService extends StorageService {
  private readonly logger = new Logger(LocalStorageService.name)
  private readonly uploadDir = path.join(process.cwd(), 'uploads')

  constructor() {
    super()
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true })
    }
  }

  async generatePresignedUploadUrl(
    key: string,
    mimeType: string,
    _maxSizeBytes: number,
  ): Promise<PresignedUrlResult> {
    const token = crypto.randomBytes(32).toString('hex')
    const url = `http://localhost:3001/api/v1/uploads/local/${encodeURIComponent(key)}?token=${token}`
    this.logger.debug(`Generated local upload URL for key: ${key}`)
    return { url, key, expiresIn: 900 }
  }

  async generatePresignedReadUrl(key: string, _expiresIn = 300): Promise<string> {
    return `http://localhost:3001/api/v1/uploads/local/${encodeURIComponent(key)}`
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }

  async objectExists(key: string): Promise<boolean> {
    const filePath = path.join(this.uploadDir, key)
    return fs.existsSync(filePath)
  }
}