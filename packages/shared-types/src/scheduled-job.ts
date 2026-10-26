/** 定时任务状态 */
export type JobStatus = 0 | 1;

/** 任务执行日志状态 */
export type JobLogStatus = 0 | 1;

export interface JobListItem {
  id: string;
  name: string;
  jobGroup: string;
  invokeTarget: string;
  cronExpression: string;
  status: JobStatus;
  concurrent: 0 | 1;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export type JobDetail = JobListItem;

export interface CreateJobDto {
  name: string;
  jobGroup?: string;
  invokeTarget: string;
  cronExpression: string;
  status?: JobStatus;
  concurrent?: 0 | 1;
  remark?: string | null;
}

export interface UpdateJobDto {
  name?: string;
  jobGroup?: string;
  invokeTarget?: string;
  cronExpression?: string;
  status?: JobStatus;
  concurrent?: 0 | 1;
  remark?: string | null;
}

export interface UpdateJobStatusDto {
  status: JobStatus;
}

export interface JobLogListItem {
  id: string;
  jobId: string;
  jobName: string;
  jobGroup: string;
  invokeTarget: string;
  status: JobLogStatus;
  message: string | null;
  exceptionInfo: string | null;
  startTime: string;
  endTime: string;
  durationMs: number;
  createdAt: string;
}

export interface JobHandlerInfo {
  key: string;
  description: string;
}

/** 异步执行已入队；实际成功/失败在任务日志查询。 */
export interface RunJobResult {
  executionId: string;
  status: 'queued';
  message: string;
}
