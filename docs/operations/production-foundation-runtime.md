# 生产基座运行与验证

本次保留 NestJS 11 + Express 模块化架构。API 可水平扩展，持久任务单独运行；未承诺任何百万并发容量。

## 启动顺序

1. 使用 Node 24.x / pnpm 9.15.0，`pnpm install --frozen-lockfile && pnpm build`。
2. 从环境模板配置专用 MySQL 账号、项目数据库、Redis 凭据/TLS/db/keyPrefix、强 JWT、明确 CORS。生产强制 `DB_SYNCHRONIZE=false`，不能跳过外部服务。
3. 新库 `pnpm --filter @nova/server migration:run`，再 `pnpm seed`。已有库必须先备份，按 [数据库手册](production-foundation-database.md) 核验后 baseline/run/check；禁止把 baseline 当成忽略漂移的方法。
4. `APP_ROLE=api pnpm --filter @nova/server start:prod`；另一个进程执行 `APP_ROLE=worker pnpm --filter @nova/server worker`。生产禁止 all；worker 当前加载现有 AppModule，拥有独立连接池，计入连接预算。
5. 配置入口代理/探针/指标采集并按真实业务模型压测。当前队列全局单执行通道优先保证互斥，增加 worker 提升可用性，不代表任务吞吐线性增加。详见 [任务手册](job-worker.md)。

配置的每进程默认 MySQL pool=10；总预算是 API 数量与 worker 数量之和乘连接池，再加运维/迁移连接。`DB_MAX_QUERY_EXECUTION_TIME` 只记录慢查询，不会取消查询。不能用扩大连接池代替查询优化。

## 可观测性和入口边界

- `/api/health/live` 仅判断进程可响应；`/api/health/ready` 真实执行 MySQL SELECT 1 / Redis PING，失败或排空返回 503；旧 `/api/health` 保留兼容 liveness。
- `/api/health/metrics` 要求 `Authorization: Bearer <METRICS_TOKEN>`，token 至少32个非空白字符；未配置返回404。Node CPU/内存/事件循环、HTTP请求/时延、限流拒绝、依赖状态按进程采集。部署方须另行接入 Prometheus/Grafana/告警，仓库未部署采集服务。
- API/worker 结构化 JSON 日志脱敏，HTTP日志只记录 request ID、方法、路由模板、状态、耗时。安全的 X-Request-ID 透传，否则生成 UUID。
- Redis 原子固定窗口共享限流：普通120/分钟、登录/注册/刷新10/分钟、上传20/分钟，均可配置；依赖失败返回503，超额429+Retry-After。当前按IP策略，NAT用户可能共享额度；真实业务上线前设置账户/租户策略与入口全局容量保护。
- 默认请求体256KB，分页正整数且 pageSize/size<=100、page/current<=100000。上传保留既有文件大小边界，SDK网络超时15秒。HTTP请求30秒、header10秒、keepalive5秒；这些不是数据库查询或业务执行取消。
- `TRUST_PROXY=false` 默认直接访问；仅单层受控入口且 API 仅能由该入口访问时开启 true（Express信任一跳）。入口应覆盖/追加真实IP；应用使用Express解析后的req.ip，不自行信任XFF首段。其他代理拓扑应明确配置并测试，不能盲目启用。
- SIGTERM触发Nest关闭钩子、API关闭和worker排空；部署平台须停止送流并给长任务足够终止时间。当前不可合作的handler会阻塞排空，必须实现AbortSignal响应。

## 会话与上传

access/refresh用途隔离，同账户多设备独立sid。退出、踢下线、冻结同时撤销SQL/Redis会话；账号校验通过主库索引查询。旧格式token需重新登录。在线列表为未过期会话元数据，不是心跳在线人数；Redis异常丢key时认证失败关闭，列表可能等待SQL过期。会话Redis建议noeviction与持久化，权限失效协议见认证验收报告。

生产启动与更新设置必须验证对象存储配置，禁止local。`UPLOAD_STORAGE_PROVIDER=aliyun_oss|tencent_cos` 显式设置时提供商由环境固定，后台不能切换到另一个值；不设置时使用数据库配置。Aliyun配置OSS_REGION/OSS_BUCKET/OSS_ACCESS_KEY_ID/OSS_ACCESS_KEY_SECRET，可选OSS_PUBLIC_BASE_URL；腾讯使用COS_REGION/COS_BUCKET/COS_SECRET_ID/COS_SECRET_KEY，可选COS_PUBLIC_BASE_URL。保密字段后台仅返回掩码；生产更新在事务中组合校验，缺少必要凭据不写入。配置校验不等于云服务验收：需实际验证桶权限、私有访问、CDN/TLS及下载授权。

## 可复现测试

`pnpm check` 运行静态、类型、全部单测/API/客户端测试与构建。

`pnpm test:integration` 需要先构建，末尾以普通Node进程启动编译产物，验证ready/metrics/JSON错误边界及SIGTERM退出，防止Jest解析掩盖缺失运行时依赖。它只允许独立测试库：nova_foundation_migration_test、nova_foundation_auth_race_test、nova_foundation_runtime_test。测试会删除这些库中的表，请使用专用凭据与本地/CI实例，不指向预览或生产库。MySQL本地13316、Redis16389；以server/.env或进程环境提供连接信息。CI使用预置service并通过server/scripts/prepare-test-databases.cjs创建明确命名的测试库与授权（需本地专用root密码）。

真实依赖测试覆盖迁移往返/漂移/保留数据、跨实例认证撤销/冻结竞态、会话分页、Redis前缀、共享限流、依赖故障、双worker认领、重试和SIGKILL恢复。认证读取负载仅双API实例、10客户端、100次种子数据请求；用于功能与有界负载检查，不作为生产容量结果。

后续容量验证需要真实数据量与索引分布、登录/读写比例、持续时间、热点/冷缓存、p95/p99/错误率、事件循环延迟、MySQL池等待/慢SQL和Redis延迟。手动排队目前没有原子积压准入上限，入口限流只能减少单IP提交速率；上线任务重流量场景前必须增加队列容量/租户配额/死信处理。分库分表、微服务和Kubernetes均未作为起步默认复杂度引入。
