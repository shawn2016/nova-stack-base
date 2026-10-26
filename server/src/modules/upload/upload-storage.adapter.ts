import { BadRequestException, Injectable } from '@nestjs/common';
import type { UploadResult, UploadStorageProvider } from '@nova/shared-types';
import type { UploadAliyunSettings, UploadTencentSettings } from './upload-settings.types';
import { CosStorageService } from './storage/cos-storage.service';
import { LocalStorageService } from './storage/local-storage.service';
import { OssStorageService } from './storage/oss-storage.service';
import { UploadSettingsService } from './upload-settings.service';

@Injectable()
export class UploadStorageAdapter {
  constructor(
    private readonly settingsService: UploadSettingsService,
    private readonly localStorageService: LocalStorageService,
    private readonly ossStorageService: OssStorageService,
    private readonly cosStorageService: CosStorageService,
  ) {}

  async upload(
    file: Express.Multer.File,
    key: string,
  ): Promise<{ result: UploadResult; storage: UploadStorageProvider }> {
    const runtime = await this.settingsService.getRuntimeConfig();

    if (runtime.provider === 'aliyun_oss') {
      this.assertAliyun(runtime.aliyun);
      const result = await this.ossStorageService.upload(file, key, runtime.aliyun);
      return { result, storage: 'aliyun_oss' };
    }

    if (runtime.provider === 'tencent_cos') {
      this.assertTencent(runtime.tencent);
      const result = await this.cosStorageService.upload(file, key, runtime.tencent);
      return { result, storage: 'tencent_cos' };
    }

    const result = await this.localStorageService.upload(file, key, runtime.local);
    return { result, storage: 'local' };
  }

  async delete(storage: UploadStorageProvider | 'oss', objectKey: string): Promise<void> {
    const runtime = await this.settingsService.getRuntimeConfig();
    const normalized = storage === 'oss' ? 'aliyun_oss' : storage;

    if (normalized === 'aliyun_oss') {
      await this.ossStorageService.delete(objectKey, runtime.aliyun);
      return;
    }
    if (normalized === 'tencent_cos') {
      await this.cosStorageService.delete(objectKey, runtime.tencent);
      return;
    }
    await this.localStorageService.delete(objectKey, runtime.local);
  }

  private assertAliyun(config: UploadAliyunSettings & { accessKeySecret: string }): void {
    if (!config.region || !config.bucket || !config.accessKeyId || !config.accessKeySecret) {
      throw new BadRequestException('请先在文件管理-存储配置中完善阿里云 OSS 参数');
    }
  }

  private assertTencent(config: UploadTencentSettings & { secretKey: string }): void {
    if (!config.region || !config.bucket || !config.secretId || !config.secretKey) {
      throw new BadRequestException('请先在文件管理-存储配置中完善腾讯云 COS 参数');
    }
  }
}
