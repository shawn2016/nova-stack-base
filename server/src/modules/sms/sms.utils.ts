import { BadRequestException } from '@nestjs/common';
import type { SmsProviderType } from '@nova/shared-types';

export const SMS_PROVIDERS: SmsProviderType[] = ['mock', 'aliyun', 'tencent'];

export function assertSmsProvider(provider: string): asserts provider is SmsProviderType {
  if (!SMS_PROVIDERS.includes(provider as SmsProviderType)) {
    throw new BadRequestException('Invalid SMS provider');
  }
}

export function parseSmsConfig(config: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(config) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('invalid');
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new BadRequestException('Invalid SMS channel config JSON');
  }
}

export function renderSmsTemplate(content: string, params: Record<string, string>): string {
  return content.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (!(key in params)) {
      throw new BadRequestException(`Missing template param: ${key}`);
    }
    return params[key];
  });
}

export function assertPhone(phone: string): void {
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    throw new BadRequestException('Invalid phone number');
  }
}
