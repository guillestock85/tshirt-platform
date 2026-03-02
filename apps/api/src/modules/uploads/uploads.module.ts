import { Module } from '@nestjs/common'
import { UploadsController } from './uploads.controller'
import { UploadsService } from './uploads.service'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { LocalStorageService } from '../../infrastructure/storage/local-storage.service'
import { StorageService } from '../../infrastructure/storage/storage.interface'

@Module({
  controllers: [UploadsController],
  providers: [
    UploadsService,
    PrismaService,
    {
      provide: StorageService,
      useClass: LocalStorageService,
    },
  ],
  exports: [UploadsService, StorageService],
})
export class UploadsModule {}