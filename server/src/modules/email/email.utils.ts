import { BadRequestException } from '@nestjs/common';
import type { EmailProviderType } from '@nova/shared-types';

export const EMAIL_PROVIDERS: EmailProviderType[] = ['mock', 'smtp'];

export function assertEmailProvider(provider: string): asserts provider is EmailProviderType {
  if (!EMAIL_PROVIDERS.includes(provider as EmailProviderType)) {
    throw new BadRequestException('Invalid email provider');
  }
}

export function parseEmailConfig(config: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(config) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('invalid');
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new BadRequestException('Invalid email channel config JSON');
  }
}

export function renderEmailTemplate(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (!(key in params)) {
      throw new BadRequestException(`Missing template param: ${key}`);
    }
    return params[key];
  });
}

export function assertEmail(email: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BadRequestException('Invalid email address');
  }
}
