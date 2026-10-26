import { AuthSessionEntity } from './auth-session.entity';
export { AuthSessionEntity } from './auth-session.entity';
import { ArticleEntity } from './article.entity';
import { MemberUserEntity } from './member-user.entity';
import { SysConfigEntity } from './sys-config.entity';
import { SysDictDataEntity } from './sys-dict-data.entity';
import { SysDictTypeEntity } from './sys-dict-type.entity';
import { SysLoginLogEntity } from './sys-login-log.entity';
import { SysMenuEntity } from './sys-menu.entity';
import { SysOperLogEntity } from './sys-oper-log.entity';
import { SysPermissionEntity } from './sys-permission.entity';
import { SysRoleEntity } from './sys-role.entity';
import { SysRolePermissionEntity } from './sys-role-permission.entity';
import { SysUserEntity } from './sys-user.entity';
import { SysUserRoleEntity } from './sys-user-role.entity';
import { SysRegionEntity } from './sys-region.entity';
import { SysNoticeEntity } from './sys-notice.entity';
import { SysNoticeReadEntity } from './sys-notice-read.entity';
import { SysMessageEntity } from './sys-message.entity';
import { SysDeptEntity } from './sys-dept.entity';
import { SysRoleDeptEntity } from './sys-role-dept.entity';
import { SysJobEntity } from './sys-job.entity';
import { SysJobLogEntity } from './sys-job-log.entity';
import { SysSmsChannelEntity } from './sys-sms-channel.entity';
import { SysSmsTemplateEntity } from './sys-sms-template.entity';
import { SysSmsLogEntity } from './sys-sms-log.entity';
import { SysEmailChannelEntity } from './sys-email-channel.entity';
import { SysEmailTemplateEntity } from './sys-email-template.entity';
import { SysEmailLogEntity } from './sys-email-log.entity';
import { SysFileEntity } from './sys-file.entity';
import { SysIpBlacklistEntity } from './sys-ip-blacklist.entity';

export { ArticleEntity } from './article.entity';
export { MemberUserEntity } from './member-user.entity';
export { SysConfigEntity } from './sys-config.entity';
export { SysDictDataEntity } from './sys-dict-data.entity';
export { SysDictTypeEntity } from './sys-dict-type.entity';
export { SysLoginLogEntity } from './sys-login-log.entity';
export { SysMenuEntity } from './sys-menu.entity';
export { SysOperLogEntity } from './sys-oper-log.entity';
export { SysPermissionEntity } from './sys-permission.entity';
export { SysRoleEntity } from './sys-role.entity';
export { SysRolePermissionEntity } from './sys-role-permission.entity';
export { SysUserEntity } from './sys-user.entity';
export { SysUserRoleEntity } from './sys-user-role.entity';
export { SysRegionEntity } from './sys-region.entity';
export { SysNoticeEntity } from './sys-notice.entity';
export { SysNoticeReadEntity } from './sys-notice-read.entity';
export { SysMessageEntity } from './sys-message.entity';
export { SysDeptEntity } from './sys-dept.entity';
export { SysRoleDeptEntity } from './sys-role-dept.entity';
export { SysJobEntity } from './sys-job.entity';
export { SysJobLogEntity } from './sys-job-log.entity';
export { SysSmsChannelEntity } from './sys-sms-channel.entity';
export { SysSmsTemplateEntity } from './sys-sms-template.entity';
export { SysSmsLogEntity } from './sys-sms-log.entity';
export { SysEmailChannelEntity } from './sys-email-channel.entity';
export { SysEmailTemplateEntity } from './sys-email-template.entity';
export { SysEmailLogEntity } from './sys-email-log.entity';
export { SysFileEntity } from './sys-file.entity';
export { SysIpBlacklistEntity } from './sys-ip-blacklist.entity';

/** 全部 RBAC / Member / Dict 实体，供 TypeORM 与测试加载 */
export const entities = [
  AuthSessionEntity,
  SysUserEntity,
  SysRoleEntity,
  SysPermissionEntity,
  SysMenuEntity,
  SysUserRoleEntity,
  SysRolePermissionEntity,
  MemberUserEntity,
  ArticleEntity,
  SysConfigEntity,
  SysDictTypeEntity,
  SysDictDataEntity,
  SysLoginLogEntity,
  SysOperLogEntity,
  SysRegionEntity,
  SysNoticeEntity,
  SysNoticeReadEntity,
  SysMessageEntity,
  SysDeptEntity,
  SysRoleDeptEntity,
  SysJobEntity,
  SysJobLogEntity,
  SysSmsChannelEntity,
  SysSmsTemplateEntity,
  SysSmsLogEntity,
  SysEmailChannelEntity,
  SysEmailTemplateEntity,
  SysEmailLogEntity,
  SysFileEntity,
  SysIpBlacklistEntity,
];
