import type {
  CreateMessageDto,
  CreateNoticeDto,
  MessageListItem,
  NoticeListItem,
  NoticeMyListItem,
  PaginationResult,
  UnreadCountResult,
  UpdateNoticeDto
} from '@nova/shared-types'
import { request } from './request'

export interface NoticeListQuery {
  keyword?: string
  status?: 0 | 1
  type?: 1 | 2
  current?: number
  size?: number
}

function toTableResponse<T>(result: PaginationResult<T>) {
  return {
    records: result.list,
    total: result.total,
    current: result.page,
    size: result.pageSize
  }
}

export function fetchNoticeList(params: NoticeListQuery = {}) {
  const { keyword, status, type, current = 1, size = 20 } = params
  return request<PaginationResult<NoticeListItem>>({
    url: '/notices',
    method: 'GET',
    params: {
      page: current,
      pageSize: size,
      ...(keyword ? { keyword } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(type !== undefined ? { type } : {})
    }
  }).then(toTableResponse)
}

export function fetchMyNotices(params: { current?: number; size?: number } = {}) {
  const { current = 1, size = 20 } = params
  return request<PaginationResult<NoticeMyListItem>>({
    url: '/notices/my',
    method: 'GET',
    params: { page: current, pageSize: size }
  }).then(toTableResponse)
}

export function fetchNoticeUnreadCount() {
  return request<UnreadCountResult>({
    url: '/notices/unread-count',
    method: 'GET'
  })
}

export function createNotice(data: CreateNoticeDto) {
  return request<NoticeListItem>({
    url: '/notices',
    method: 'POST',
    data
  })
}

export function updateNotice(id: string, data: UpdateNoticeDto) {
  return request<NoticeListItem>({
    url: `/notices/${id}`,
    method: 'PUT',
    data
  })
}

export function publishNotice(id: string) {
  return request<NoticeListItem>({
    url: `/notices/${id}/publish`,
    method: 'PUT'
  })
}

export function deleteNotice(id: string) {
  return request<{ success: true }>({
    url: `/notices/${id}`,
    method: 'DELETE'
  })
}

export function markNoticeRead(id: string) {
  return request<{ success: true }>({
    url: `/notices/${id}/read`,
    method: 'POST'
  })
}

export interface MessageListQuery {
  keyword?: string
  current?: number
  size?: number
}

export function fetchMessageInbox(params: MessageListQuery = {}) {
  const { keyword, current = 1, size = 20 } = params
  return request<PaginationResult<MessageListItem>>({
    url: '/messages/inbox',
    method: 'GET',
    params: {
      page: current,
      pageSize: size,
      ...(keyword ? { keyword } : {})
    }
  }).then(toTableResponse)
}

export function fetchMessageSent(params: MessageListQuery = {}) {
  const { keyword, current = 1, size = 20 } = params
  return request<PaginationResult<MessageListItem>>({
    url: '/messages/sent',
    method: 'GET',
    params: {
      page: current,
      pageSize: size,
      ...(keyword ? { keyword } : {})
    }
  }).then(toTableResponse)
}

export function fetchMessageUnreadCount() {
  return request<UnreadCountResult>({
    url: '/messages/unread-count',
    method: 'GET'
  })
}

export function sendMessage(data: CreateMessageDto) {
  return request<MessageListItem>({
    url: '/messages',
    method: 'POST',
    data
  })
}

export function markMessageRead(id: string) {
  return request<MessageListItem>({
    url: `/messages/${id}/read`,
    method: 'PUT'
  })
}

export function deleteMessage(id: string) {
  return request<{ success: true }>({
    url: `/messages/${id}`,
    method: 'DELETE'
  })
}
