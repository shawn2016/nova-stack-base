# Production Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 补齐通用生产基座并验证多实例关键路径，不开发课时簿业务。
**Architecture:** 保留 NestJS 11/Express 模块化 API，MySQL 迁移管理数据，Redis 命名空间隔离会话/限流，独立 worker 消费持久队列。生产拒绝开发绕过，真实依赖验证连接预算与故障行为。
**Tech Stack:** NestJS 11, TypeORM/MySQL 8, ioredis, BullMQ（独立 worker）, Vue/uni-app, ESLint, Jest/Vitest。
**Spec:** `docs/superpowers/specs/2026-10-26-production-foundation.md`

## Global Constraints

- 不包含课时簿实体、业务页面、支付或部署。保留此前未提交修改，不提交、不推送。
- 不使用 worktree。所有 worker 写入范围互斥，公共 AppModule/package/CI 由主 Agent 集成。
- 新 API 先改共享契约；权限/DTO/实体备注遵循 AGENTS 与 standards。
- 先写并运行能复现缺陷的测试，再实现；只对受影响路径复测，最终跑完整门禁。
- 生产 API 与 worker 通过 APP_ROLE=api|worker|all 区分；生产默认 api，all 仅开发使用。

## Task 1: 环境、连接与迁移

Files: `server/src/config/*`, `server/src/database/*`（排除 seeds/init.seed.ts）, `server/src/redis/*`, `server/test/config/*`, 数据库迁移测试/工具；环境模板。
Interfaces: database.*（poolSize/connectTimeout/maxQueryExecutionTime/synchronize）, redis.*（db/keyPrefix/username/password/tls/connectTimeout/commandTimeout），APP_ROLE。RedisService.getClient() 保持 ioredis 类型；正常依赖未连接时 readiness 返回失败。
- [x] 复现生产弱配置/错误端口/自动同步被接受，以及真实空库缺少迁移。
- [x] 实现环境 fail-fast、显式连接池预算、Redis 命名空间和认证/超时、TypeORM CLI 数据源与初始迁移。
- [x] 提供 run/revert/check/baseline 命令；baseline 核验现有 schema 后仅登记迁移，不删除数据。
- [x] 用隔离 MySQL 空库迁移/回滚/重跑、已有开发库 drift check 和隔离 Redis 前缀验证；报告命令与结果。

## Task 2: 认证、会话与请求查库控制

Files: `server/src/common/jwt/*`, `modules/auth/*`, `modules/member-auth/*`, `modules/online-session/*`, `modules/ip-blacklist/*`, `modules/rbac/*`, 对应 server tests；seeds/init.seed.ts 如需权限码。
Interfaces: JWT 增加可选/受验证用途与 session 标识，原 HTTP login/refresh/logout 与 TokenPair 不变；Redis 使用普通命令以兼容统一 keyPrefix，在线列表使用有序索引/有界分页。
- [x] 复现 access 冒充 refresh、退出后 refresh 可用、多设备互踢、冻结后 refresh 可用、会话 KEYS 与正常 IP 每次查库。
- [x] 实现 access/refresh 用途、独立会话、安全撤销与有效期；旧 token 明确失效需重新登录。
- [x] 实现有界索引分页、共享失效机制的权限缓存/账户状态校验与 IP negative cache。
- [x] 扩展内存 Redis 测试替身与对应测试，并用真实 Redis 验证原子撤销、分页和失效。

## Task 3: 持久任务与独立 worker

Files: `server/src/modules/job/*`, `server/src/worker.ts`, 对应 job tests；任务运行文档。
Interfaces: Worker 根据 APP_ROLE 消费 BullMQ；既有 job CRUD/runOnce API 与共享响应保持兼容；新增 handler 注册可传执行 ID 与 AbortSignal。
- [x] 复现两个 scheduler 对同一触发重复执行、失败无重试及进程退出丢任务。
- [x] 实现持久队列、稳定 occurrence/job ID、共享调度、防重认领、并发与有界重试/超时/清理策略。
- [x] API 不承载 worker；worker 优雅停机、任务日志明确区分排队/执行结果。
- [x] 真 Redis 双 worker 验证相同任务仅认领一次、失败重试和停机恢复。

## Task 4: 可观测性、保护与客户端退出

Files: `server/src/runtime/*`, `modules/health/*`, `main.ts`, `bootstrap.ts`, `app.module.ts`, metrics 共享契约（如需要）, 全局分页 DTO；Admin 手动退出。
Interfaces: `/api/health/live`, `/api/health/ready`；受保护 metrics；request ID 在 header 与日志；Redis 多实例共享限流按命名空间存储。
- [x] 为 readiness 依赖故障、429、请求 ID/脱敏、指标鉴权写失败测试。
- [x] 实现依赖探测、优雅停机、脱敏 JSON 日志、指标、入口/登录限流及合理请求体/分页边界。
- [x] 完善生产上传配置守卫并让手动退出调用服务端撤销。
- [x] 集成三位 worker 的公共依赖与模块；验证错误不会泄露堆栈/凭据。

## Task 5: 规范与集成验收

Files: 根/前端 ESLint、package scripts、`.github/workflows/*`, `docs/standards/*`, 集成/负载验证脚本与报告。
- [x] Vue/TS lint 覆盖两端，新代码 no-explicit-any 与抑制注释禁用边界明确；建立只检查不写入的 format:check。
- [x] CI 固定 Node/pnpm、frozen lock、lint/typecheck/test/build、真实依赖集成 smoke；不包含部署密钥。
- [x] 跑最终 lint/typecheck/单测/API/客户端/构建；真实 MySQL/Redis 多实例 smoke 与限流压测，保留报告。（pnpm check + test:integration均exit 0，376项常规测试+26项真实依赖测试，含dist启动/退出smoke）
- [x] 独立复核完整变更并修复重要问题；更新清单与验收局限。
