# 数据库迁移与连接配置

API/worker 使用同一套配置；生产默认 `APP_ROLE=api`，独立后台进程显式设置 `APP_ROLE=worker`。`all` 只允许开发/测试。每个生产项目必须显式指定独立数据库、非 root 用户、数据库密码、JWT 密钥、HTTPS CORS 来源、Redis 主机及项目/环境 key 前缀。生产拒绝 `SKIP_EXTERNAL_SERVICES=true` 和 `DB_SYNCHRONIZE=true`。开发也默认关闭自动同步；seed 只填充数据，不创建表。

连接预算：`DB_POOL_SIZE`（默认 10，范围 1–100）、`DB_CONNECT_TIMEOUT`（默认 10000 毫秒）、`DB_MAX_QUERY_EXECUTION_TIME`（默认 1000 毫秒）。最后一个是 TypeORM 的慢查询告警阈值，**不强制取消 SQL**；上线时应结合 MySQL 执行计划、服务端语句限制与容量测试配置实际查询期限。MySQL 等待队列最多 100 个连接请求；总连接预算需要乘 API/worker 实例数量。数据库日志只记录慢查询耗时/错误分类，不输出 SQL、绑定参数或驱动消息。

Redis 支持 `REDIS_DB`（0–15）、`REDIS_KEY_PREFIX`、可选 ACL `REDIS_USERNAME`/`REDIS_PASSWORD`、`REDIS_TLS=true`、`REDIS_CONNECT_TIMEOUT`、`REDIS_COMMAND_TIMEOUT`。默认连接/命令预算为 5000/3000 毫秒，命令离线队列关闭。生产 key 前缀必须显式指定且以 `:` 结尾，不能沿用 `nova:dev:`。TLS 使用系统信任校验；私有 CA 请通过 Node 标准 CA 配置分发。Redis 异常时保留重连客户端供 readiness 判断，避免以空客户端表示健康。

## 新空库

先创建独立库并授予应用用户 DDL 所需权限，按 `server/.env.project.example` 填写环境。生产推荐独立迁移用户执行 DDL、运行用户仅保留所需 DML 权限。以下命令在 `server` 执行：

```sh
pnpm exec ts-node src/database/tools/migrate.ts run
pnpm exec ts-node src/database/tools/migrate.ts check
pnpm seed
```

迁移文件固定为初始 29 张通用平台表与后续 `auth_session` 会话表。CLI 数据源为 `server/src/database/data-source.ts`，兼容 TypeORM `-d` 数据源参数。CLI 不自动同步、不自动 seed、不自动建库。MySQL DDL 隐式提交，迁移失败时应先核查已执行 DDL，禁止盲目重复执行或启用 synchronize 修复。

## 已有开发库基线

先备份并停止写入/结构变更。`baseline` 仅适用于**尚未登记迁移的原始 29 表结构**：读取并校验所有原始实体的列、索引、默认值及额外表；有漂移或迁移登记表已有记录时失败，且不写入迁移登记；已登记的库使用 run/check。校验成功后只登记 `InitialSchema1792972800000`，不执行建表、不修改业务行；它不会将后续会话迁移虚假标记完成。

```sh
pnpm exec ts-node src/database/tools/migrate.ts baseline
pnpm exec ts-node src/database/tools/migrate.ts run
pnpm exec ts-node src/database/tools/migrate.ts check
```

`check` 对全部当前实体做只读结构比对。已升级数据库直接运行 `run/check`，不重复执行原始基线。不同版本的旧库若有漂移，应单独审查并补齐迁移，不能删库或手工伪造迁移记录。

## 回滚

`revert` 回滚最后一次迁移；初始迁移的回滚会删除原始表及数据，会话迁移回滚会撤销所有会话。只有完成备份并明确接受影响后运行：

```sh
ALLOW_DESTRUCTIVE_MIGRATION_REVERT=true pnpm exec ts-node src/database/tools/migrate.ts revert
```

不要在保留数据的预览库上试跑回滚。迁移没有自动分布式执行锁，应由单一发布作业串行执行，API/worker 启动不运行迁移。

## 隔离验证

测试数据库名必须以 `nova_foundation_migration_test` 开头，测试会清空该**测试库**。先创建独立库并给测试用户授权，然后从仓库根执行：

```sh
TEST_MIGRATION_DATABASE=nova_foundation_migration_test TEST_REAL_REDIS=true pnpm --filter @nova/server exec jest --config test/jest-unit.json --watchman=false --runInBand test/database/migration.integration.spec.ts test/config
```

2026-10-26 已在本机 MySQL 8（127.0.0.1:13316）与 Redis（127.0.0.1:16389）验证：空库检测、两次迁移、两次回滚、重跑、列漂移拒绝、仅初始迁移的基线登记、已有 sentinel 行保留、增量会话表迁移、Redis key 前缀隔离。原 `nova_jks_preview` 先完成本地SQL备份，再核验原始29表、登记基线并应用auth_session增量迁移；最终schema check通过，没有删除原有表或业务行。认证/TLS 配置已接线，但本次本地服务未启用 ACL/TLS，未声称真实托管服务验收。
