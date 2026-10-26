export type SmsProviderType = 'mock' | 'aliyun' | 'tencent';

export type SmsStatus = 0 | 1;

export interface SmsChannelListItem {
  id: string;
  name: string;
  provider: SmsProviderType;
  config: string;
  status: SmsStatus;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SmsChannelDetail = SmsChannelListItem;

export interface CreateSmsChannelDto {
  name: string;
  provider: SmsProviderType;
  config: string;
  status?: SmsStatus;
  remark?: string | null;
}

export interface UpdateSmsChannelDto {
  name?: string;
  provider?: SmsProviderType;
  config?: string;
  status?: SmsStatus;
  remark?: string | null;
}

export interface SmsTemplateListItem {
  id: string;
  code: string;
  name: string;
  content: string;
  channelId: string;
  status: SmsStatus;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SmsTemplateDetail = SmsTemplateListItem;

export interface CreateSmsTemplateDto {
  code: string;
  name: string;
  content: string;
  channelId: string;
  status?: SmsStatus;
  remark?: string | null;
}

export interface UpdateSmsTemplateDto {
  code?: string;
  name?: string;
  content?: string;
  channelId?: string;
  status?: SmsStatus;
  remark?: string | null;
}

export interface SmsLogListItem {
  id: string;
  channelId: string;
  templateCode: string;
  phone: string;
  content: string;
  status: SmsStatus;
  providerMessage: string | null;
  sentAt: string;
  createdAt: string;
}

export interface SendSmsDto {
  phone: string;
  templateCode: string;
  params: Record<string, string>;
}

export interface SendSmsResult {
  logId: string;
  status: SmsStatus;
  content: string;
  providerMessage: string | null;
}
