import type {
  CreateEmailChannelDto,
  CreateEmailTemplateDto,
  PaginationResult,
  SendEmailDto,
  SendEmailResult,
  EmailChannelListItem,
  EmailLogListItem,
  EmailTemplateListItem,
  UpdateEmailChannelDto,
  UpdateEmailTemplateDto
} from '@nova/shared-types'
import { request } from './request'

export interface EmailListQuery {
  keyword?: string
  current?: number
  size?: number
}

export interface EmailLogListQuery {
  to?: string
  templateCode?: string
  current?: number
  size?: number
}

function buildListParams(params: { current?: number; size?: number; keyword?: string }) {
  const { current = 1, size = 20, keyword } = params
  return {
    page: current,
    pageSize: size,
    ...(keyword?.trim() ? { keyword: keyword.trim() } : {})
  }
}

function toTableResponse<T>(result: PaginationResult<T>) {
  return {
    records: result.list,
    total: result.total,
    current: result.page,
    size: result.pageSize
  }
}

export function fetchEmailChannelList(params: EmailListQuery = {}) {
  return request<PaginationResult<EmailChannelListItem>>({
    url: '/email/channels',
    method: 'GET',
    params: buildListParams(params)
  }).then(toTableResponse)
}

export function createEmailChannel(data: CreateEmailChannelDto) {
  return request<EmailChannelListItem>({ url: '/email/channels', method: 'POST', data })
}

export function updateEmailChannel(id: string, data: UpdateEmailChannelDto) {
  return request<EmailChannelListItem>({ url: `/email/channels/${id}`, method: 'PUT', data })
}

export function deleteEmailChannel(id: string) {
  return request<{ success: true }>({ url: `/email/channels/${id}`, method: 'DELETE' })
}

export function fetchEmailTemplateList(params: EmailListQuery = {}) {
  return request<PaginationResult<EmailTemplateListItem>>({
    url: '/email/templates',
    method: 'GET',
    params: buildListParams(params)
  }).then(toTableResponse)
}

export function createEmailTemplate(data: CreateEmailTemplateDto) {
  return request<EmailTemplateListItem>({ url: '/email/templates', method: 'POST', data })
}

export function updateEmailTemplate(id: string, data: UpdateEmailTemplateDto) {
  return request<EmailTemplateListItem>({ url: `/email/templates/${id}`, method: 'PUT', data })
}

export function deleteEmailTemplate(id: string) {
  return request<{ success: true }>({ url: `/email/templates/${id}`, method: 'DELETE' })
}

export function fetchEmailLogList(params: EmailLogListQuery = {}) {
  const { to, templateCode, current = 1, size = 20 } = params
  return request<PaginationResult<EmailLogListItem>>({
    url: '/email/logs',
    method: 'GET',
    params: {
      page: current,
      pageSize: size,
      ...(to ? { to } : {}),
      ...(templateCode ? { templateCode } : {})
    }
  }).then(toTableResponse)
}

export function sendEmail(data: SendEmailDto) {
  return request<SendEmailResult>({ url: '/email/send', method: 'POST', data })
}
