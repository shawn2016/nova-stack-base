import { Injectable } from '@nestjs/common';
import OSS from 'ali-oss';
import type { UploadResult } from '@nova/shared-types';
import type { UploadAliyunSettings } from '../upload-settings.types';

type AliyunRuntimeConfig = UploadAliyunSettings & { accessKeySecret: string };

@Injectable()
export class OssStorageService {
  private clientCache: { key: string; client: OSS } | null = null;

  private getClient(config: AliyunRuntimeConfig): OSS {
    const cacheKey = [
      config.region,
      config.bucket,
      config.accessKeyId,
      config.accessKeySecret,
    ].join(':');

    if (this.clientCache?.key === cacheKey) {
      return this.clientCache.client;
    }

    const client = new OSS({
      region: config.region,
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      bucket: config.bucket,
      timeout: 15000,
    });
    this.clientCache = { key: cacheKey, client };
    return client;
  }

  async upload(
    file: Express.Multer.File,
    key: string,
    config: AliyunRuntimeConfig,
  ): Promise<UploadResult> {
    await this.getClient(config).put(key, file.buffer);

    const baseUrl =
      config.publicBaseUrl && config.publicBaseUrl.length > 0
        ? config.publicBaseUrl.replace(/\/$/, '')
        : `https://${config.bucket}.${config.region}.aliyuncs.com`;

    return {
      url: `${baseUrl}/${key}`,
      key,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async delete(key: string, config: AliyunRuntimeConfig): Promise<void> {
    await this.getClient(config).delete(key);
  }
}
