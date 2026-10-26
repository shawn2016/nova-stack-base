import type { UpdateUploadSettingsDto, UploadSettings } from '@nova/shared-types'
import { request } from './request'

export function fetchUploadSettings() {
  return request<UploadSettings>({
    url: '/files/settings',
    method: 'GET'
  })
}

export function updateUploadSettings(data: UpdateUploadSettingsDto) {
  return request<UploadSettings>({
    url: '/files/settings',
    method: 'PUT',
    data
  })
}
