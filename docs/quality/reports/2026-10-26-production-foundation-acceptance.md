# 通用生产基座验收（2026-10-26）

## 结论与范围

完成本轮通用基座能力与代码门禁加固，未开发课时簿业务；保留此前登录刷新、菜单清理等未提交修改。本报告记录feat/production-foundation提交前的本地验收；后续提交与分支发布状态以Git历史为准。未部署业务服务。新增GitHub CI配置，远程结果以GitHub Actions运行记录为准。

## 已落实

- 配置：生产fail-fast，禁止自动同步/跳过依赖/混合worker角色；专用数据库、连接池与连接等待预算，Redis认证/TLS/db/key前缀和命令超时。
- 数据：初始29表迁移+独立auth_session增量，run/revert/check/baseline工具；旧库先核验漂移再登记基线，seed不建表。MySQL DDL非事务，单一迁移作业执行。
- 认证：access/refresh用途隔离、每设备sid、SQL+Redis双验证、退出/踢下线/冻结撤销、权限缓存共享失效、普通IP negative cache、在线会话SQL索引分页；修复登录与冻结的真实InnoDB竞态及IP配置写入竞态。
- 任务：BullMQ持久队列、独立worker、跨实例认领、有界重试和取消信号、稳定executionId、进程崩溃恢复；修复忙通道下相同调度重建丢触发、摘要写入中断窗口及repeat stalled无限启动问题。当前全局单通道，业务副作用由handler事务幂等。
- 运行：区分live/ready，MySQL/Redis真实探测，SIGTERM排空，request ID与结构化脱敏访问日志，受保护指标，Redis跨实例限流，JSON/分页/上传边界，安全错误响应。单跳代理使用Express解析后的IP，伪造XFF首段不能换限流身份。
- 上传：生产拒绝本地模式与不完整云配置，更新前组合校验并事务写入；显式环境变量固定提供商时拒绝后台切换。云SDK调用超时15秒。
- 规范：三端及共享包ESLint零warning、只读format检查、类型检查、固定Node24/pnpm9.15与frozen lock CI。新基础目录禁止any/抑制注释；存量按既有策略逐步收敛。源码统一Prettier；Admin自动导入类型声明已取消gitignore排除，作为本轮新增文件交付；后续提交需与实现一并纳入，保证干净检出能直接typecheck。
- 构建：修复uni-mp-vite漏声明estree-walker的可复现构建失败，仅为受影响版本增加packageExtensions；Express明确声明为server运行依赖。增加普通Node启动dist的smoke，防止Jest解析掩盖遗漏。

## 验证证据

环境：macOS，本地Node24.14.0 / pnpm9.15.0，独立MySQL8.4（127.0.0.1:13316）、Redis7（127.0.0.1:16389）。测试库与预览库分离，没有使用生产服务。

| 验证 | 结果 |
| --- | --- |
| pnpm install --frozen-lockfile | exit 0 |
| pnpm check | exit 0：lint / format / typecheck / test / verify:test / build |
| Shared types | 15文件，76测试通过 |
| Server unit | 16套，104测试通过；4个真实依赖用例在默认命令跳过，另显式执行 |
| Server API E2E | 22套，181测试通过；5个真实依赖用例在默认命令跳过，另显式执行 |
| Admin / uni-app请求回归 | 各4测试通过（8项），包含并发刷新、失败传播与旧会话竞态 |
| 验证工具自身测试 | 7项通过 |
| 三端构建 | API、Admin、H5、微信小程序均通过 |
| 构建后pnpm format:check / git diff --check | exit 0 |
| 真实依赖集成 | 迁移/Redis4项、认证5项、任务13项/双API4项；共26项通过，脚本exit 0（含编译产物smoke） |
| 编译产物普通Node smoke | ready200、metrics401/200、非法JSON400且无原文、SIGTERM正常退出 |

真实依赖覆盖空库迁移/回滚/重跑、旧库漂移拒绝与sentinel行保留、Redis前缀隔离、会话撤销与分页、冻结发放令牌行锁竞态、IP并发配置、双实例共享限流429+CORS、真实Redis断连ready503、双worker互斥、失败重试、旧重试保留、SIGKILL恢复、调度摘要/实际定义漂移与启动预算。最后复跑暴露SIGKILL恢复75秒间歇超时，已用真实Redis gate相位复现，改为30秒锁/10秒检查并把测试预算收紧为65秒，新增协议诊断回归；同相位两次恢复约30/40秒且无重复认领。详见任务专项报告。

最终负载smoke为双API、10并发客户端、100次带认证的用户列表读取。种子数据、同机MySQL/Redis，零错误；最终一体化脚本记录 elapsed148ms / p95=23ms / p99=26ms。它只证明该小样本路径正常，不是持续容量或生产QPS承诺。最终脚本的当次耗时以本地日志为准。

浏览器（ego-browser）实际验证：Admin本地免滑块登录；定时任务页刷新保持登录；手动排队提示正确，独立worker写成功日志heartbeat ok；API/worker重启后同一会话继续使用；点击退出确认后旧access与refresh分别401；H5会员登录、刷新保持会员状态。小程序完成构建，未做微信开发工具/真机验收。

日志保存在仓库外 ../.local/nova-preview/logs/：foundation-check-final.log、foundation-integration-final.log、built-smoke.log、format-after-build.log、preview-migration.log。任务页面截图在 ../.local/nova-preview/screenshots/foundation-job-success.png。未把本地凭据或备份纳入版本控制。

## 本地预览

预览库nova_jks_preview已先做本地SQL备份（权限0600），再核验29表、登记初始基线、应用auth_session增量迁移并check通过；原业务数据保留。API现在APP_ROLE=api，另有APP_ROLE=worker独立进程，共享 nova:jks:preview: Redis前缀。当前API13011、Admin15173、H515174；readiness返回database/redis均true。旧格式token需要重新登录。

## 独立复核

迁移、认证、任务及跨模块运行保护分别复核，发现的重要问题均修复并回归。报告：

- ../2026-10-26-foundation-database-review.md
- ../2026-10-26-foundation-auth-review.md
- ../2026-10-26-foundation-job-review.md
- ../2026-10-26-foundation-final-review.md

## 实际限制与上线工作

- 未做百万并发或生产容量验收；数据规模、流量模型、机器/连接预算、持续负载和故障演练均需按业务补充。NestJS继续作为模块化API使用。
- 当前任务全局串行且无原子积压准入上限。扩worker提高可用性，任务重流量上线前补队列容量、租户配额及死信处理；不可合作handler会阻塞通道与正常排空。
- Redis持久化/备份、TLS/ACL托管连接、对象存储桶权限/CDN私有访问、Prometheus采集与告警，均是部署环境验收项，本地未实测云资源。
- 在线列表为未过期SQL会话元数据，不是心跳人数；Redis丢key时认证失败关闭但元数据可能等到过期。
- DB_MAX_QUERY_EXECUTION_TIME是慢查询日志阈值，不取消SQL；每进程pool10需乘API+worker实例数，另留运维预算。
- 现有依赖安装仍有peer提示（uni-app固定Vue3.4与部分工具peer范围、Admin调试插件Vite范围等），构建成功；小程序有现有member/request循环chunk提示，仍需真机验证。没有为消除提示贸然整体升级框架。
- 源码格式化产生较大diff，未把格式变更与历史未提交功能修改混为新增业务。GitHub CI远程运行结果独立记录，本报告不代替远程CI或生产部署验收。

参考：pnpm官方packageExtensions说明：https://github.com/pnpm/pnpm/blob/main/pnpm/docs/settings/dependency-resolution.md 。

最终补记：`pnpm check` 与 `pnpm test:integration` 一体化运行exit 0；任务13项+双API4项共17项通过，迁移/Redis4项与认证5项通过；编译产物smoke与SIGTERM退出通过。常规测试共376项通过，默认跳过的9个真实依赖用例已在集成命令显式执行。任务SIGKILL时序修复通过了新增的独立协议复核。

句柄复核补记：一体化测试结束曾出现Jest的一秒退出提示，但进程正常exit 0。另以`--detectOpenHandles`定向执行任务/双API（排除已单独完成的长SIGKILL用例）16项通过，exit 0，无报告残留句柄；该模式记录的延迟包含诊断开销，不用于负载结果。最终预览API/worker已从最后构建重启，ready200且两项依赖均true。

提交前复核：重新运行pnpm check与pnpm test:integration均exit 0。第一次常规E2E中公告unread-count用例曾出现一次ECONNRESET；该套定向11项及随后完整门禁均通过，保留pre-push-notice.log与pre-push-check.log，不将一次连接重置归因于已证明的业务缺陷。暂存区凭据检查覆盖298个新增/修改文件，无实际本地密钥匹配；数据库备份与本地.env未纳入。
