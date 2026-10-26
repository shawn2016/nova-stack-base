import type { FileListItem, FileStorageType, PaginationResult } from '@nova/shared-types'
import { request } from './request'

export interface FileListQuery {
  keyword?: string
  storage?: FileStorageType
  current?: number
  size?: number
}

function buildListParams(params: FileListQuery = {}) {
  const { current = 1, size = 20, keyword, storage } = params
  return {
    page: current,
    pageSize: size,
    ...(keyword?.trim() ? { keyword: keyword.trim() } : {}),
    ...(storage ? { storage } : {})
  }
}

export function fetchFileList(params: FileListQuery = {}) {
  return request<PaginationResult<FileListItem>>({
    url: '/files',
    method: 'GET',
    params: buildListParams(params)
  }).then((result) => ({
    records: result.list,
    total: result.total,
    current: result.page,
    size: result.pageSize
  }))
}

export function deleteFile(id: string) {
  return request<{ success: true }>({
    url: `/files/${id}`,
    method: 'DELETE'
  })
}
