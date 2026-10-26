import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from '../data-source-options';
import { runInitSeed } from './init.seed';

loadEnv({ path: resolve(__dirname, '../../../.env') });

/**
 * Seed 入口（pnpm seed / 根目录 pnpm seed）
 *
 * - 始终写入：super_admin 角色、基础 permissions/menus、角色-权限关联
 * - 仅非 production（NODE_ENV !== 'production'）：
 *   - 默认管理员 admin/admin123 + super_admin 绑定
 *   - 开发会员 13800138000/member123
 * - production 不写入任何默认凭据；请通过运维流程创建首个管理员
 */
function buildDataSource(): DataSource {
  return new DataSource(createDatabaseOptions());
}

async function main(): Promise<void> {
  if (process.env.SKIP_SEED === 'true') {
    console.log('[seed] SKIP_SEED=true，已跳过');
    return;
  }

  const dataSource = buildDataSource();
  const isProduction = (process.env.NODE_ENV ?? 'development') === 'production';

  try {
    await dataSource.initialize();
    await runInitSeed(dataSource);
    console.log('[seed] RBAC 骨架完成：super_admin、permissions、menus');
    if (!isProduction) {
      console.log('[seed] 开发账号：admin/admin123、13800138000/member123');
    } else {
      console.log('[seed] production 模式：已跳过默认 admin/会员凭据');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[seed] 失败：无法连接 MySQL 或执行 seed');
    console.error(`[seed] ${message}`);
    console.error(
      '[seed] 请确认 MySQL 已启动，并在 server/.env 中配置 DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_DATABASE',
    );
    console.error('[seed] 临时跳过可设置 SKIP_SEED=true');
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void main();
