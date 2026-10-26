export type EmailProviderType = 'mock' | 'smtp';

export type EmailStatus = 0 | 1;

export interface EmailChannelListItem {
  id: string;
  name: string;
  provider: EmailProviderType;
  config: string;
  status: EmailStatus;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EmailChannelDetail = EmailChannelListItem;

export interface CreateEmailChannelDto {
  name: string;
  provider: EmailProviderType;
  config: string;
  status?: EmailStatus;
  remark?: string | null;
}

export interface UpdateEmailChannelDto {
  name?: string;
  provider?: EmailProviderType;
  config?: string;
  status?: EmailStatus;
  remark?: string | null;
}

export interface EmailTemplateListItem {
  id: string;
  code: string;
  name: string;
  subject: string;
  content: string;
  channelId: string;
  status: EmailStatus;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EmailTemplateDetail = EmailTemplateListItem;

export interface CreateEmailTemplateDto {
  code: string;
  name: string;
  subject: string;
  content: string;
  channelId: string;
  status?: EmailStatus;
  remark?: string | null;
}

export interface UpdateEmailTemplateDto {
  code?: string;
  name?: string;
  subject?: string;
  content?: string;
  channelId?: string;
  status?: EmailStatus;
  remark?: string | null;
}

export interface EmailLogListItem {
  id: string;
  channelId: string;
  templateCode: string;
  to: string;
  subject: string;
  content: string;
  status: EmailStatus;
  providerMessage: string | null;
  sentAt: string;
  createdAt: string;
}

export interface SendEmailDto {
  to: string;
  templateCode: string;
  params: Record<string, string>;
}

export interface SendEmailResult {
  logId: string;
  status: EmailStatus;
  subject: string;
  content: string;
  providerMessage: string | null;
}
