import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { runInitSeed } from '../../src/database/seeds/init.seed';
import {
  ArticleEntity,
  MemberUserEntity,
  SysConfigEntity,
  SysDictDataEntity,
  SysDictTypeEntity,
  SysMenuEntity,
  SysMessageEntity,
  SysNoticeEntity,
  SysPermissionEntity,
  SysRegionEntity,
  SysDeptEntity,
  SysRoleEntity,
  SysRolePermissionEntity,
  SysJobEntity,
  SysSmsChannelEntity,
  SysSmsTemplateEntity,
  SysEmailChannelEntity,
  SysEmailTemplateEntity,
  SysUserEntity,
  SysUserRoleEntity,
} from '../../src/database/entities';

jest.mock('bcrypt', () => ({
  hash: jest.fn(async (plain: string) => `bcrypt:${plain}`),
}));

type RepoMock<T extends ObjectLiteral> = jest.Mocked<
  Pick<Repository<T>, 'findOne' | 'create' | 'save'>
>;

interface SeedStores {
  roles: SysRoleEntity[];
  permissions: SysPermissionEntity[];
  menus: SysMenuEntity[];
  users: SysUserEntity[];
  userRoles: SysUserRoleEntity[];
  rolePermissions: SysRolePermissionEntity[];
  members: MemberUserEntity[];
  articles: ArticleEntity[];
  dictTypes: SysDictTypeEntity[];
  dictData: SysDictDataEntity[];
  siteConfigs: SysConfigEntity[];
  regions: SysRegionEntity[];
  depts: SysDeptEntity[];
  notices: SysNoticeEntity[];
  messages: SysMessageEntity[];
  jobs: SysJobEntity[];
  smsChannels: SysSmsChannelEntity[];
  smsTemplates: SysSmsTemplateEntity[];
  emailChannels: SysEmailChannelEntity[];
  emailTemplates: SysEmailTemplateEntity[];
}

function matchesWhere<T extends ObjectLiteral>(
  entity: T,
  where: Partial<T>,
): boolean {
  return Object.entries(where).every(
    ([key, value]) => entity[key as keyof T] === value,
  );
}

function createInMemoryRepo<T extends ObjectLiteral & { id?: string }>(
  store: T[],
  createDefaults?: () => Partial<T>,
): RepoMock<T> {
  let idCounter = 1;

  return {
    findOne: jest.fn(async ({ where }: { where: Partial<T> }) =>
      store.find((item) => matchesWhere(item, where)) ?? null,
    ),
    create: jest.fn((data: Partial<T>) => ({ ...(createDefaults?.() ?? {}), ...data })),
    save: jest.fn(async (entity: T) => {
      const existingIndex = entity.id
        ? store.findIndex((item) => item.id === entity.id)
        : -1;

      const saved = {
        ...entity,
        id: entity.id ?? String(idCounter++),
      } as T;

      if (existingIndex >= 0) {
        store[existingIndex] = saved;
      } else {
        store.push(saved);
      }

      return saved;
    }),
  };
}

function createMockDataSource(stores: SeedStores): DataSource {
  const roleRepo = createInMemoryRepo(stores.roles);
  const permissionRepo = createInMemoryRepo(stores.permissions);
  const menuRepo = createInMemoryRepo(stores.menus);
  const userRepo = createInMemoryRepo(stores.users);
  const userRoleRepo = createInMemoryRepo(stores.userRoles);
  const rolePermissionRepo = createInMemoryRepo(stores.rolePermissions);
  const memberRepo = createInMemoryRepo(stores.members);
  const articleRepo = createInMemoryRepo(stores.articles);
  const dictTypeRepo = createInMemoryRepo(stores.dictTypes);
  const dictDataRepo = createInMemoryRepo(stores.dictData);
  const siteConfigRepo = createInMemoryRepo(stores.siteConfigs);
  const regionRepo = createInMemoryRepo(stores.regions);
  const deptRepo = createInMemoryRepo(stores.depts);
  const noticeRepo = createInMemoryRepo(stores.notices);
  const messageRepo = createInMemoryRepo(stores.messages);
  const jobRepo = createInMemoryRepo(stores.jobs);
  const smsChannelRepo = createInMemoryRepo(stores.smsChannels);
  const smsTemplateRepo = createInMemoryRepo(stores.smsTemplates);
  const emailChannelRepo = createInMemoryRepo(stores.emailChannels);
  const emailTemplateRepo = createInMemoryRepo(stores.emailTemplates);

  return {
    getRepository: jest.fn((entity) => {
      switch (entity) {
        case SysRoleEntity:
          return roleRepo;
        case SysPermissionEntity:
          return permissionRepo;
        case SysMenuEntity:
          return menuRepo;
        case SysUserEntity:
          return userRepo;
        case SysUserRoleEntity:
          return userRoleRepo;
        case SysRolePermissionEntity:
          return rolePermissionRepo;
        case MemberUserEntity:
          return memberRepo;
        case ArticleEntity:
          return articleRepo;
        case SysDictTypeEntity:
          return dictTypeRepo;
        case SysDictDataEntity:
          return dictDataRepo;
        case SysConfigEntity:
          return siteConfigRepo;
        case SysRegionEntity:
          return regionRepo;
        case SysDeptEntity:
          return deptRepo;
        case SysNoticeEntity:
          return noticeRepo;
        case SysMessageEntity:
          return messageRepo;
        case SysJobEntity:
          return jobRepo;
        case SysSmsChannelEntity:
          return smsChannelRepo;
        case SysSmsTemplateEntity:
          return smsTemplateRepo;
        case SysEmailChannelEntity:
          return emailChannelRepo;
        case SysEmailTemplateEntity:
          return emailTemplateRepo;
        default:
          throw new Error(`Unexpected entity: ${String(entity)}`);
      }
    }),
  } as unknown as DataSource;
}

function emptyStores(): SeedStores {
  return {
    roles: [],
    permissions: [],
    menus: [],
    users: [],
    userRoles: [],
    rolePermissions: [],
    members: [],
    articles: [],
    dictTypes: [],
    dictData: [],
    siteConfigs: [],
    regions: [],
    depts: [],
    notices: [],
    messages: [],
    jobs: [],
    smsChannels: [],
    smsTemplates: [],
    emailChannels: [],
    emailTemplates: [],
  };
}

describe('runInitSeed', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.clearAllMocks();
  });

  it('uses bcrypt and links admin to super_admin in non-production', async () => {
    process.env.NODE_ENV = 'development';
    const stores = emptyStores();
    const dataSource = createMockDataSource(stores);

    await runInitSeed(dataSource);

    expect(bcrypt.hash).toHaveBeenCalledWith('admin123', 10);
    expect(bcrypt.hash).toHaveBeenCalledWith('member123', 10);

    const adminUser = stores.users.find((user) => user.username === 'admin');
    expect(adminUser?.passwordHash).toBe('bcrypt:admin123');

    const superAdminRole = stores.roles.find((role) => role.code === 'super_admin');
    expect(superAdminRole).toBeDefined();
    expect(superAdminRole?.dataScope).toBe(1);
    expect(
      stores.userRoles.some(
        (link) =>
          link.userId === adminUser?.id && link.roleId === superAdminRole?.id,
      ),
    ).toBe(true);
  });

  it('seeds permissions, menus, and role-permission links', async () => {
    process.env.NODE_ENV = 'development';
    const stores = emptyStores();
    const dataSource = createMockDataSource(stores);

    await runInitSeed(dataSource);

    expect(stores.permissions.length).toBe(85);
    expect(stores.permissions.some((p) => p.code === 'system:user:list')).toBe(true);
    expect(stores.permissions.some((p) => p.code === 'content:article:list')).toBe(true);
    expect(stores.permissions.some((p) => p.code === 'system:dict:type:list')).toBe(true);
    expect(stores.permissions.some((p) => p.code === 'system:dict:data:delete')).toBe(true);
    expect(stores.permissions.some((p) => p.code === 'system:config:list')).toBe(true);
    expect(stores.permissions.some((p) => p.code === 'system:config:delete')).toBe(true);
    expect(stores.permissions.some((p) => p.code === 'system:audit:login:list')).toBe(true);
    expect(stores.permissions.some((p) => p.code === 'system:audit:oper:list')).toBe(true);
    expect(stores.permissions.some((p) => p.code === 'system:notice:list')).toBe(true);
    expect(stores.permissions.some((p) => p.code === 'system:message:send')).toBe(true);
    expect(stores.permissions.some((p) => p.code === 'infra:sms:send')).toBe(true);
    expect(stores.permissions.some((p) => p.code === 'infra:email:send')).toBe(true);
    expect(stores.permissions.some((p) => p.code === 'infra:job:list')).toBe(true);
    expect(stores.permissions.some((p) => p.code === 'system:region:delete')).toBe(true);
    expect(stores.menus.some((m) => m.name === '系统管理')).toBe(true);
    expect(stores.menus.some((m) => m.name === '用户管理')).toBe(true);
    expect(stores.menus.some((m) => m.name === '字典管理' && m.path === '/system/dict')).toBe(
      true,
    );
    expect(stores.menus.find((m) => m.name === '字典管理')?.permissionCode).toBe(
      'system:dict:type:list',
    );
    expect(
      stores.menus.some((m) => m.name === '地区管理' && m.path === '/system/region'),
    ).toBe(true);
    expect(stores.menus.find((m) => m.name === '地区管理')?.permissionCode).toBe(
      'system:region:list',
    );
    expect(
      stores.menus.some((m) => m.name === '站点配置' && m.path === '/system/site-config'),
    ).toBe(true);
    expect(stores.menus.find((m) => m.name === '站点配置')?.permissionCode).toBe(
      'system:config:list',
    );
    expect(stores.menus.find((m) => m.name === '站点配置')?.component).toBe(
      'views/system/site-config/index',
    );
    expect(
      stores.menus.some((m) => m.name === '审计日志' && m.path === '/system/audit-logs'),
    ).toBe(true);
    expect(stores.menus.find((m) => m.name === '审计日志')?.component).toBe(
      'views/system/audit-logs/index',
    );
    expect(stores.menus.find((m) => m.name === '审计日志')?.permissionCode).toBe(
      'system:audit:login:list',
    );
    expect(
      stores.menus.some((m) => m.name === '通知公告' && m.path === '/system/notice'),
    ).toBe(true);
    expect(
      stores.menus.some((m) => m.name === '消息中心' && m.path === '/system/message'),
    ).toBe(true);
    expect(
      stores.menus.some((m) => m.name === '部门管理' && m.path === '/system/dept'),
    ).toBe(true);
    expect(
      stores.menus.some((m) => m.name === '定时任务' && m.path === '/infra/job'),
    ).toBe(true);
    expect(stores.menus.find((m) => m.name === '定时任务')?.permissionCode).toBe(
      'infra:job:list',
    );
    expect(
      stores.menus.some((m) => m.name === '短信管理' && m.path === '/infra/sms'),
    ).toBe(true);
    expect(
      stores.menus.some((m) => m.name === '邮件管理' && m.path === '/infra/email'),
    ).toBe(true);
    expect(stores.menus.find((m) => m.name === '审计日志')?.sort).toBe(10);
    expect(stores.menus.some((m) => m.name === '内容管理')).toBe(false);
    expect(stores.menus.some((m) => m.name === '文章管理' && m.path === '/content/articles')).toBe(
      false,
    );
    expect(stores.menus.find((m) => m.name === '系统管理')?.icon).toBe('ri:settings-3-line');
    expect(stores.menus.find((m) => m.name === '用户管理')?.icon).toBe('ri:user-line');
    expect(stores.rolePermissions.length).toBe(85);
  });

  it('does not duplicate role-permission links on second run', async () => {
    process.env.NODE_ENV = 'development';
    const stores = emptyStores();
    const dataSource = createMockDataSource(stores);

    await runInitSeed(dataSource);
    await runInitSeed(dataSource);

    expect(stores.permissions.length).toBe(85);
    expect(stores.rolePermissions.length).toBe(85);
  });

  it('seeds dev sample articles in non-production', async () => {
    process.env.NODE_ENV = 'development';
    const stores = emptyStores();
    const dataSource = createMockDataSource(stores);

    await runInitSeed(dataSource);

    expect(stores.articles).toHaveLength(2);
    expect(stores.articles.some((a) => a.status === 1 && a.publishedAt)).toBe(true);
    expect(stores.articles.some((a) => a.status === 0 && !a.publishedAt)).toBe(true);
  });

  it('does not duplicate sample articles on second run', async () => {
    process.env.NODE_ENV = 'development';
    const stores = emptyStores();
    const dataSource = createMockDataSource(stores);

    await runInitSeed(dataSource);
    await runInitSeed(dataSource);

    expect(stores.articles).toHaveLength(2);
  });

  it('seeds dev sample dict types and data in non-production', async () => {
    process.env.NODE_ENV = 'development';
    const stores = emptyStores();
    const dataSource = createMockDataSource(stores);

    await runInitSeed(dataSource);

    expect(stores.dictTypes).toHaveLength(2);
    expect(stores.dictTypes.some((t) => t.code === 'user_status')).toBe(true);
    expect(stores.dictTypes.some((t) => t.code === 'article_status')).toBe(true);
    expect(stores.dictData).toHaveLength(4);

    const userStatusType = stores.dictTypes.find((t) => t.code === 'user_status');
    expect(
      stores.dictData.some(
        (d) => d.typeId === userStatusType?.id && d.label === '启用' && d.value === '1',
      ),
    ).toBe(true);
    expect(
      stores.dictData.some(
        (d) => d.typeId === userStatusType?.id && d.label === '禁用' && d.value === '0',
      ),
    ).toBe(true);

    const articleStatusType = stores.dictTypes.find((t) => t.code === 'article_status');
    expect(
      stores.dictData.some(
        (d) => d.typeId === articleStatusType?.id && d.value === 'draft',
      ),
    ).toBe(true);
    expect(
      stores.dictData.some(
        (d) => d.typeId === articleStatusType?.id && d.value === 'published',
      ),
    ).toBe(true);
  });

  it('does not duplicate sample dict data on second run', async () => {
    process.env.NODE_ENV = 'development';
    const stores = emptyStores();
    const dataSource = createMockDataSource(stores);

    await runInitSeed(dataSource);
    await runInitSeed(dataSource);

    expect(stores.dictTypes).toHaveLength(2);
    expect(stores.dictData).toHaveLength(4);
  });

  it('seeds dev sample site configs in non-production', async () => {
    process.env.NODE_ENV = 'development';
    const stores = emptyStores();
    const dataSource = createMockDataSource(stores);

    await runInitSeed(dataSource);

    expect(stores.siteConfigs).toHaveLength(8);
    expect(stores.siteConfigs.some((c) => c.configKey === 'site.name')).toBe(true);
    expect(stores.siteConfigs.find((c) => c.configKey === 'site.name')?.configValue).toBe(
      'Nova Stack',
    );
    expect(stores.siteConfigs.some((c) => c.configKey === 'site.logo')).toBe(true);
    expect(stores.siteConfigs.find((c) => c.configKey === 'site.logo')?.configValue).toBe(
      '/uploads/logo.png',
    );
    expect(stores.siteConfigs.some((c) => c.configKey === 'site.icp')).toBe(true);
    expect(stores.siteConfigs.find((c) => c.configKey === 'site.icp')?.configValue).toBe(
      '京ICP备00000000号',
    );
    expect(stores.siteConfigs.some((c) => c.configKey === 'data_scope.module.enabled')).toBe(
      true,
    );
  });

  it('does not duplicate sample site configs on second run', async () => {
    process.env.NODE_ENV = 'development';
    const stores = emptyStores();
    const dataSource = createMockDataSource(stores);

    await runInitSeed(dataSource);
    await runInitSeed(dataSource);

    expect(stores.siteConfigs).toHaveLength(8);
  });

  it('seeds china regions from flat json', async () => {
    process.env.NODE_ENV = 'development';
    const stores = emptyStores();
    const dataSource = createMockDataSource(stores);

    await runInitSeed(dataSource);

    expect(stores.regions.length).toBeGreaterThan(3000);
    expect(stores.regions.some((r) => r.name === '北京市' && r.level === 1)).toBe(true);
  });

  it('does not duplicate regions on second run', async () => {
    process.env.NODE_ENV = 'development';
    const stores = emptyStores();
    const dataSource = createMockDataSource(stores);

    await runInitSeed(dataSource);
    const countAfterFirst = stores.regions.length;
    await runInitSeed(dataSource);

    expect(stores.regions.length).toBe(countAfterFirst);
  });

  it('retires persisted content demo menus and does not recreate them', async () => {
    process.env.NODE_ENV = 'development';
    const stores = emptyStores();
    stores.menus.push(
      { id: '9000', name: '内容管理', parentId: '0', path: '/content', visible: 1, status: 1 } as SysMenuEntity,
      { id: '9001', name: '文章管理', parentId: '9000', path: '/content/articles', visible: 1, status: 1 } as SysMenuEntity,
    );
    const dataSource = createMockDataSource(stores);
    await runInitSeed(dataSource);
    await runInitSeed(dataSource);
    const retired = stores.menus.filter(menu => menu.path?.startsWith('/content'));
    expect(retired).toHaveLength(2);
    expect(retired.every(menu => menu.status === 0 && menu.visible === 0)).toBe(true);
  });

  it('skips default admin and dev member seeds in production', async () => {
    process.env.NODE_ENV = 'production';
    const stores = emptyStores();
    const dataSource = createMockDataSource(stores);

    await runInitSeed(dataSource);

    expect(stores.users).toHaveLength(0);
    expect(stores.userRoles).toHaveLength(0);
    expect(stores.members).toHaveLength(0);
    expect(stores.articles).toHaveLength(0);
    expect(stores.dictTypes).toHaveLength(0);
    expect(stores.dictData).toHaveLength(0);
    expect(stores.siteConfigs).toHaveLength(5);
    expect(stores.regions.length).toBeGreaterThan(3000);
    expect(bcrypt.hash).not.toHaveBeenCalled();

    expect(stores.roles.some((role) => role.code === 'super_admin')).toBe(true);
    expect(stores.permissions.length).toBe(85);
  });
});
