# nova-stack-base

基于 pnpm monorepo 的全栈多端 **脚手架**：NestJS 后端 + Vue3 Admin + uni-app C 端，共享类型包 `@nova/shared-types`。

> **从本仓库创建业务项目、环境隔离、单向同步脚手架更新** → 见 **[SCAFFOLD.md](./SCAFFOLD.md)**  
> GitHub：**Use this template** 生成新项目（不要 Fork 自己的仓库）。

## Monorepo 结构

| 路径 | 包名 | 说明 |
|------|------|------|
| `server/` | `@nova/server` | NestJS API、TypeORM、JWT/RBAC |
| `admin/` | `@nova/admin` | Vue3 + Vite 管理后台 |
| `uni-app/` | `@nova/uni-app` | uni-app H5/小程序 |
| `packages/shared-types/` | `@nova/shared-types` | 三端共享 TypeScript 类型 |

## 前置依赖

| 依赖 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | 24.x（.nvmrc 固定 24.14.0） | 运行时 |
| pnpm | 9.15.0 | 包管理与 workspace |
| MySQL | 8.x | 后端数据库 |
| Redis | 7+ | 会话、限流、缓存和持久任务 |

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动基础设施（可选）

使用 Docker Compose 启动 MySQL 8 与 Redis 7：

```bash
docker compose up -d
```

默认映射：`3306`（MySQL）、`6379`（Redis），数据库名 `nova_stack`。

### 3. 配置环境变量

```bash
cp server/.env.example server/.env
cp admin/.env.example admin/.env
cp uni-app/.env.example uni-app/.env   # 如需 C 端
```

**关键配置：**

- 后端 `PORT=3001`，全局 API 前缀 `/api`（Swagger：`/api/docs`）
- Admin 开发环境 `VITE_API_BASE_URL=/api`，Vite 仅代理 `/api` → `http://localhost:3001`
- `CORS_ORIGINS` 需包含 Admin 开发地址（默认 `http://localhost:5173`）

> 默认关闭自动同步。新库先运行 `pnpm --filter @nova/server migration:run`；已有库按[数据库迁移说明](docs/operations/production-foundation-database.md)核验后建立基线。开发临时库才可显式开启 `DB_SYNCHRONIZE=true`，生产禁止。

### 4. 初始化数据

```bash
pnpm seed
```

### 5. 启动开发服务

```bash
# shared-types watch + server + admin
pnpm dev

# 含 uni-app H5
pnpm dev:all
```

| 服务 | 地址 |
|------|------|
| Admin | http://localhost:5173 |
| API | http://localhost:3001/api |
| Swagger | http://localhost:3001/api/docs |

### 本地账号（seed 后）

| 端 | 账号 | 密码 |
|----|------|------|
| Admin | `admin` | `admin123` |
| 会员 | `13800138000` | `member123` |

## 常用命令

```bash
pnpm build          # 构建全部 workspace 包
pnpm test           # shared-types + server 单测/API e2e + 两端登录刷新测试
pnpm test:clients   # Admin / uni-app 登录刷新回归测试
pnpm typecheck      # 全工作区类型检查（含 Admin 与 uni-app）
pnpm seed           # 初始化 RBAC 与示例数据
pnpm lint           # ESLint（三端与共享类型，零 warning）
pnpm format:check   # 只检查源码格式
pnpm check          # lint + 格式 + 类型 + 测试 + 构建
pnpm test:integration # 独立 MySQL/Redis 的真实依赖测试（需专用测试库）
pnpm format         # Prettier 格式化

pnpm --filter @nova/server test
pnpm --filter @nova/server test:e2e
pnpm --filter @nova/admin build
```

## 技术栈

| 端 | 技术 |
|----|------|
| server | NestJS, TypeORM, MySQL, Redis, Swagger, JWT/RBAC |
| admin | Vue3, Vite, Element Plus, Pinia |
| uni-app | Vue3, Vite, uview-plus, Pinia |
| packages | TypeScript 共享契约 |

## 开发说明

- 修改 `@nova/shared-types` 后，`pnpm dev` 会并行 `tsc --watch`，三端类型自动更新
- Admin 请求统一走 `admin/src/api/request.ts`，勿再使用已删除的 `utils/http`
- 若 `nest start --watch` 报 `dist/main` 缺失：`rm -f server/*.tsbuildinfo && pnpm --filter @nova/server build`

## Comet 工作流

默认 Classic 工作流，入口 `/comet`。状态查询：`comet status`、`comet dashboard`。

## 生产基座

API 使用 `APP_ROLE=api`，独立任务进程使用 `APP_ROLE=worker pnpm --filter @nova/server worker`（先构建）。开发默认 `all`，生产拒绝 `all`。

详见[运行与验收说明](docs/operations/production-foundation-runtime.md)、[任务 worker](docs/operations/job-worker.md)和[代码规范](docs/standards/foundation.md)。生产必须配置独立数据库、Redis 命名空间、强 JWT、明确 CORS 和对象存储。
