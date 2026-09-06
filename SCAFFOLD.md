# 脚手架使用说明（nova-stack / nova-stack-base）

本仓库族是 **全栈 monorepo 脚手架**，不是具体业务项目。

- **维护仓库**：`shawn2016/nova-stack`（日常开发、Comet、Verify）
- **对外 Template**：[`shawn2016/nova-stack-base`](https://github.com/shawn2016/nova-stack-base) — 业务项目用 **Use this template** 创建

- **脚手架**：维护通用能力（RBAC、Verify、E2E、Comet、规范、ArtListPanel 等）
- **业务项目**：从本仓库 **Template 生成** 后独立演进；业务需求 **不回灌** 脚手架

数据流：**脚手架 → 项目（单向）**，不是双向 merge。

---

## 1. 从脚手架创建新业务项目

### GitHub（推荐）

1. 打开 https://github.com/shawn2016/nova-stack-base
2. 点击 **Use this template** → **Create a new repository**
3. 填写新项目名（如 `my-crm`、`acme-admin`）
4. 克隆到本地：

```bash
git clone git@github.com:<you>/<new-repo>.git
cd <new-repo>
```

### 本地初始化

```bash
pnpm install

# 使用「项目专用」环境变量（勿与脚手架 demo 共库）
cp server/.env.project.example server/.env
cp admin/.env.example admin/.env

# 编辑 server/.env：改 DB_DATABASE、JWT_SECRET 等
# 创建独立 MySQL 库后 seed
pnpm seed

pnpm dev
```

默认账号（seed 后）：Admin `admin` / `admin123`

---

## 2. 环境隔离（必做）

每个业务项目必须使用 **独立数据库**，不要与脚手架或其他项目共用 `nova_stack`。

| 变量 | 脚手架 demo | 业务项目 |
|------|-------------|----------|
| `DB_DATABASE` | `nova_stack` | `nova_stack_<项目短名>` |
| `JWT_SECRET` | 可默认 | **必须改掉** |
| Redis | 可共用实例 | 建议不同 `REDIS_DB` 或 key 前缀（见 `.env.project.example`） |

创建数据库示例：

```sql
CREATE DATABASE nova_stack_my_crm
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

---

## 3. 业务项目内的 Git 流程

业务仓库与脚手架 **完全独立**：

```
main          ← 稳定产品基线
feat/*        ← 功能分支
comet/*       ← Comet change（若启用）
```

- 功能开发在分支，完成后 merge 到 **本项目的 main**
- **不要**向 `shawn2016/nova-stack-base` 提业务 PR

---

## 4. 从脚手架「导入」更新（单向同步）

当脚手架修复了通用 bug、升级 Verify、调整规范时，业务项目 **按需** 拉取，不是自动同步。

### 4.1 添加 upstream（一次性）

在 **业务项目** 根目录：

```bash
git remote add scaffold https://github.com/shawn2016/nova-stack-base.git
git fetch scaffold
```

### 4.2 查看脚手架新提交

```bash
git log HEAD..scaffold/main --oneline
```

### 4.3 按需 cherry-pick（推荐）

只挑需要的 commit，避免把脚手架 demo 数据/业务混入：

```bash
git cherry-pick <commit-sha>
# 冲突在项目侧解决，保留业务改动
```

适合：Verify 修复、shared-types 规范、单个组件 bugfix、文档/标准更新。

### 4.4 按目录合并（进阶）

若整块同步（如 `e2e/`、`tools/verify-hub/`），可用 subtree 或手动 diff 拷贝。合并前先看 `SCAFFOLD.md` 与脚手架 Release Notes。

### 不要做的事

- ❌ 把业务项目 push 到 `nova-stack-base`
- ❌ 在业务项目里长期维护 `scaffold/main` 跟踪分支并双向 merge
- ❌ 与脚手架共用同一个 `DB_DATABASE`

---

## 5. 脚手架维护者（本仓库）

在 **nova-stack-base**（或上游 nova-stack）上：

| 分支 | 用途 |
|------|------|
| `main` | 稳定基座，Verify 通过后更新 Template |
| `comet/*` / `feat/*` | 脚手架能力迭代 |

发布建议：打 tag 便于项目对齐，例如 `scaffold-v1.0.0`。

```bash
git tag scaffold-v1.0.0
git push origin scaffold-v1.0.0
```

业务项目同步时可：`git cherry-pick` 该 tag 范围内的 commit，或对照 tag diff。

---

## 6. 常用命令速查

| 场景 | 命令 |
|------|------|
| 业务项目启动 | `pnpm dev` |
| 初始化 RBAC | `pnpm seed` |
| 全量验证 | `pnpm verify` |
| Verify Hub | `pnpm verify:hub` → http://localhost:9470 |

---

## 7. 相关文档

- 项目概览：[`README.md`](./README.md)
- 编码规范：[`AGENTS.md`](./AGENTS.md)、[`docs/standards/`](./docs/standards/)
- Verify：[`docs/standards/verify.md`](./docs/standards/verify.md)
