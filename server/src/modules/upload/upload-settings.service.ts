import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { UpdateUploadSettingsDto, UploadStorageProvider } from '@nova/shared-types';
import { In, Repository } from 'typeorm';
import { SysConfigEntity } from '../../database/entities';
import {
  SECRET_MASK,
  UPLOAD_CONFIG_GROUP,
  UPLOAD_CONFIG_KEYS,
  type UploadRuntimeConfig,
  type UploadSettingsResponse,
} from './upload-settings.types';

const CONFIG_META: Record<string, { name: string; defaultValue?: () => string }> = {
  [UPLOAD_CONFIG_KEYS.provider]: {
    name: '存储提供商',
    defaultValue: () => 'local',
  },
  [UPLOAD_CONFIG_KEYS.maxSize]: {
    name: '上传大小上限（字节）',
  },
  [UPLOAD_CONFIG_KEYS.localAppPublicUrl]: { name: '本地访问域名' },
  [UPLOAD_CONFIG_KEYS.localUploadsDir]: { name: '本地上传目录' },
  [UPLOAD_CONFIG_KEYS.aliyunRegion]: { name: '阿里云 Region' },
  [UPLOAD_CONFIG_KEYS.aliyunBucket]: { name: '阿里云 Bucket' },
  [UPLOAD_CONFIG_KEYS.aliyunAccessKeyId]: { name: '阿里云 AccessKeyId' },
  [UPLOAD_CONFIG_KEYS.aliyunAccessKeySecret]: { name: '阿里云 AccessKeySecret' },
  [UPLOAD_CONFIG_KEYS.aliyunPublicBaseUrl]: { name: '阿里云 CDN 域名' },
  [UPLOAD_CONFIG_KEYS.tencentRegion]: { name: '腾讯云 Region' },
  [UPLOAD_CONFIG_KEYS.tencentBucket]: { name: '腾讯云 Bucket' },
  [UPLOAD_CONFIG_KEYS.tencentSecretId]: { name: '腾讯云 SecretId' },
  [UPLOAD_CONFIG_KEYS.tencentSecretKey]: { name: '腾讯云 SecretKey' },
  [UPLOAD_CONFIG_KEYS.tencentPublicBaseUrl]: { name: '腾讯云 CDN 域名' },
};

@Injectable()
export class UploadSettingsService implements OnModuleInit {
  async onModuleInit() {
    if (this.configService.get<string>('app.nodeEnv') !== 'production') return;
    const runtime = await this.getRuntimeConfig();
    this.assertProductionStorage(runtime);
  }

  private assertProductionStorage(runtime: UploadRuntimeConfig): void {
    if (runtime.provider === 'local')
      throw new BadRequestException('Production uploads require object storage');
    const values = runtime.provider === 'aliyun_oss' ? runtime.aliyun : runtime.tencent;
    const secret =
      runtime.provider === 'aliyun_oss'
        ? runtime.aliyun.accessKeySecret
        : runtime.tencent.secretKey;
    const identity =
      runtime.provider === 'aliyun_oss' ? runtime.aliyun.accessKeyId : runtime.tencent.secretId;
    if (
      ![values.region, values.bucket, secret, identity].every((value) => value.trim().length > 0)
    ) {
      throw new BadRequestException('Production object storage configuration is incomplete');
    }
  }

  constructor(
    @InjectRepository(SysConfigEntity)
    private readonly configRepo: Repository<SysConfigEntity>,
    private readonly configService: ConfigService,
  ) {}

  async getSettings(): Promise<UploadSettingsResponse> {
    return this.toSettings(await this.getRuntimeConfig());
  }

  private toSettings(runtime: UploadRuntimeConfig): UploadSettingsResponse {
    return {
      provider: runtime.provider,
      maxSize: runtime.maxSize,
      local: runtime.local,
      aliyun: {
        ...runtime.aliyun,
        accessKeySecret: runtime.aliyun.accessKeySecret ? SECRET_MASK : '',
      },
      tencent: {
        ...runtime.tencent,
        secretKey: runtime.tencent.secretKey ? SECRET_MASK : '',
      },
    };
  }

  async updateSettings(dto: UpdateUploadSettingsDto): Promise<UploadSettingsResponse> {
    if (this.configService.get<string>('app.nodeEnv') === 'production') {
      const pinned = this.configService.get<string>('UPLOAD_STORAGE_PROVIDER');
      if (pinned && dto.provider && dto.provider !== pinned) {
        throw new BadRequestException('Upload provider is managed by the environment');
      }
      if (dto.provider === 'local')
        throw new BadRequestException('Production uploads require object storage');
      return this.configRepo.manager.transaction(async (manager) => {
        const repo = manager.getRepository(SysConfigEntity);
        const current = await this.getRuntimeConfig(repo);
        const candidate = {
          ...current,
          provider: dto.provider ?? current.provider,
          aliyun: {
            ...current.aliyun,
            ...dto.aliyun,
            accessKeySecret:
              !dto.aliyun?.accessKeySecret || dto.aliyun.accessKeySecret === SECRET_MASK
                ? current.aliyun.accessKeySecret
                : dto.aliyun.accessKeySecret,
          },
          tencent: {
            ...current.tencent,
            ...dto.tencent,
            secretKey:
              !dto.tencent?.secretKey || dto.tencent.secretKey === SECRET_MASK
                ? current.tencent.secretKey
                : dto.tencent.secretKey,
          },
        };
        this.assertProductionStorage(candidate);
        await this.persistSettings(dto, repo);
        return this.toSettings(await this.getRuntimeConfig(repo));
      });
    }
    await this.persistSettings(dto, this.configRepo);
    return this.getSettings();
  }

  private async persistSettings(
    dto: UpdateUploadSettingsDto,
    repo: Repository<SysConfigEntity>,
  ): Promise<void> {
    if (dto.provider !== undefined) {
      await this.upsert(repo, UPLOAD_CONFIG_KEYS.provider, dto.provider);
    }
    if (dto.maxSize !== undefined) {
      await this.upsert(repo, UPLOAD_CONFIG_KEYS.maxSize, String(dto.maxSize));
    }
    if (dto.local) {
      if (dto.local.appPublicUrl !== undefined) {
        await this.upsert(repo, UPLOAD_CONFIG_KEYS.localAppPublicUrl, dto.local.appPublicUrl);
      }
      if (dto.local.uploadsDir !== undefined) {
        await this.upsert(repo, UPLOAD_CONFIG_KEYS.localUploadsDir, dto.local.uploadsDir);
      }
    }
    if (dto.aliyun) {
      await this.patchProviderFields(repo, dto.aliyun, {
        region: UPLOAD_CONFIG_KEYS.aliyunRegion,
        bucket: UPLOAD_CONFIG_KEYS.aliyunBucket,
        accessKeyId: UPLOAD_CONFIG_KEYS.aliyunAccessKeyId,
        accessKeySecret: UPLOAD_CONFIG_KEYS.aliyunAccessKeySecret,
        publicBaseUrl: UPLOAD_CONFIG_KEYS.aliyunPublicBaseUrl,
      });
    }
    if (dto.tencent) {
      await this.patchProviderFields(repo, dto.tencent, {
        region: UPLOAD_CONFIG_KEYS.tencentRegion,
        bucket: UPLOAD_CONFIG_KEYS.tencentBucket,
        secretId: UPLOAD_CONFIG_KEYS.tencentSecretId,
        secretKey: UPLOAD_CONFIG_KEYS.tencentSecretKey,
        publicBaseUrl: UPLOAD_CONFIG_KEYS.tencentPublicBaseUrl,
      });
    }
  }

  async getRuntimeConfig(repo = this.configRepo): Promise<UploadRuntimeConfig> {
    const keys = Object.values(UPLOAD_CONFIG_KEYS);
    const configs = await repo.find({
      where: { configKey: In(keys) },
    });
    const map = new Map(configs.map((item) => [item.configKey, item.configValue]));

    const envDefaults = this.envDefaults();
    const provider = this.parseProvider(
      this.configService.get<string>('UPLOAD_STORAGE_PROVIDER') ||
        map.get(UPLOAD_CONFIG_KEYS.provider) ||
        envDefaults.provider,
    );
    if (this.configService.get<string>('app.nodeEnv') === 'production' && provider === 'local') {
      throw new BadRequestException('Production uploads require object storage');
    }

    return {
      provider,
      maxSize: this.parseNumber(map.get(UPLOAD_CONFIG_KEYS.maxSize), envDefaults.maxSize),
      local: {
        appPublicUrl:
          map.get(UPLOAD_CONFIG_KEYS.localAppPublicUrl) ?? envDefaults.local.appPublicUrl,
        uploadsDir: map.get(UPLOAD_CONFIG_KEYS.localUploadsDir) ?? envDefaults.local.uploadsDir,
      },
      aliyun: {
        region: map.get(UPLOAD_CONFIG_KEYS.aliyunRegion) ?? envDefaults.aliyun.region,
        bucket: map.get(UPLOAD_CONFIG_KEYS.aliyunBucket) ?? envDefaults.aliyun.bucket,
        accessKeyId:
          map.get(UPLOAD_CONFIG_KEYS.aliyunAccessKeyId) ?? envDefaults.aliyun.accessKeyId,
        accessKeySecret:
          map.get(UPLOAD_CONFIG_KEYS.aliyunAccessKeySecret) ?? envDefaults.aliyun.accessKeySecret,
        publicBaseUrl:
          map.get(UPLOAD_CONFIG_KEYS.aliyunPublicBaseUrl) ?? envDefaults.aliyun.publicBaseUrl,
      },
      tencent: {
        region: map.get(UPLOAD_CONFIG_KEYS.tencentRegion) ?? envDefaults.tencent.region,
        bucket: map.get(UPLOAD_CONFIG_KEYS.tencentBucket) ?? envDefaults.tencent.bucket,
        secretId: map.get(UPLOAD_CONFIG_KEYS.tencentSecretId) ?? envDefaults.tencent.secretId,
        secretKey: map.get(UPLOAD_CONFIG_KEYS.tencentSecretKey) ?? envDefaults.tencent.secretKey,
        publicBaseUrl:
          map.get(UPLOAD_CONFIG_KEYS.tencentPublicBaseUrl) ?? envDefaults.tencent.publicBaseUrl,
      },
    };
  }

  private envDefaults(): UploadRuntimeConfig {
    return {
      provider: 'local',
      maxSize: this.configService.get<number>('upload.uploadMaxSize') ?? 5 * 1024 * 1024,
      local: {
        appPublicUrl:
          this.configService.get<string>('upload.appPublicUrl') ?? 'http://localhost:3000',
        uploadsDir:
          this.configService.get<string>('upload.uploadsDir') ?? `${process.cwd()}/uploads`,
      },
      aliyun: {
        region: this.configService.get<string>('upload.ossRegion') ?? 'oss-cn-hangzhou',
        bucket: this.configService.get<string>('upload.ossBucket') ?? '',
        accessKeyId: this.configService.get<string>('upload.ossAccessKeyId') ?? '',
        accessKeySecret: this.configService.get<string>('upload.ossAccessKeySecret') ?? '',
        publicBaseUrl: this.configService.get<string>('upload.ossPublicBaseUrl') ?? '',
      },
      tencent: {
        region: this.configService.get<string>('COS_REGION') ?? 'ap-guangzhou',
        bucket: this.configService.get<string>('COS_BUCKET') ?? '',
        secretId: this.configService.get<string>('COS_SECRET_ID') ?? '',
        secretKey: this.configService.get<string>('COS_SECRET_KEY') ?? '',
        publicBaseUrl: this.configService.get<string>('COS_PUBLIC_BASE_URL') ?? '',
      },
    };
  }

  private parseProvider(value: string): UploadStorageProvider {
    if (value === 'aliyun_oss' || value === 'tencent_cos') {
      return value;
    }
    return 'local';
  }

  private parseNumber(value: string | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private async patchProviderFields(
    repo: Repository<SysConfigEntity>,
    dto: Record<string, string | undefined>,
    keyMap: Record<string, string>,
  ): Promise<void> {
    for (const field of Object.keys(keyMap)) {
      const value = dto[field];
      if (value === undefined) {
        continue;
      }
      const configKey = keyMap[field];
      if (
        (field === 'accessKeySecret' || field === 'secretKey') &&
        (!value || value === SECRET_MASK)
      ) {
        continue;
      }
      await this.upsert(repo, configKey, value);
    }
  }

  private async upsert(
    repo: Repository<SysConfigEntity>,
    configKey: string,
    configValue: string,
  ): Promise<void> {
    const meta = CONFIG_META[configKey];
    let config = await repo.findOne({ where: { configKey } });
    if (!config) {
      config = repo.create({
        configKey,
        configName: meta?.name ?? configKey,
        configValue,
        configGroup: UPLOAD_CONFIG_GROUP,
        remark: null,
      });
    } else {
      config.configName = meta?.name ?? config.configName;
      config.configValue = configValue;
      config.configGroup = UPLOAD_CONFIG_GROUP;
    }
    await repo.save(config);
  }
}
