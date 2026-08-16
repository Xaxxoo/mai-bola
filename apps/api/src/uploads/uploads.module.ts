import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { STORAGE_SERVICE, LocalStorageService } from './storage.service';

@Module({
  controllers: [UploadsController],
  providers: [
    { provide: STORAGE_SERVICE, useClass: LocalStorageService },
  ],
  exports: [STORAGE_SERVICE],
})
export class UploadsModule {}
