# 基座开发门禁

运行时固定 Node 24.x（`.nvmrc` 为 24.14.0）、pnpm 9.15.0。提交前执行 `pnpm check`；涉及数据库、认证或队列再执行 `pnpm test:integration`。GitHub CI 在 MySQL 8.4 / Redis 7 下执行相同检查，不含部署动作。

- `pnpm lint`：server、shared-types、Admin、uni-app 的 TypeScript / Vue，零 warning；Vue 使用 essential 语义规则。
- `pnpm format:check`：检查四处源码，遵循现有各包 Prettier 配置，不修改文件。首次已对存量源码统一格式。Admin的自动导入类型声明作为本轮新增源文件交付，后续提交需一并纳入版本控制，供干净检出直接类型检查；它们保持生成器格式并排除格式/lint检查。
- `pnpm typecheck`：全部 workspace 的现有严格 TypeScript / vue-tsc 检查。
- `pnpm test`：共享契约、服务单测、SQLite HTTP E2E、两端登录刷新竞态回归。
- `pnpm verify:test`：现有验证工具契约；`pnpm build`：全包构建。

新增基础能力目录 runtime、JWT、config、Redis、job、migration tools 与两端请求核心禁止 explicit any / ts-ignore。其他存量目录暂保留 legacy any，但新增代码同样不得靠类型断言掩盖未经校验的输入；不要放宽类型检查。边界先使用 unknown 和运行时校验。其余规则继续遵循本目录 server/database/comments/ai-checklist。

修改 HTTP 类型先改 shared-types；认证必须验证 token 用途、SQL 会话与 Redis 会话，不能只验证签名。权限写入遵循共享失效协议。新增任务 handler 必须使用 executionId 在业务事务中幂等；不得用队列的认领锁宣称副作用恰好一次。数据库结构用迁移，禁止在启动时自动改生产 schema。

日志禁止记录凭据、原始请求体和 token。指标只用有界路由模板，不把用户 ID、手机号、查询字符串做 label。新页面沿用现有规范；本次未开发课时簿业务。
