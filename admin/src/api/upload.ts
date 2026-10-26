import type { UploadResult } from '@nova/shared-types'
import { request } from './request'

export function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request<UploadResult>({
    url: '/files/upload',
    method: 'POST',
    data: formData
  })
}
