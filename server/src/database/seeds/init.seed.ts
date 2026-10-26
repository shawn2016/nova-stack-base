import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
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
  SysJobEntity,
  SysSmsChannelEntity,
  SysSmsTemplateEntity,
  SysEmailChannelEntity,
  SysEmailTemplateEntity,
  SysRoleEntity,
  SysRolePermissionEntity,
  SysUserEntity,
  SysUserRoleEntity,
} from '../entities';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SUPER_ADMIN_ROLE_CODE = 'super_admin';
const ADMIN_USERNAME = 'admin';
const DEV_MEMBER_PHONE = '13800138000';

interface PermissionSeed {
  name: string;
  code: string;
  type: string;
}

interface MenuSeed {
  name: string;
  path: string | null;
  component: string | null;
  icon: string | null;
  type: string;
  permissionCode: string | null;
  sort: number;
  children?: MenuSeed[];
}

const PERMISSION_SEEDS: PermissionSeed[] = [
  { name: '用户列表', code: 'system:user:list', type: 'api' },
  { name: '用户新增', code: 'system:user:create', type: 'api' },
  { name: '用户编辑', code: 'system:user:update', type: 'api' },
  { name: '用户删除', code: 'system:user:delete', type: 'api' },
  { name: '角色列表', code: 'system:role:list', type: 'api' },
  { name: '角色新增', code: 'system:role:create', type: 'api' },
  { name: '角色编辑', code: 'system:role:update', type: 'api' },
  { name: '角色删除', code: 'system:role:delete', type: 'api' },
  { name: '菜单列表', code: 'system:menu:list', type: 'api' },
  { name: '菜单新增', code: 'system:menu:create', type: 'api' },
  { name: '菜单编辑', code: 'system:menu:update', type: 'api' },
  { name: '菜单删除', code: 'system:menu:delete', type: 'api' },
  { name: '文章列表', code: 'content:article:list', type: 'api' },
  { name: '文章查看', code: 'content:article:view', type: 'api' },
  { name: '文章新增', code: 'content:article:create', type: 'api' },
  { name: '文章编辑', code: 'content:article:update', type: 'api' },
  { name: '文章删除', code: 'content:article:delete', type: 'api' },
  { name: '文章发布', code: 'content:article:publish', type: 'api' },
  { name: '字典类型列表', code: 'system:dict:type:list', type: 'api' },
  { name: '字典类型新增', code: 'system:dict:type:create', type: 'api' },
  { name: '字典类型编辑', code: 'system:dict:type:update', type: 'api' },
  { name: '字典类型删除', code: 'system:dict:type:delete', type: 'api' },
  { name: '字典数据列表', code: 'system:dict:data:list', type: 'api' },
  { name: '字典数据新增', code: 'system:dict:data:create', type: 'api' },
  { name: '字典数据编辑', code: 'system:dict:data:update', type: 'api' },
  { name: '字典数据删除', code: 'system:dict:data:delete', type: 'api' },
  { name: '站点配置列表', code: 'system:config:list', type: 'api' },
  { name: '站点配置新增', code: 'system:config:create', type: 'api' },
  { name: '站点配置编辑', code: 'system:config:update', type: 'api' },
  { name: '站点配置删除', code: 'system:config:delete', type: 'api' },
  { name: '登录日志列表', code: 'system:audit:login:list', type: 'api' },
  { name: '操作日志列表', code: 'system:audit:oper:list', type: 'api' },
  { name: '文件上传', code: 'system:file:upload', type: 'api' },
  { name: '文件列表', code: 'system:file:list', type: 'api' },
  { name: '文件删除', code: 'system:file:delete', type: 'api' },
  { name: '文件存储配置', code: 'system:file:settings', type: 'api' },
  { name: '地区列表', code: 'system:region:list', type: 'api' },
  { name: '地区新增', code: 'system:region:create', type: 'api' },
  { name: '地区编辑', code: 'system:region:update', type: 'api' },
  { name: '地区删除', code: 'system:region:delete', type: 'api' },
  { name: '通知列表', code: 'system:notice:list', type: 'api' },
  { name: '通知新增', code: 'system:notice:create', type: 'api' },
  { name: '通知编辑', code: 'system:notice:update', type: 'api' },
  { name: '通知删除', code: 'system:notice:delete', type: 'api' },
  { name: '通知发布', code: 'system:notice:publish', type: 'api' },
  { name: '消息列表', code: 'system:message:list', type: 'api' },
  { name: '消息发送', code: 'system:message:send', type: 'api' },
  { name: '消息删除', code: 'system:message:delete', type: 'api' },
  { name: '部门列表', code: 'system:dept:list', type: 'api' },
  { name: '部门新增', code: 'system:dept:create', type: 'api' },
  { name: '部门编辑', code: 'system:dept:update', type: 'api' },
  { name: '部门删除', code: 'system:dept:delete', type: 'api' },
  { name: '部门功能开关', code: 'system:dept:settings', type: 'api' },
  { name: '在线用户列表', code: 'system:session:list', type: 'api' },
  { name: '在线用户踢下线', code: 'system:session:kick', type: 'api' },
  { name: '定时任务列表', code: 'infra:job:list', type: 'api' },
  { name: '定时任务新增', code: 'infra:job:create', type: 'api' },
  { name: '定时任务编辑', code: 'infra:job:update', type: 'api' },
  { name: '定时任务删除', code: 'infra:job:delete', type: 'api' },
  { name: '定时任务执行', code: 'infra:job:run', type: 'api' },
  { name: '定时任务日志', code: 'infra:job:log:list', type: 'api' },
  { name: '短信通道列表', code: 'infra:sms:channel:list', type: 'api' },
  { name: '短信通道新增', code: 'infra:sms:channel:create', type: 'api' },
  { name: '短信通道编辑', code: 'infra:sms:channel:update', type: 'api' },
  { name: '短信通道删除', code: 'infra:sms:channel:delete', type: 'api' },
  { name: '短信模板列表', code: 'infra:sms:template:list', type: 'api' },
  { name: '短信模板新增', code: 'infra:sms:template:create', type: 'api' },
  { name: '短信模板编辑', code: 'infra:sms:template:update', type: 'api' },
  { name: '短信模板删除', code: 'infra:sms:template:delete', type: 'api' },
  { name: '短信日志列表', code: 'infra:sms:log:list', type: 'api' },
  { name: '短信测试发送', code: 'infra:sms:send', type: 'api' },
  { name: '邮件通道列表', code: 'infra:email:channel:list', type: 'api' },
  { name: '邮件通道新增', code: 'infra:email:channel:create', type: 'api' },
  { name: '邮件通道编辑', code: 'infra:email:channel:update', type: 'api' },
  { name: '邮件通道删除', code: 'infra:email:channel:delete', type: 'api' },
  { name: '邮件模板列表', code: 'infra:email:template:list', type: 'api' },
  { name: '邮件模板新增', code: 'infra:email:template:create', type: 'api' },
  { name: '邮件模板编辑', code: 'infra:email:template:update', type: 'api' },
  { name: '邮件模板删除', code: 'infra:email:template:delete', type: 'api' },
  { name: '邮件日志列表', code: 'infra:email:log:list', type: 'api' },
  { name: '邮件测试发送', code: 'infra:email:send', type: 'api' },
  { name: 'IP黑名单列表', code: 'security:ip-blacklist:list', type: 'api' },
  { name: 'IP黑名单新增', code: 'security:ip-blacklist:create', type: 'api' },
  { name: 'IP黑名单删除', code: 'security:ip-blacklist:delete', type: 'api' },
  { name: 'IP黑名单更新', code: 'security:ip-blacklist:update', type: 'api' },
];

const MENU_SEEDS: MenuSeed[] = [
  {
    name: '系统管理',
    path: '/system',
    component: null,
    icon: 'ri:settings-3-line',
    type: 'directory',
    permissionCode: null,
    sort: 1,
    children: [
      {
        name: '用户管理',
        path: '/system/user',
        component: 'views/system/user/index',
        icon: 'ri:user-line',
        type: 'menu',
        permissionCode: 'system:user:list',
        sort: 1,
      },
      {
        name: '角色管理',
        path: '/system/role',
        component: 'views/system/role/index',
        icon: 'ri:shield-user-line',
        type: 'menu',
        permissionCode: 'system:role:list',
        sort: 2,
      },
      {
        name: '菜单管理',
        path: '/system/menu',
        component: 'views/system/menu/index',
        icon: 'ri:menu-line',
        type: 'menu',
        permissionCode: 'system:menu:list',
        sort: 3,
      },
      {
        name: '字典管理',
        path: '/system/dict',
        component: 'views/system/dict/index',
        icon: 'ri:book-2-line',
        type: 'menu',
        permissionCode: 'system:dict:type:list',
        sort: 4,
      },
      {
        name: '地区管理',
        path: '/system/region',
        component: 'views/system/region/index',
        icon: 'ri:map-pin-line',
        type: 'menu',
        permissionCode: 'system:region:list',
        sort: 5,
      },
      {
        name: '通知公告',
        path: '/system/notice',
        component: 'views/system/notice/index',
        icon: 'ri:notification-3-line',
        type: 'menu',
        permissionCode: 'system:notice:list',
        sort: 6,
      },
      {
        name: '消息中心',
        path: '/system/message',
        component: 'views/system/message/index',
        icon: 'ri:mail-line',
        type: 'menu',
        permissionCode: 'system:message:list',
        sort: 7,
      },
      {
        name: '部门管理',
        path: '/system/dept',
        component: 'views/system/dept/index',
        icon: 'ri:organization-chart',
        type: 'menu',
        permissionCode: 'system:dept:list',
        sort: 8,
      },
      {
        name: '站点配置',
        path: '/system/site-config',
        component: 'views/system/site-config/index',
        icon: 'ri:global-line',
        type: 'menu',
        permissionCode: 'system:config:list',
        sort: 9,
      },
      {
        name: '审计日志',
        path: '/system/audit-logs',
        component: 'views/system/audit-logs/index',
        icon: 'ri:file-list-3-line',
        type: 'menu',
        permissionCode: 'system:audit:login:list',
        sort: 10,
      },
      {
        name: '在线用户',
        path: '/system/online-session',
        component: 'views/system/online-session/index',
        icon: 'ri:user-follow-line',
        type: 'menu',
        permissionCode: 'system:session:list',
        sort: 11,
      },
      {
        name: 'IP黑名单',
        path: '/system/ip-blacklist',
        component: 'views/system/ip-blacklist/index',
        icon: 'ri:shield-keyhole-line',
        type: 'menu',
        permissionCode: 'security:ip-blacklist:list',
        sort: 12,
      },
      {
        name: '文件管理',
        path: '/system/file',
        component: 'views/system/file/index',
        icon: 'ri:folder-image-line',
        type: 'menu',
        permissionCode: 'system:file:list',
        sort: 13,
      },
    ],
  },
  {
    name: '基础设施',
    path: '/infra',
    component: null,
    icon: 'ri:tools-line',
    type: 'directory',
    permissionCode: null,
    sort: 3,
    children: [
      {
        name: '定时任务',
        path: '/infra/job',
        component: 'views/infra/job/index',
        icon: 'ri:timer-line',
        type: 'menu',
        permissionCode: 'infra:job:list',
        sort: 1,
      },
      {
        name: '短信管理',
        path: '/infra/sms',
        component: 'views/infra/sms/index',
        icon: 'ri:message-2-line',
        type: 'menu',
        permissionCode: 'infra:sms:channel:list',
        sort: 2,
      },
      {
        name: '邮件管理',
        path: '/infra/email',
        component: 'views/infra/email/index',
        icon: 'ri:mail-send-line',
        type: 'menu',
        permissionCode: 'infra:email:channel:list',
        sort: 3,
      },
    ],
  },
];

async function upsertPermission(
  repo: Repository<SysPermissionEntity>,
  seed: PermissionSeed,
): Promise<SysPermissionEntity> {
  let permission = await repo.findOne({ where: { code: seed.code } });
  if (!permission) {
    permission = repo.create(seed);
  } else {
    permission.name = seed.name;
    permission.type = seed.type;
  }
  return repo.save(permission);
}

async function upsertMenuTree(
  repo: Repository<SysMenuEntity>,
  seeds: MenuSeed[],
  parentId = '0',
): Promise<void> {
  for (const seed of seeds) {
    let menu = await repo.findOne({
      where: { name: seed.name, parentId },
    });

    if (!menu) {
      menu = repo.create({
        parentId,
        name: seed.name,
        path: seed.path,
        component: seed.component,
        icon: seed.icon,
        type: seed.type,
        permissionCode: seed.permissionCode,
        sort: seed.sort,
        visible: 1,
        status: 1,
      });
    } else {
      menu.path = seed.path;
      menu.component = seed.component;
      menu.icon = seed.icon;
      menu.type = seed.type;
      menu.permissionCode = seed.permissionCode;
      menu.sort = seed.sort;
      menu.visible = 1;
      menu.status = 1;
    }

    menu = await repo.save(menu);

    if (seed.children?.length) {
      await upsertMenuTree(repo, seed.children, menu.id);
    }
  }
}

interface ArticleSeed {
  title: string;
  summary: string;
  content: string;
  coverUrl: string | null;
  status: number;
  publishedAt: Date | null;
}

const DEV_ARTICLE_SEEDS: ArticleSeed[] = [
  {
    title: '欢迎使用 Nova Stack',
    summary: '这是一篇已发布的示例文章',
    content: '欢迎使用 Nova Stack 内容管理模块。',
    coverUrl: null,
    status: 1,
    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    title: '草稿示例文章',
    summary: '这是一篇草稿状态的示例文章',
    content: '该文章尚未发布，仅供开发环境测试。',
    coverUrl: null,
    status: 0,
    publishedAt: null,
  },
];

interface DictTypeSeed {
  name: string;
  code: string;
  status: number;
  remark?: string | null;
}

interface DictDataSeed {
  typeCode: string;
  label: string;
  value: string;
  sort: number;
  status: number;
}

const DEV_DICT_TYPE_SEEDS: DictTypeSeed[] = [
  { name: '用户状态', code: 'user_status', status: 1, remark: '用户启用/禁用' },
  { name: '文章状态', code: 'article_status', status: 1, remark: '文章发布状态' },
];

interface SiteConfigSeed {
  configKey: string;
  configName: string;
  configValue: string;
  configGroup?: string | null;
  remark?: string | null;
}

const DEV_SITE_CONFIG_SEEDS: SiteConfigSeed[] = [
  {
    configKey: 'site.name',
    configName: '站点名称',
    configValue: 'Nova Stack',
    configGroup: 'site',
  },
  {
    configKey: 'site.logo',
    configName: '站点 Logo',
    configValue: '/uploads/logo.png',
    configGroup: 'site',
  },
  {
    configKey: 'site.icp',
    configName: '备案号',
    configValue: '京ICP备00000000号',
    configGroup: 'site',
    remark: '占位备案号',
  },
];

const DEV_DICT_DATA_SEEDS: DictDataSeed[] = [
  { typeCode: 'user_status', label: '启用', value: '1', sort: 1, status: 1 },
  { typeCode: 'user_status', label: '禁用', value: '0', sort: 2, status: 1 },
  { typeCode: 'article_status', label: '草稿', value: 'draft', sort: 1, status: 1 },
  { typeCode: 'article_status', label: '已发布', value: 'published', sort: 2, status: 1 },
];

const DEV_ONLINE_SESSION_CONFIG_SEEDS: SiteConfigSeed[] = [
  {
    configKey: 'online_session.module.enabled',
    configName: '在线用户模块开关',
    configValue: 'true',
    configGroup: 'online_session',
  },
];

const DEV_DATA_SCOPE_CONFIG_SEEDS: SiteConfigSeed[] = [
  {
    configKey: 'data_scope.module.enabled',
    configName: '数据权限模块开关',
    configValue: 'true',
    configGroup: 'data_scope',
  },
];

const DEV_DEPT_CONFIG_SEEDS: SiteConfigSeed[] = [
  {
    configKey: 'dept.module.enabled',
    configName: '部门模块总开关',
    configValue: 'true',
    configGroup: 'dept',
  },
  {
    configKey: 'dept.user_binding.enabled',
    configName: '用户部门绑定开关',
    configValue: 'true',
    configGroup: 'dept',
  },
];

const DEV_UPLOAD_CONFIG_SEEDS: SiteConfigSeed[] = [
  {
    configKey: 'upload.storage.provider',
    configName: '存储提供商',
    configValue: 'local',
    configGroup: 'upload',
  },
];

interface DeptSeed {
  name: string;
  parentName?: string;
  sort: number;
  leader?: string | null;
  status?: number;
}

const DEV_DEPT_SEEDS: DeptSeed[] = [
  { name: '总公司', sort: 0, leader: '管理员' },
  { name: '研发部', parentName: '总公司', sort: 1 },
  { name: '运营部', parentName: '总公司', sort: 2 },
];

async function upsertDevOnlineSessionConfigs(repo: Repository<SysConfigEntity>): Promise<void> {
  for (const seed of DEV_ONLINE_SESSION_CONFIG_SEEDS) {
    let config = await repo.findOne({ where: { configKey: seed.configKey } });
    if (!config) {
      config = repo.create({
        configKey: seed.configKey,
        configName: seed.configName,
        configValue: seed.configValue,
        configGroup: seed.configGroup ?? null,
        remark: seed.remark ?? null,
      });
    } else {
      config.configName = seed.configName;
      config.configValue = seed.configValue;
      config.configGroup = seed.configGroup ?? null;
      config.remark = seed.remark ?? null;
    }
    await repo.save(config);
  }
}

async function upsertDevDataScopeConfigs(repo: Repository<SysConfigEntity>): Promise<void> {
  for (const seed of DEV_DATA_SCOPE_CONFIG_SEEDS) {
    let config = await repo.findOne({ where: { configKey: seed.configKey } });
    if (!config) {
      config = repo.create({
        configKey: seed.configKey,
        configName: seed.configName,
        configValue: seed.configValue,
        configGroup: seed.configGroup ?? null,
        remark: seed.remark ?? null,
      });
    } else {
      config.configName = seed.configName;
      config.configValue = seed.configValue;
      config.configGroup = seed.configGroup ?? null;
      config.remark = seed.remark ?? null;
    }
    await repo.save(config);
  }
}

async function upsertDevDeptConfigs(repo: Repository<SysConfigEntity>): Promise<void> {
  for (const seed of DEV_DEPT_CONFIG_SEEDS) {
    let config = await repo.findOne({ where: { configKey: seed.configKey } });
    if (!config) {
      config = repo.create({
        configKey: seed.configKey,
        configName: seed.configName,
        configValue: seed.configValue,
        configGroup: seed.configGroup ?? null,
        remark: seed.remark ?? null,
      });
    } else {
      config.configName = seed.configName;
      config.configValue = seed.configValue;
      config.configGroup = seed.configGroup ?? null;
      config.remark = seed.remark ?? null;
    }
    await repo.save(config);
  }
}

async function upsertDevUploadConfigs(repo: Repository<SysConfigEntity>): Promise<void> {
  for (const seed of DEV_UPLOAD_CONFIG_SEEDS) {
    const exists = await repo.findOne({ where: { configKey: seed.configKey } });
    if (exists) {
      continue;
    }
    await repo.save(
      repo.create({
        configKey: seed.configKey,
        configName: seed.configName,
        configValue: seed.configValue,
        configGroup: seed.configGroup ?? null,
        remark: seed.remark ?? null,
      }),
    );
  }
}

async function upsertDevDepts(repo: Repository<SysDeptEntity>): Promise<Map<string, string>> {
  const nameToId = new Map<string, string>();

  for (const seed of DEV_DEPT_SEEDS) {
    const parentId = seed.parentName ? (nameToId.get(seed.parentName) ?? '0') : '0';

    let dept = await repo.findOne({ where: { name: seed.name, parentId } });
    if (!dept) {
      dept = repo.create({
        parentId,
        name: seed.name,
        sort: seed.sort,
        leader: seed.leader ?? null,
        phone: null,
        status: seed.status ?? 1,
      });
    } else {
      dept.sort = seed.sort;
      dept.leader = seed.leader ?? null;
      dept.status = seed.status ?? 1;
    }
    dept = await repo.save(dept);
    nameToId.set(seed.name, dept.id);
  }

  return nameToId;
}

async function upsertDevSiteConfigs(repo: Repository<SysConfigEntity>): Promise<void> {
  for (const seed of DEV_SITE_CONFIG_SEEDS) {
    let config = await repo.findOne({ where: { configKey: seed.configKey } });
    if (!config) {
      config = repo.create({
        configKey: seed.configKey,
        configName: seed.configName,
        configValue: seed.configValue,
        configGroup: seed.configGroup ?? null,
        remark: seed.remark ?? null,
      });
    } else {
      config.configName = seed.configName;
      config.configValue = seed.configValue;
      config.configGroup = seed.configGroup ?? null;
      config.remark = seed.remark ?? null;
    }
    await repo.save(config);
  }
}

interface RegionFlatSeed {
  code: string;
  name: string;
  parentCode: string;
  level: 1 | 2 | 3;
  sort: number;
}

async function upsertRegions(repo: Repository<SysRegionEntity>): Promise<void> {
  const filePath = join(__dirname, 'data/china-regions.flat.json');
  const seeds = JSON.parse(readFileSync(filePath, 'utf-8')) as RegionFlatSeed[];
  seeds.sort((a, b) => a.level - b.level || a.sort - b.sort);

  const codeToId = new Map<string, string>();
  codeToId.set('0', '0');

  for (const seed of seeds) {
    const parentId = codeToId.get(seed.parentCode) ?? '0';
    let region = await repo.findOne({ where: { code: seed.code } });
    if (!region) {
      region = repo.create({
        parentId,
        name: seed.name,
        code: seed.code,
        level: seed.level,
        sort: seed.sort,
        status: 1,
      });
    } else {
      region.parentId = parentId;
      region.name = seed.name;
      region.level = seed.level;
      region.sort = seed.sort;
    }
    region = await repo.save(region);
    codeToId.set(seed.code, region.id);
  }
}

async function upsertDevNotices(
  noticeRepo: Repository<SysNoticeEntity>,
  messageRepo: Repository<SysMessageEntity>,
  adminUserId: string,
): Promise<void> {
  let draft = await noticeRepo.findOne({ where: { title: 'Dev 草稿公告' } });
  if (!draft) {
    draft = await noticeRepo.save(
      noticeRepo.create({
        title: 'Dev 草稿公告',
        content: '这是一条开发环境草稿公告',
        type: 1,
        status: 0,
        publisherId: adminUserId,
        publishedAt: null,
      }),
    );
  }

  let published = await noticeRepo.findOne({ where: { title: 'Dev 已发布公告' } });
  if (!published) {
    published = await noticeRepo.save(
      noticeRepo.create({
        title: 'Dev 已发布公告',
        content: '欢迎登录 Nova Stack 管理后台',
        type: 2,
        status: 1,
        publisherId: adminUserId,
        publishedAt: new Date(),
      }),
    );
  }

  const message = await messageRepo.findOne({ where: { title: 'Dev 欢迎消息' } });
  if (!message) {
    await messageRepo.save(
      messageRepo.create({
        senderId: adminUserId,
        receiverId: adminUserId,
        title: 'Dev 欢迎消息',
        content: 'seed 示例站内消息',
        isRead: 0,
        readAt: null,
      }),
    );
  }
}

async function upsertDevDicts(
  typeRepo: Repository<SysDictTypeEntity>,
  dataRepo: Repository<SysDictDataEntity>,
): Promise<void> {
  const typeByCode = new Map<string, SysDictTypeEntity>();

  for (const seed of DEV_DICT_TYPE_SEEDS) {
    let dictType = await typeRepo.findOne({ where: { code: seed.code } });
    if (!dictType) {
      dictType = typeRepo.create({
        name: seed.name,
        code: seed.code,
        status: seed.status,
        remark: seed.remark ?? null,
      });
    } else {
      dictType.name = seed.name;
      dictType.status = seed.status;
      dictType.remark = seed.remark ?? null;
    }
    dictType = await typeRepo.save(dictType);
    typeByCode.set(seed.code, dictType);
  }

  for (const seed of DEV_DICT_DATA_SEEDS) {
    const dictType = typeByCode.get(seed.typeCode);
    if (!dictType) {
      continue;
    }

    let dictData = await dataRepo.findOne({
      where: { typeId: dictType.id, value: seed.value },
    });
    if (!dictData) {
      dictData = dataRepo.create({
        typeId: dictType.id,
        label: seed.label,
        value: seed.value,
        sort: seed.sort,
        status: seed.status,
        remark: null,
      });
    } else {
      dictData.label = seed.label;
      dictData.sort = seed.sort;
      dictData.status = seed.status;
    }
    await dataRepo.save(dictData);
  }
}

async function upsertDevArticles(repo: Repository<ArticleEntity>, authorId: string): Promise<void> {
  for (const seed of DEV_ARTICLE_SEEDS) {
    let article = await repo.findOne({ where: { title: seed.title } });
    if (!article) {
      article = repo.create({
        title: seed.title,
        summary: seed.summary,
        content: seed.content,
        coverUrl: seed.coverUrl,
        status: seed.status,
        authorId,
        publishedAt: seed.publishedAt,
      });
    } else {
      article.summary = seed.summary;
      article.content = seed.content;
      article.coverUrl = seed.coverUrl;
      article.status = seed.status;
      article.authorId = authorId;
      article.publishedAt = seed.publishedAt;
    }
    await repo.save(article);
  }
}

async function upsertDevJobs(repo: Repository<SysJobEntity>): Promise<void> {
  const job = await repo.findOne({ where: { name: 'Demo 心跳' } });
  if (!job) {
    await repo.save(
      repo.create({
        name: 'Demo 心跳',
        jobGroup: 'default',
        invokeTarget: 'demo.heartbeat',
        cronExpression: '0 */6 * * *',
        status: 0,
        concurrent: 0,
        remark: 'seed 示例任务（默认暂停）',
      }),
    );
  }
}

async function upsertDevSms(
  channelRepo: Repository<SysSmsChannelEntity>,
  templateRepo: Repository<SysSmsTemplateEntity>,
): Promise<void> {
  let channel = await channelRepo.findOne({ where: { name: 'Mock 通道' } });
  if (!channel) {
    channel = await channelRepo.save(
      channelRepo.create({
        name: 'Mock 通道',
        provider: 'mock',
        config: '{}',
        status: 1,
        remark: 'seed 示例短信通道',
      }),
    );
  }

  const template = await templateRepo.findOne({ where: { code: 'login_code' } });
  if (!template) {
    await templateRepo.save(
      templateRepo.create({
        code: 'login_code',
        name: '登录验证码',
        content: '您的验证码是{code}，5分钟内有效',
        channelId: channel.id,
        status: 1,
        remark: 'seed 示例模板',
      }),
    );
  }
}

async function upsertDevEmail(
  channelRepo: Repository<SysEmailChannelEntity>,
  templateRepo: Repository<SysEmailTemplateEntity>,
): Promise<void> {
  let channel = await channelRepo.findOne({ where: { name: 'Mock 通道' } });
  if (!channel) {
    channel = await channelRepo.save(
      channelRepo.create({
        name: 'Mock 通道',
        provider: 'mock',
        config: '{}',
        status: 1,
        remark: 'seed 示例邮件通道',
      }),
    );
  }

  const template = await templateRepo.findOne({ where: { code: 'welcome' } });
  if (!template) {
    await templateRepo.save(
      templateRepo.create({
        code: 'welcome',
        name: '欢迎邮件',
        subject: '欢迎加入 {siteName}',
        content: '您好，欢迎加入 {siteName}！',
        channelId: channel.id,
        status: 1,
        remark: 'seed 示例模板',
      }),
    );
  }
}

/** 初始化 RBAC 与开发会员 seed 数据（幂等） */
export async function runInitSeed(dataSource: DataSource): Promise<void> {
  const roleRepo = dataSource.getRepository(SysRoleEntity);
  const permissionRepo = dataSource.getRepository(SysPermissionEntity);
  const menuRepo = dataSource.getRepository(SysMenuEntity);
  const userRepo = dataSource.getRepository(SysUserEntity);
  const userRoleRepo = dataSource.getRepository(SysUserRoleEntity);
  const rolePermissionRepo = dataSource.getRepository(SysRolePermissionEntity);
  const memberRepo = dataSource.getRepository(MemberUserEntity);
  const articleRepo = dataSource.getRepository(ArticleEntity);
  const dictTypeRepo = dataSource.getRepository(SysDictTypeEntity);
  const dictDataRepo = dataSource.getRepository(SysDictDataEntity);
  const configRepo = dataSource.getRepository(SysConfigEntity);
  const regionRepo = dataSource.getRepository(SysRegionEntity);
  const noticeRepo = dataSource.getRepository(SysNoticeEntity);
  const messageRepo = dataSource.getRepository(SysMessageEntity);
  const deptRepo = dataSource.getRepository(SysDeptEntity);
  const jobRepo = dataSource.getRepository(SysJobEntity);
  const smsChannelRepo = dataSource.getRepository(SysSmsChannelEntity);
  const smsTemplateRepo = dataSource.getRepository(SysSmsTemplateEntity);
  const emailChannelRepo = dataSource.getRepository(SysEmailChannelEntity);
  const emailTemplateRepo = dataSource.getRepository(SysEmailTemplateEntity);

  let superAdminRole = await roleRepo.findOne({
    where: { code: SUPER_ADMIN_ROLE_CODE },
  });
  if (!superAdminRole) {
    superAdminRole = await roleRepo.save(
      roleRepo.create({
        name: '超级管理员',
        code: SUPER_ADMIN_ROLE_CODE,
        status: 1,
        sort: 0,
        dataScope: 1,
      }),
    );
  } else if (superAdminRole.dataScope !== 1) {
    superAdminRole.dataScope = 1;
    superAdminRole = await roleRepo.save(superAdminRole);
  }

  const permissions: SysPermissionEntity[] = [];
  for (const seed of PERMISSION_SEEDS) {
    permissions.push(await upsertPermission(permissionRepo, seed));
  }

  // 退役旧基座演示菜单；保留记录，重跑 seed 也不会重新开启。
  for (const path of ['/content', '/content/articles']) {
    const retiredMenu = await menuRepo.findOne({ where: { path } });
    if (retiredMenu) {
      retiredMenu.visible = 0;
      retiredMenu.status = 0;
      await menuRepo.save(retiredMenu);
    }
  }
  await upsertMenuTree(menuRepo, MENU_SEEDS);

  for (const permission of permissions) {
    const exists = await rolePermissionRepo.findOne({
      where: { roleId: superAdminRole.id, permissionId: permission.id },
    });
    if (!exists) {
      await rolePermissionRepo.save(
        rolePermissionRepo.create({
          roleId: superAdminRole.id,
          permissionId: permission.id,
        }),
      );
    }
  }

  await upsertRegions(regionRepo);
  await upsertDevOnlineSessionConfigs(configRepo);
  await upsertDevDataScopeConfigs(configRepo);
  await upsertDevDeptConfigs(configRepo);
  await upsertDevUploadConfigs(configRepo);
  const deptNameToId = await upsertDevDepts(deptRepo);
  await upsertDevJobs(jobRepo);
  await upsertDevSms(smsChannelRepo, smsTemplateRepo);
  await upsertDevEmail(emailChannelRepo, emailTemplateRepo);

  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';

  // 默认 admin/admin123 与开发会员仅在非 production 写入，避免生产环境硬编码凭据
  if (!isProduction) {
    let adminUser = await userRepo.findOne({ where: { username: ADMIN_USERNAME } });
    if (!adminUser) {
      adminUser = await userRepo.save(
        userRepo.create({
          username: ADMIN_USERNAME,
          passwordHash: await bcrypt.hash('admin123', 10),
          nickname: '超级管理员',
          avatar: null,
          status: 1,
        }),
      );
    }

    const adminRoleLink = await userRoleRepo.findOne({
      where: { userId: adminUser.id, roleId: superAdminRole.id },
    });
    if (!adminRoleLink) {
      await userRoleRepo.save(
        userRoleRepo.create({
          userId: adminUser.id,
          roleId: superAdminRole.id,
        }),
      );
    }

    const rootDeptId = deptNameToId.get('总公司');
    if (rootDeptId && !adminUser.deptId) {
      adminUser.deptId = rootDeptId;
      await userRepo.save(adminUser);
    }

    const member = await memberRepo.findOne({ where: { phone: DEV_MEMBER_PHONE } });
    if (!member) {
      await memberRepo.save(
        memberRepo.create({
          phone: DEV_MEMBER_PHONE,
          passwordHash: await bcrypt.hash('member123', 10),
          nickname: '测试会员',
          avatar: null,
          status: 1,
        }),
      );
    }

    await upsertDevArticles(articleRepo, adminUser.id);
    await upsertDevDicts(dictTypeRepo, dictDataRepo);
    await upsertDevSiteConfigs(configRepo);
    await upsertDevNotices(noticeRepo, messageRepo, adminUser.id);
  }
}
