import type {
  CreateJobDto,
  JobDetail,
  JobHandlerInfo,
  JobListItem,
  JobLogListItem,
  PaginationResult,
  RunJobResult,
  UpdateJobDto,
  UpdateJobStatusDto
} from '@nova/shared-types'
import { request } from './request'

export interface JobListQuery {
  keyword?: string
  current?: number
  size?: number
}

export interface JobLogListQuery {
  jobId?: string
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

export function fetchJobHandlers() {
  return request<JobHandlerInfo[]>({
    url: '/jobs/handlers',
    method: 'GET'
  })
}

export function fetchJobList(params: JobListQuery = {}) {
  return request<PaginationResult<JobListItem>>({
    url: '/jobs',
    method: 'GET',
    params: buildListParams(params)
  }).then(toTableResponse)
}

export function fetchJobDetail(id: string) {
  return request<JobDetail>({
    url: `/jobs/${id}`,
    method: 'GET'
  })
}

export function fetchJobLogList(params: JobLogListQuery = {}) {
  const { jobId, current = 1, size = 20 } = params
  return request<PaginationResult<JobLogListItem>>({
    url: '/jobs/logs',
    method: 'GET',
    params: {
      page: current,
      pageSize: size,
      ...(jobId ? { jobId } : {})
    }
  }).then(toTableResponse)
}

export function createJob(data: CreateJobDto) {
  return request<JobDetail>({
    url: '/jobs',
    method: 'POST',
    data
  })
}

export function updateJob(id: string, data: UpdateJobDto) {
  return request<JobDetail>({
    url: `/jobs/${id}`,
    method: 'PUT',
    data
  })
}

export function updateJobStatus(id: string, data: UpdateJobStatusDto) {
  return request<JobDetail>({
    url: `/jobs/${id}/status`,
    method: 'PUT',
    data
  })
}

export function runJob(id: string) {
  return request<RunJobResult>({
    url: `/jobs/${id}/run`,
    method: 'POST'
  })
}

export function deleteJob(id: string) {
  return request<{ success: true }>({
    url: `/jobs/${id}`,
    method: 'DELETE'
  })
}
