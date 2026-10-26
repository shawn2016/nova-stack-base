import type {
  CreateSmsChannelDto,
  CreateSmsTemplateDto,
  PaginationResult,
  SendSmsDto,
  SendSmsResult,
  SmsChannelListItem,
  SmsLogListItem,
  SmsTemplateListItem,
  UpdateSmsChannelDto,
  UpdateSmsTemplateDto
} from '@nova/shared-types'
import { request } from './request'

export interface SmsListQuery {
  keyword?: string
  current?: number
  size?: number
}

export interface SmsLogListQuery {
  phone?: string
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

export function fetchSmsChannelList(params: SmsListQuery = {}) {
  return request<PaginationResult<SmsChannelListItem>>({
    url: '/sms/channels',
    method: 'GET',
    params: buildListParams(params)
  }).then(toTableResponse)
}

export function createSmsChannel(data: CreateSmsChannelDto) {
  return request<SmsChannelListItem>({ url: '/sms/channels', method: 'POST', data })
}

export function updateSmsChannel(id: string, data: UpdateSmsChannelDto) {
  return request<SmsChannelListItem>({ url: `/sms/channels/${id}`, method: 'PUT', data })
}

export function deleteSmsChannel(id: string) {
  return request<{ success: true }>({ url: `/sms/channels/${id}`, method: 'DELETE' })
}

export function fetchSmsTemplateList(params: SmsListQuery = {}) {
  return request<PaginationResult<SmsTemplateListItem>>({
    url: '/sms/templates',
    method: 'GET',
    params: buildListParams(params)
  }).then(toTableResponse)
}

export function createSmsTemplate(data: CreateSmsTemplateDto) {
  return request<SmsTemplateListItem>({ url: '/sms/templates', method: 'POST', data })
}

export function updateSmsTemplate(id: string, data: UpdateSmsTemplateDto) {
  return request<SmsTemplateListItem>({ url: `/sms/templates/${id}`, method: 'PUT', data })
}

export function deleteSmsTemplate(id: string) {
  return request<{ success: true }>({ url: `/sms/templates/${id}`, method: 'DELETE' })
}

export function fetchSmsLogList(params: SmsLogListQuery = {}) {
  const { phone, templateCode, current = 1, size = 20 } = params
  return request<PaginationResult<SmsLogListItem>>({
    url: '/sms/logs',
    method: 'GET',
    params: {
      page: current,
      pageSize: size,
      ...(phone ? { phone } : {}),
      ...(templateCode ? { templateCode } : {})
    }
  }).then(toTableResponse)
}

export function sendSms(data: SendSmsDto) {
  return request<SendSmsResult>({ url: '/sms/send', method: 'POST', data })
}
