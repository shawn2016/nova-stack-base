import { Injectable } from '@nestjs/common';
import COS from 'cos-nodejs-sdk-v5';
import type { UploadResult } from '@nova/shared-types';
import type { UploadTencentSettings } from '../upload-settings.types';

type TencentRuntimeConfig = UploadTencentSettings & { secretKey: string };

@Injectable()
export class CosStorageService {
  private clientCache: { key: string; client: COS } | null = null;

  private getClient(config: TencentRuntimeConfig): COS {
    const cacheKey = [config.region, config.bucket, config.secretId, config.secretKey].join(':');

    if (this.clientCache?.key === cacheKey) {
      return this.clientCache.client;
    }

    const client = new COS({
      SecretId: config.secretId,
      SecretKey: config.secretKey,
      Timeout: 15000,
    });
    this.clientCache = { key: cacheKey, client };
    return client;
  }

  async upload(
    file: Express.Multer.File,
    key: string,
    config: TencentRuntimeConfig,
  ): Promise<UploadResult> {
    const client = this.getClient(config);

    await new Promise<void>((resolve, reject) => {
      client.putObject(
        {
          Bucket: config.bucket,
          Region: config.region,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        },
        (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        },
      );
    });

    const baseUrl =
      config.publicBaseUrl && config.publicBaseUrl.length > 0
        ? config.publicBaseUrl.replace(/\/$/, '')
        : `https://${config.bucket}.cos.${config.region}.myqcloud.com`;

    return {
      url: `${baseUrl}/${key}`,
      key,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async delete(key: string, config: TencentRuntimeConfig): Promise<void> {
    const client = this.getClient(config);

    await new Promise<void>((resolve, reject) => {
      client.deleteObject(
        {
          Bucket: config.bucket,
          Region: config.region,
          Key: key,
        },
        (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        },
      );
    });
  }
}
