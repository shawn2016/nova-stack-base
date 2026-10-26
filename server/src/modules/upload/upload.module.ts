import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SysConfigEntity, SysFileEntity, SysUserEntity } from '../../database/entities';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { CosStorageService } from './storage/cos-storage.service';
import { LocalStorageService } from './storage/local-storage.service';
import { OssStorageService } from './storage/oss-storage.service';
import { UploadSettingsService } from './upload-settings.service';
import { UploadStorageAdapter } from './upload-storage.adapter';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([SysFileEntity, SysUserEntity, SysConfigEntity]),
  ],
  controllers: [UploadController],
  providers: [
    UploadService,
    UploadSettingsService,
    UploadStorageAdapter,
    LocalStorageService,
    OssStorageService,
    CosStorageService,
  ],
})
export class UploadModule {}
