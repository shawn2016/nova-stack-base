/** 统一 API 响应结构 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/** 分页请求参数 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/** 分页响应结果 */
export interface PaginationResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 通用错误码 */
export enum ErrorCode {
  SUCCESS = 0,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_ERROR = 500,
}

export type {
  AdminInfo,
  AdminLoginRequest,
  AdminLoginResponse,
  AdminMeResponse,
  ChangePasswordDto,
  JwtPayload,
  MemberInfo,
  MemberLoginRequest,
  MemberLoginResponse,
  MemberRegisterRequest,
  MenuNode,
  RefreshTokenRequest,
  TokenPair,
  UpdateProfileDto,
  UploadResult,
} from './auth.js';

export type { Article, ArticleListItem, CreateArticleDto, UpdateArticleDto } from './article.js';

export type {
  AssignRolePermissionsDto,
  SysPermissionOption,
  AssignUserRolesDto,
  CreateMenuDto,
  CreateRoleDto,
  CreateUserDto,
  SysMenuListItem,
  SysRoleDetail,
  SysRoleListItem,
  SysUserDetail,
  SysUserListItem,
  UpdateMenuDto,
  UpdateRoleDto,
  UpdateUserDto,
} from './rbac.js';

export type {
  CreateDictDataDto,
  CreateDictTypeDto,
  DictDataListItem,
  DictOption,
  DictTypeListItem,
  UpdateDictDataDto,
  UpdateDictTypeDto,
} from './dict.js';

export type {
  CreateSiteConfigDto,
  SiteConfigByKeyResult,
  SiteConfigListItem,
  UpdateSiteConfigDto,
} from './site-config.js';

export type {
  LoginLogListItem,
  LoginLogListQuery,
  OperLogListItem,
  OperLogListQuery,
} from './audit-log.js';

export type { CreateRegionDto, RegionListItem, RegionTreeNode, UpdateRegionDto } from './region.js';

export type {
  CreateMessageDto,
  CreateNoticeDto,
  MessageListItem,
  NoticeListItem,
  NoticeMyListItem,
  UnreadCountResult,
  UpdateNoticeDto,
} from './notice.js';

export type {
  CreateDeptDto,
  DeptListItem,
  DeptSettings,
  DeptTreeNode,
  UpdateDeptDto,
  UpdateDeptSettingsDto,
  UpdateDeptStatusDto,
} from './dept.js';

export type { DataScope, DataScopeFilter } from './data-scope.js';

export {
  DATA_SCOPE_ALL,
  DATA_SCOPE_CUSTOM,
  DATA_SCOPE_DEPT,
  DATA_SCOPE_DEPT_AND_CHILD,
  DATA_SCOPE_LABELS,
  DATA_SCOPE_SELF,
} from './data-scope.js';

export type {
  FileListItem,
  FileStorageType,
  ListFilesQuery,
  UpdateUploadSettingsDto,
  UploadAliyunSettings,
  UploadLocalSettings,
  UploadSettings,
  UploadStorageProvider,
  UploadTencentSettings,
} from './file.js';

export { FILE_STORAGE_LABELS, UPLOAD_STORAGE_PROVIDER_LABELS } from './file.js';

export type {
  KickOnlineSessionResult,
  OnlineSessionListItem,
  OnlineSessionListResult,
} from './online-session.js';

export type {
  CreateIpBlacklistDto,
  IpBlacklistListItem,
  IpBlacklistListQuery,
  IpBlacklistListResult,
  IpBlacklistSource,
  UpdateIpBlacklistStatusDto,
} from './ip-blacklist.js';

export type {
  CreateJobDto,
  JobDetail,
  JobHandlerInfo,
  JobListItem,
  JobLogListItem,
  JobLogStatus,
  JobStatus,
  RunJobResult,
  UpdateJobDto,
  UpdateJobStatusDto,
} from './scheduled-job.js';

export type {
  CreateSmsChannelDto,
  CreateSmsTemplateDto,
  SendSmsDto,
  SendSmsResult,
  SmsChannelDetail,
  SmsChannelListItem,
  SmsLogListItem,
  SmsProviderType,
  SmsStatus,
  SmsTemplateDetail,
  SmsTemplateListItem,
  UpdateSmsChannelDto,
  UpdateSmsTemplateDto,
} from './sms.js';

export type {
  CreateEmailChannelDto,
  CreateEmailTemplateDto,
  EmailChannelDetail,
  EmailChannelListItem,
  EmailLogListItem,
  EmailProviderType,
  EmailStatus,
  EmailTemplateDetail,
  EmailTemplateListItem,
  SendEmailDto,
  SendEmailResult,
  UpdateEmailChannelDto,
  UpdateEmailTemplateDto,
} from './email.js';
