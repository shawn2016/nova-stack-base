import { DataSource, EntityMetadata } from 'typeorm';
import {
  ArticleEntity,
  MemberUserEntity,
  SysConfigEntity,
  SysDictDataEntity,
  SysDictTypeEntity,
  SysLoginLogEntity,
  SysMenuEntity,
  SysOperLogEntity,
  SysPermissionEntity,
  SysRegionEntity,
  SysNoticeEntity,
  SysNoticeReadEntity,
  SysMessageEntity,
  SysDeptEntity,
  SysRoleEntity,
  SysRolePermissionEntity,
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
  SysUserEntity,
  SysUserRoleEntity,
  entities,
} from '../../src/database/entities';

function hasUniqueConstraint(meta: EntityMetadata, propertyName: string): boolean {
  const column = meta.findColumnWithPropertyName(propertyName);
  if (column?.isUnique === true) {
    return true;
  }

  if (
    meta.uniques.some((unique) =>
      unique.columns.length === 1 && unique.columns[0]?.propertyName === propertyName,
    )
  ) {
    return true;
  }

  return meta.indices.some(
    (index) =>
      index.isUnique &&
      index.columns.length === 1 &&
      index.columns[0]?.propertyName === propertyName,
  );
}

describe('RBAC database entities', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities,
      synchronize: false,
    });
    await dataSource.initialize();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('loads all 30 entities with expected table names', () => {
    const tableNames = dataSource.entityMetadatas
      .map((meta) => meta.tableName)
      .sort();

    expect(tableNames).toEqual([
      'article',
      'auth_session',
      'member_user',
      'sys_config',
      'sys_dept',
      'sys_dict_data',
      'sys_dict_type',
      'sys_email_channel',
      'sys_email_log',
      'sys_email_template',
      'sys_file',
      'sys_ip_blacklist',
      'sys_job',
      'sys_job_log',
      'sys_login_log',
      'sys_menu',
      'sys_message',
      'sys_notice',
      'sys_notice_read',
      'sys_oper_log',
      'sys_permission',
      'sys_region',
      'sys_role',
      'sys_role_dept',
      'sys_role_permission',
      'sys_sms_channel',
      'sys_sms_log',
      'sys_sms_template',
      'sys_user',
      'sys_user_role',
    ]);
  });

  it('maps sys_user columns including unique username index', () => {
    const meta = dataSource.getMetadata(SysUserEntity);

    expect(meta.tableName).toBe('sys_user');
    expect(hasUniqueConstraint(meta, 'username')).toBe(true);
    expect(meta.findColumnWithPropertyName('passwordHash')).toBeDefined();
    expect(meta.findColumnWithPropertyName('status')).toBeDefined();
    expect(meta.findColumnWithPropertyName('deptId')?.databaseName).toBe('dept_id');
    expect(meta.findColumnWithPropertyName('deptId')?.isNullable).toBe(true);
  });

  it('maps sys_role with unique code index and data_scope', () => {
    const meta = dataSource.getMetadata(SysRoleEntity);

    expect(meta.tableName).toBe('sys_role');
    expect(hasUniqueConstraint(meta, 'code')).toBe(true);
    expect(meta.findColumnWithPropertyName('dataScope')?.databaseName).toBe('data_scope');
  });

  it('maps sys_permission with unique code index', () => {
    const meta = dataSource.getMetadata(SysPermissionEntity);

    expect(meta.tableName).toBe('sys_permission');
    expect(hasUniqueConstraint(meta, 'code')).toBe(true);
  });

  it('maps sys_menu tree fields', () => {
    const meta = dataSource.getMetadata(SysMenuEntity);

    expect(meta.tableName).toBe('sys_menu');
    expect(meta.findColumnWithPropertyName('parentId')).toBeDefined();
    expect(meta.findColumnWithPropertyName('type')).toBeDefined();
    expect(meta.findColumnWithPropertyName('permissionCode')).toBeDefined();
  });

  it('uses composite primary keys on junction tables', () => {
    const userRoleMeta = dataSource.getMetadata(SysUserRoleEntity);
    const rolePermMeta = dataSource.getMetadata(SysRolePermissionEntity);
    const roleDeptMeta = dataSource.getMetadata(SysRoleDeptEntity);

    expect(userRoleMeta.primaryColumns.map((c) => c.propertyName).sort()).toEqual([
      'roleId',
      'userId',
    ]);
    expect(rolePermMeta.primaryColumns.map((c) => c.propertyName).sort()).toEqual([
      'permissionId',
      'roleId',
    ]);
    expect(roleDeptMeta.primaryColumns.map((c) => c.propertyName).sort()).toEqual([
      'deptId',
      'roleId',
    ]);
  });

  it('maps member_user with unique phone and no FK to sys_user', () => {
    const meta = dataSource.getMetadata(MemberUserEntity);

    expect(meta.tableName).toBe('member_user');
    expect(hasUniqueConstraint(meta, 'phone')).toBe(true);
    expect(meta.relations).toHaveLength(0);
  });

  it('maps sys_config with unique configKey and text configValue', () => {
    const meta = dataSource.getMetadata(SysConfigEntity);

    expect(meta.tableName).toBe('sys_config');
    expect(hasUniqueConstraint(meta, 'configKey')).toBe(true);
    expect(meta.findColumnWithPropertyName('configKey')?.databaseName).toBe('config_key');
    expect(meta.findColumnWithPropertyName('configName')?.databaseName).toBe('config_name');
    expect(meta.findColumnWithPropertyName('configValue')?.type).toBe('text');
    expect(meta.findColumnWithPropertyName('configGroup')?.isNullable).toBe(true);
    expect(meta.findColumnWithPropertyName('remark')?.isNullable).toBe(true);
    expect(meta.relations).toHaveLength(0);
  });

  it('maps sys_dict_type with unique code', () => {
    const meta = dataSource.getMetadata(SysDictTypeEntity);

    expect(meta.tableName).toBe('sys_dict_type');
    expect(hasUniqueConstraint(meta, 'code')).toBe(true);
    expect(meta.findColumnWithPropertyName('status')?.type).toBe('tinyint');
    expect(meta.findColumnWithPropertyName('remark')?.isNullable).toBe(true);
  });

  it('maps sys_dict_data with composite unique (typeId, value)', () => {
    const meta = dataSource.getMetadata(SysDictDataEntity);

    expect(meta.tableName).toBe('sys_dict_data');
    expect(
      meta.uniques.some(
        (unique) =>
          unique.columns.map((c) => c.propertyName).sort().join(',') ===
          'typeId,value',
      ),
    ).toBe(true);
    expect(meta.findColumnWithPropertyName('typeId')?.databaseName).toBe('type_id');
    expect(meta.findColumnWithPropertyName('sort')?.default).toBe(0);
    expect(meta.relations).toHaveLength(0);
  });

  it('maps article columns and status+publishedAt index', () => {
    const meta = dataSource.getMetadata(ArticleEntity);

    expect(meta.tableName).toBe('article');
    expect(meta.findColumnWithPropertyName('title')?.length).toBe('200');
    expect(meta.findColumnWithPropertyName('summary')?.length).toBe('500');
    expect(meta.findColumnWithPropertyName('content')?.type).toBe('text');
    expect(meta.findColumnWithPropertyName('coverUrl')?.databaseName).toBe('cover_url');
    expect(meta.findColumnWithPropertyName('status')?.type).toBe('tinyint');
    expect(meta.findColumnWithPropertyName('authorId')?.databaseName).toBe('author_id');
    expect(meta.findColumnWithPropertyName('publishedAt')?.databaseName).toBe('published_at');
    expect(
      meta.indices.some(
        (index) =>
          index.columns.map((c) => c.propertyName).sort().join(',') ===
          'publishedAt,status',
      ),
    ).toBe(true);
    expect(meta.relations).toHaveLength(0);
  });

  it('maps sys_region tree fields with unique code', () => {
    const meta = dataSource.getMetadata(SysRegionEntity);

    expect(meta.tableName).toBe('sys_region');
    expect(hasUniqueConstraint(meta, 'code')).toBe(true);
    expect(meta.findColumnWithPropertyName('parentId')?.databaseName).toBe('parent_id');
    expect(meta.findColumnWithPropertyName('level')?.type).toBe('tinyint');
    expect(meta.relations).toHaveLength(0);
  });

  it('maps sys_message with sender and receiver', () => {
    const meta = dataSource.getMetadata(SysMessageEntity);

    expect(meta.tableName).toBe('sys_message');
    expect(meta.findColumnWithPropertyName('senderId')?.databaseName).toBe('sender_id');
    expect(meta.findColumnWithPropertyName('receiverId')?.databaseName).toBe('receiver_id');
    expect(meta.findColumnWithPropertyName('isRead')?.databaseName).toBe('is_read');
    expect(meta.relations).toHaveLength(0);
  });

  it('maps sys_notice_read composite primary key', () => {
    const meta = dataSource.getMetadata(SysNoticeReadEntity);

    expect(meta.tableName).toBe('sys_notice_read');
    expect(meta.primaryColumns.map((c) => c.propertyName).sort()).toEqual([
      'noticeId',
      'userId',
    ]);
  });

  it('maps sys_notice with status and publisher', () => {
    const meta = dataSource.getMetadata(SysNoticeEntity);

    expect(meta.tableName).toBe('sys_notice');
    expect(meta.findColumnWithPropertyName('publisherId')?.databaseName).toBe('publisher_id');
    expect(meta.findColumnWithPropertyName('publishedAt')?.databaseName).toBe('published_at');
    expect(meta.relations).toHaveLength(0);
  });

  it('maps sys_login_log with nullable userId and userAgent', () => {
    const meta = dataSource.getMetadata(SysLoginLogEntity);

    expect(meta.tableName).toBe('sys_login_log');
    expect(meta.findColumnWithPropertyName('username')?.length).toBe('64');
    expect(meta.findColumnWithPropertyName('userId')?.databaseName).toBe('user_id');
    expect(meta.findColumnWithPropertyName('userId')?.isNullable).toBe(true);
    expect(meta.findColumnWithPropertyName('userAgent')?.databaseName).toBe('user_agent');
    expect(meta.findColumnWithPropertyName('userAgent')?.isNullable).toBe(true);
    expect(meta.findColumnWithPropertyName('status')?.type).toBe('tinyint');
    expect(meta.findColumnWithPropertyName('message')?.isNullable).toBe(true);
    expect(meta.relations).toHaveLength(0);
  });

  it('maps sys_oper_log with request_summary text and duration_ms', () => {
    const meta = dataSource.getMetadata(SysOperLogEntity);

    expect(meta.tableName).toBe('sys_oper_log');
    expect(meta.findColumnWithPropertyName('userId')?.databaseName).toBe('user_id');
    expect(meta.findColumnWithPropertyName('module')?.length).toBe('32');
    expect(meta.findColumnWithPropertyName('action')?.length).toBe('32');
    expect(meta.findColumnWithPropertyName('method')?.length).toBe('8');
    expect(meta.findColumnWithPropertyName('path')?.length).toBe('255');
    expect(meta.findColumnWithPropertyName('requestSummary')?.type).toBe('text');
    expect(meta.findColumnWithPropertyName('requestSummary')?.isNullable).toBe(true);
    expect(meta.findColumnWithPropertyName('errorMsg')?.databaseName).toBe('error_msg');
    expect(meta.findColumnWithPropertyName('errorMsg')?.isNullable).toBe(true);
    expect(meta.findColumnWithPropertyName('durationMs')?.databaseName).toBe('duration_ms');
    expect(meta.findColumnWithPropertyName('status')?.type).toBe('tinyint');
    expect(meta.relations).toHaveLength(0);
  });
});
