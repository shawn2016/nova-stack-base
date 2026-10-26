# 2026-10-26 Task 3：持久任务与独立 worker 验证

范围仅为通用任务基座；未开发课时簿业务，未部署、提交或推送。

## 交付

- `server/src/modules/job/job-queue.ts`：BullMQ producer / worker、Redis 自有前缀、失败退避、保留策略；普通 producer 超时与 worker 阻塞读取分别处理。
- `job-scheduler.service.ts`：生产 API 不消费，worker / 开发 all 消费；共享 Redis scheduler、执行前数据库复核、每 15 秒补偿协调、稳定 executionId、成功时间水位、全局串行执行、取消与优雅停机。
- `job-handler.registry.ts`：handler 接收 executionId、attempt、AbortSignal，原无参 handler 仍兼容。
- `job-log.service.ts`：真实成功 / 失败尝试日志，标记等待重试或终止，消息截断到数据库字段长度。
- `job.service.ts` / controller：CRUD 等待共享调度协调；删除先落库；run 返回排队结果，不等待长任务。
- `server/src/worker.ts`：无 HTTP 端口的 Nest application context，启用关闭钩子。
- `server/test/job/*`：单测、HTTP E2E、真实 Redis 集成与独立被杀进程 fixture。
- 运行说明：`docs/operations/job-worker.md`。

主 Agent 负责公共 BullMQ 依赖、共享 RunJobResult 类型、前端排队文案、APP_ROLE 验证及 package scripts；此任务未写这些公共文件。

## 测试先行证据与修复

1. 最初 API 队列边界单测失败：没有外部队列时，旧实现仍在请求内执行 handler 并返回 `{logId,status:1}`。新实现无队列时 503，handler 未执行。
2. 清理 completed 队列记录后重放相同定时 occurrence 的真实 Redis 测试失败：handler 实际被调用两次。增加每个 definition 一个成功时间水位后通过，防重独立于普通队列记录清理。
3. 60 秒取消测试揭示超时日志仍表示可重试；修复为终止失败，同时验证取消后 handler 未退出时执行 Promise 仍 pending、未提前释放执行 claim。
4. 独立 child worker 在认领后 SIGKILL，初次恢复测试因普通 commandTimeout 打断 BullMQ 阻塞读取而失败。worker 移除该 timeout，保留 producer 有界超时后，恢复测试通过。
5. 最终复核回归先复现了“较新成功抑制较旧重试”，随后加入未完成执行 pending 元数据，完成时原子推进水位与清除 pending，回归通过。
6. 优雅停机真实 Redis 测试最初失败：closing 标记阻止活跃 handler 提交水位并误触发重试。关闭期间禁止新入队，但允许活跃执行提交完成后关闭，测试通过。

## 2026-10-26 验证结果

运行 Node 24.14.0；真实 Redis 使用 localhost:16389，随机 `nova-job-test-<uuid>:` 前缀。测试只删除自己的 queue / 水位 key，未执行 FLUSHALL/FLUSHDB。数据库日志依赖在队列集成中使用 repository 边界替身，HTTP E2E 使用现有 SQLite + Mock Redis harness；此报告不把它描述为完整 MySQL 任务日志端到端测试。

| 检查                                                                                                                                                                   | 结果                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `pnpm --dir server exec jest --config test/jest-unit.json --runInBand --watchman=false --testMatch '**/job/job-queue.spec.ts'`                                         | 2/2 通过             |
| `JOB_QUEUE_REDIS_TEST=true pnpm --dir server exec jest --config test/jest-unit.json --runInBand --watchman=false --testMatch '**/job/job-runtime.integration-spec.ts'` | 9/9 通过，约 65.9 秒 |
| `pnpm --dir server exec jest --config test/jest-e2e.json --runInBand --watchman=false job/job.e2e-spec.ts`                                                             | 4/4 通过             |
| `pnpm --dir server exec eslint src/modules/job src/worker.ts`                                                                                                          | 通过                 |
| `pnpm --dir server exec tsc --noEmit --incremental false`                                                                                                              | 通过                 |

最初真实 Redis 七项检查（另加下方复核两项，共九项）：API 无 worker 入队、producer 关闭后的等待任务恢复、双 scheduler 同一 occurrence 与清理后防重、失败重试且 ID 保持、新成功不吞掉旧重试、双 Worker 全局并发为 1、优雅关闭活跃任务、独立 Node worker SIGKILL 后恢复。前两项归在一个测试用例。

早期 SIGKILL 测试在旧 30 秒锁 / 30 秒扫描配置下观察到约 60.3 秒恢复；后续完整集成暴露相位问题，见下方修复记录。这个早期观察不是生产恢复 SLA。单测日志中的 timeout ERROR 与重试测试 WARN 是有意触发的故障路径；E2E 的 Node url.parse deprecation 来源于现有依赖。

## 边界与后续运行责任

- 队列使用至少一次交付；handler 必须以 executionId 在副作用实际存储处事务防重，尤其是进程死在外部请求成功之后的窗口。
- 当前全局并发固定为 1，`concurrent=1` 不会额外开放并行；多 worker 是可用性副本。
- 超时是 60 秒协作取消。不响应取消的 handler 会继续占用执行槽和阻塞正常停机，不会默默重试或与下一任务重叠。
- 成功水位独立于记录清理，未完成重试另有 pending 标记。回归已验证较新成功不会吞掉较旧失败的重试；未知的历史触发不会补跑。
- BullMQ 成功记录最多 7 天 / 10000 条，失败最多 30 天 / 10000 条；水位每个 definition 一个字段持续保留。数据库日志未新增自动清理。
- MySQL 与 Redis 的 CRUD 协调非跨库事务；worker 周期协调负责补偿。处理前数据库复核防止旧 Cron、已暂停或已删除定义产生副作用。
- Redis AOF、备份、故障转移与持久化策略是部署运行责任；仅验证进程故障恢复，不声称 Redis 数据零丢失。

## 独立复核修复（2026-10-26）

复核来源：`docs/quality/2026-10-26-foundation-job-review.md`。

- P1 先用真实 Redis 复现：手动 handler 占住全局通道，定时 occurrence 已到期，两个实例执行相同配置协调后原 occurrence 被删除。修复为共享 30 秒租约（每 5 秒续租）、租约内读取数据库、共享定义摘要；相同配置跳过 upsert。首次引入摘要时采纳已有相同 scheduler，也不替换排队记录。CRUD 更新不再先 remove 再重建。回归覆盖到期记录保留、两个实例协调、摘要缺失时的迁移采纳，并在释放通道后确认原 occurrence 真正执行。
- P2 先用真实 scheduler job 的 Redis 协议复现：预置 `ats=3`（三个历史 activation），实际 worker 认领后未终止。修复为处理器在 handler 前校验 BullMQ `moveToActive` Lua 每次递增的持久 activation counter；累计超过 3 次即 UnrecoverableError，写终止日志。该预算不依赖上游对 repeatable job 的 maxStalledCount 特殊分支。回归在真实 scheduler 产生的 job 上预置历史计数，再真实认领；断言 handler 零调用且 job failed。这是精确 Redis/Lua 协议测试，不冒充连续三次杀进程测试。
- 既有 pending 元数据继续保留较旧失败重试，不会被较新成功水位吞掉。
- 本轮未引入手动入队 backlog admission；waiting/delayed backlog 仍无原子上限。为避免以非原子计数伪装严格上限，保留为明确运行限制，由现有权限和共享限流保护入口。

最终窄验证命令沿用上表：真实 Redis 9/9（65.9 秒，包括独立进程 SIGKILL 恢复）、单测 2/2、HTTP E2E 4/4、TypeScript 与 owned ESLint 均通过。

### P1 崩溃窗口补修

独立复核补充了“scheduler upsert 已成功、digest 仍为旧非空值”的崩溃窗口。本次先加入 RED：真实 Redis 保留陈旧非空 digest，等待已排队 occurrence 到期，再协调会删除原 ID；另一个 RED 发现摘要匹配但实际 handler / retry policy 漂移时旧逻辑也会错误跳过修复。

现改为以实际持久 scheduler 定义为准，检查 name、pattern、timezone、repeat limit/every/start/end、完整 template data 与 opts；对象比较不受 Redis JSON 字段顺序影响。实际定义相同则仅修正 digest，包含缺失和非空陈旧两种情况；实际定义不同则修复，不把匹配 digest 当作跳过依据。新增 repeat limit 漂移 RED→GREEN，避免只比较 handler 而忽略 scheduler 自身限制。

本次窄验证：真实 Redis 六项通过（missing digest / stale digest 下保留 overdue、matching digest 下修复 template / repeat options 漂移、activation budget、较旧 pending retry）；单测 2/2 通过。此前九项完整 Redis 含 SIGKILL 结果仍为上一轮完整运行，本次没有把新增至 12 项的套件描述为全部重跑。

### SIGKILL 恢复时序的完整集成回归修复

最终完整集成曾出现真实失败：旧测试等待 75 秒仍未完成，其余 15 项通过。未将失败归因为“机器慢”或直接增加 timeout。

复核 BullMQ 的 Redis/Lua 协议后，加入 `state / lockTTL / stalledCheckTTL / active / stalled / ats / globalConcurrency` 诊断，使用随机隔离队列及真实 SIGKILL，并故意使 shared gate 保留至第一轮 tick 后 500ms。旧生产配置（lock 30s、scan 30s）稳定复现 75 秒超时：

| 相对时刻 | lockTTL | stalled-check TTL | active / stalled          | ats | 含义                                 |
| -------- | ------- | ----------------- | ------------------------- | --- | ------------------------------------ |
| 30.0s    | -2      | 473ms             | active 有 ID / stalled 空 | 1   | 锁已消失，但共享 gate 仍拦截扫描     |
| 60.0s    | -2      | 约 30s            | active 与 stalled 都有 ID | 1   | 第一轮获准扫描仅标记，尚未回收       |
| 75.0s    | -2      | 约 15s            | active 与 stalled 都有 ID | 1   | 必须等待下一轮获准扫描；旧测试先超时 |

因此这是共享 gate 与两阶段 stalled 协议的时序预算错误，未发现任务丢失或全局并发计数不释放的独立缺陷。另加无长 sleep 的真实 Redis 协议测试，显式验证 denied check 不推进状态，首轮获准 check 只标记，第二轮获准 check 才回收，以及回收前全局 concurrency=1 仍阻止重叠认领。

生产策略改为显式 `stalledInterval=10000`，保留 `lockDuration=30000` 与正常续锁。相同 SIGKILL + 不利 gate 相位测试观察到 40.0 秒完成：ats 从 1 到 2，active/stalled 清空。期间 t=20s 已标记、t=30s 又遇 gate 边界错过扫描、t=40s 才回收，说明简单地数 timer tick 仍不可靠。测试 timeout 反而收紧为由生产策略推导的 `lock + 3 × scan + 5000 = 65000ms`，不是用延长等待掩盖问题。成功日志与失败异常均保留有界诊断时间线。

本次窄测试（协议 + SIGKILL）2/2 通过，约 41.2 秒；fresh server typecheck 与 owned ESLint 通过。完整 owned 13/13 通过（37.1 秒）；其中相同不利 gate 相位 SIGKILL 用例约 30.4 秒完成。两次新策略实测约 30 秒与 40 秒，符合 gate 相位会影响恢复轮次的解释。另一次 fresh 单测 2/2 通过，源码/测试文件在完整运行期间保持稳定。以上时间是健康本地 Redis 的回归观察，不承诺生产故障恢复 SLA。
