import { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import { SysConfigEntity } from '../../src/database/entities';
import { UploadSettingsService } from '../../src/modules/upload/upload-settings.service';

describe('production object storage guard', () => {
  const make = (provider: string, upload = {}) => new UploadSettingsService({ find: jest.fn(async () => []) } as unknown as Repository<SysConfigEntity>, new ConfigService({ app: { nodeEnv: 'production' }, UPLOAD_STORAGE_PROVIDER: provider, upload }));
  it('refuses local upload configuration before startup or mutation', async () => {
    const service = make('local');
    await expect(service.onModuleInit()).rejects.toThrow('object storage');
    await expect(service.updateSettings({ provider: 'local' })).rejects.toThrow('object storage');
  });
  it('refuses missing production credentials', async () => {
    await expect(make('aliyun_oss').onModuleInit()).rejects.toThrow('incomplete');
  });
  it('validates a configured provider without making a cloud request', async () => {
    await expect(make('aliyun_oss', { ossRegion: 'oss-cn-hangzhou', ossBucket: 'test-bucket', ossAccessKeyId: 'fixture-id', ossAccessKeySecret: 'fixture-secret' }).onModuleInit()).resolves.toBeUndefined();
  });
});

it('rejects an incomplete production provider switch before any persistence', async () => {
  const save = jest.fn();
  const repo = { find: jest.fn(async () => []), findOne: jest.fn(async () => null), create: jest.fn(value => value), save };
  const config = new ConfigService({ app: { nodeEnv: 'production' }, UPLOAD_STORAGE_PROVIDER: 'aliyun_oss', upload: { ossBucket: 'bucket', ossAccessKeyId: 'id', ossAccessKeySecret: 'secret' } });
  const service = new UploadSettingsService(repo as unknown as Repository<SysConfigEntity>, config);
  await expect(service.updateSettings({ provider: 'tencent_cos' })).rejects.toThrow('managed by the environment');
  expect(save).not.toHaveBeenCalled();
});

it('validates merged credentials inside the production transaction before writing', async () => {
  const save = jest.fn();
  const repo = { find: jest.fn(async () => [{ configKey: 'upload.storage.provider', configValue: 'aliyun_oss' }]), save };
  const transaction = jest.fn(async (fn: (manager: { getRepository: () => typeof repo }) => Promise<unknown>) => fn({ getRepository: () => repo }));
  const service = new UploadSettingsService({ ...repo, manager: { transaction } } as unknown as Repository<SysConfigEntity>, new ConfigService({ app: { nodeEnv: 'production' }, upload: { ossBucket: 'bucket', ossAccessKeyId: 'id', ossAccessKeySecret: 'secret' } }));
  await expect(service.updateSettings({ provider: 'tencent_cos' })).rejects.toThrow('incomplete');
  expect(transaction).toHaveBeenCalledTimes(1); expect(save).not.toHaveBeenCalled();
  await expect(service.updateSettings({ aliyun: { bucket: '' } })).rejects.toThrow('incomplete');
  expect(save).not.toHaveBeenCalled();
});
