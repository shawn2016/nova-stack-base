# 持久任务与独立 worker

生产 API 使用 `APP_ROLE=api`（生产默认），消费进程使用 `APP_ROLE=worker`。开发环境默认 `all`；生产配置不允许 `all`。所有实例必须连接同一 MySQL、Redis database、`REDIS_KEY_PREFIX`，并使用相同的 `TZ`。任务 Cron 保留进程本地时区语义，建议所有进程显式设置 `TZ=Asia/Shanghai`。

在 server 目录先构建，再分别运行：

```sh
APP_ROLE=api node dist/main.js
APP_ROLE=worker node dist/worker.js
```

`worker.ts` 创建 Nest application context，不监听 HTTP 端口；正常 API 进程只创建队列 producer。每个独立进程都有自己的 MySQL 连接池；池总预算须覆盖 API 副本与 worker 副本总数。

## HTTP 与日志

`POST /api/jobs/:id/run` 快速返回 `{ executionId, status: 'queued', message }`，仅表示 Redis 已接收入队。队列未连接时返回 503。实际执行结果由 `/api/jobs/logs` 查询；每个尝试的日志包含 executionId、attempt、成功或“等待重试 / 已终止”。这是原先同步 `{ logId, status: 0|1 }` 的明确契约迁移，客户端必须使用更新后的共享类型。

CRUD 保持原有 DTO 与响应。修改/暂停/删除在 MySQL 持久化后同步共享调度；worker 每 15 秒根据数据库重新协调，补偿进程退出或同步失败。协调器使用 Redis 共享租约与 definition 摘要，并始终核验实际 scheduler 的名称、Cron、时区、repeat 限制、完整 data 与重试/清理策略。实际定义未变时直接保留原 scheduler，仅修正缺失或陈旧的摘要，避免重复 upsert 丢弃已到期但尚未获得执行槽的 occurrence；实际定义漂移时即使摘要匹配也会修复。租约持有者先读取数据库，再同步与写入摘要；不同实例同步串行化。处理前再次读取 MySQL，暂停、删除或旧 Cron/handler 的排队触发不会执行。数据库更新与 Redis 协调不是跨库事务；协调失败可能让 CRUD 响应失败但数据库已经更新，重新读取详情即可确认，worker 会继续补偿。

## 执行与交付保证

BullMQ scheduler 使用 `definition-<jobId>` 共享身份，Redis 原子 upsert 生成稳定的 `repeat:definition-<jobId>:<occurrenceMillis>`。同一时刻两个 worker 不能认领同一队列记录。完成时间水位保留每个任务一个数值，独立于队列历史清理；已完成的定时触发不会重放。正在执行或等待重试的 occurrence 另有 pending 标记，因此较早失败的触发仍会重试，即使期间较新的触发已经成功。成功会原子推进水位并清除 pending；终止失败也会清除 pending。未知的、早于最近成功的历史触发不会凭空补跑。

当前队列全局并发固定为 1，worker 本地并发为 1。增加 worker 只提高可用性；`concurrent=1` 是允许并发的定义属性，当前保守实现仍串行。这样 `concurrent=0` 在手动执行、多实例和重试时都不会绕过排他限制。

每次普通失败最多尝试 3 次，指数退避从 1 秒开始。handler 每次收到 `{ executionId, attempt, signal }`；同一次执行的 executionId 跨重试、崩溃恢复保持不变。handler 必须在实际副作用的存储处使用该 ID 原子防重，例如业务表唯一键与同一事务。队列本身是至少一次交付，不能承诺远程副作用恰好一次。

60 秒触发 `AbortSignal` 取消。超时后等待 handler 真正退出，保持 BullMQ claim 和全局执行槽；超时为终止失败，不自动重试。handler 必须响应取消并为外部调用设置超时。不响应取消的 handler 会阻塞这条执行通道和正常停机，不能通过丢弃 Promise 来安全终止它。强制杀进程后的恢复依赖 handler 幂等，不能保证未知远程操作已停止。

SIGTERM/SIGINT 正常停机等待当前 handler 完成再关闭 worker 与 queue。进程突然退出时 BullMQ 使用 30 秒 claim 和显式 10 秒 stalled 扫描。扫描受共享 stalled-check gate 限制，获准的一轮先把 active 标记为 stalled，后续获准扫描且锁已过期才回收；计时器 tick 不一定都是获准扫描，不能把两次 tick 当作恢复上限。真实 SIGKILL 测试故意让共享 gate 跨过首个 tick，观察到约 40 秒恢复；测试使用 lock + 3 × scan + 5 秒调度余量（当前 65 秒）的预算，并保留 state、lock TTL、stalled-check TTL、active、stalled、activation count 和全局并发快照。这个预算用于健康本地依赖的回归，不是生产恢复 SLA；BullMQ 的 `maxStalledCount=1` 仅作为普通任务的额外保护；repeatable 任务有上游特殊处理，因此处理器另行使用 Redis 原子持久化的 activation counter 限制每个 occurrence 最多 3 次 handler 启动（包含失败重试与进程崩溃恢复）。第 4 次认领在调用 handler 前写终止日志并不可重试失败，避免 poison occurrence 无限占用队列。实际恢复速度也受 Redis 可用性与负载影响。

## Redis 与保留策略

BullMQ 使用独立前缀 `<REDIS_KEY_PREFIX>queue`，不把 ioredis `keyPrefix` 传入 BullMQ，避免双前缀。沿用 Redis host/port/db/username/password/TLS/connect timeout；API producer 命令使用有界 command timeout，worker 的阻塞读取不使用普通命令 timeout，以保证 stalled recovery。

成功队列记录保留最多 7 天 / 10000 条，失败保留最多 30 天 / 10000 条（清理在后续任务处理时触发）。成功时间水位每个任务一个字段，持续保留；pending 元数据仅覆盖尚未完成的执行。它们不能代替 handler 自身的事务防重。数据库执行日志沿用原有表和查询接口。

Redis 数据持久化是运行环境责任：应启用 AOF/合适的持久化与备份策略，避免把只验证了进程重启恢复描述为 Redis 宕机数据零丢失。

## 验证

在独立 Redis 16389 上，测试使用随机 `nova-job-test-<uuid>:` 前缀，清理仅限该队列，不执行 FLUSHALL/FLUSHDB。

```sh
JOB_QUEUE_REDIS_TEST=true pnpm --dir server exec jest --config test/jest-unit.json --runInBand --watchman=false --testMatch '**/job/job-runtime.integration-spec.ts'
pnpm --dir server exec jest --config test/jest-unit.json --runInBand --watchman=false --testMatch '**/job/job-queue.spec.ts'
```

覆盖 API 无 worker 时入队、恢复等待任务、双 scheduler 防重、忙通道下相同配置协调不丢到期任务、repeat activation budget 协议、完成记录清理后的防重、失败重试、较新成功之后仍保留旧重试、双 worker 全局串行、优雅停机、共享 gate 拦截后的 mark/reclaim 协议，以及一个独立 Node worker 被 SIGKILL 后在不利 gate 相位下恢复已认领任务。

待执行 backlog 尚无原子 admission 上限，当前依赖受保护入口与共享请求限流。队列历史保留上限不代表 waiting/delayed backlog 上限；长时间无 worker 时应观察排队量并停止手动提交。
