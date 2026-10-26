# 编码规范索引

> **AI 写码**：先读 [ai-checklist.md](./ai-checklist.md) → 按场景打开标杆 → 写完后勾选。

生产基座与执行门禁见 [foundation.md](./foundation.md)。

## 按场景读哪份

| 你在做… | 读 | 必开标杆 |
|---------|-----|----------|
| 新表 / 改 Entity | [database.md](./database.md) | `sys-user.entity.ts` 或 [examples/entity-fields.example.ts](./examples/entity-fields.example.ts) |
| 新 API / 改 DTO | [server.md](./server.md) | 同模块 `*.controller.ts` |
| 新 Admin 列表/弹窗 | [admin-ui.md](./admin-ui.md) | `user/index.vue` + `user-dialog.vue` |
| uni-app | [uni-app.md](./uni-app.md) | 同功能 admin/api |
| util / 复杂函数 | [comments.md](./comments.md) | 同目录相邻文件 |
| commit / 分支 | [git.md](./git.md) | — |
| Verify / 浏览器 E2E | [verify.md](./verify.md) | `e2e/specs/modules/online-session.spec.ts` |

## 存量代码策略

- **本 change 及以后的新增/修改**：必须符合 checklist MUST 项
- **未触达的存量**：不强制全仓一次性重构；**触到时顺手对齐**（尤其 Entity 备注、权限 seed）
- **其他分支未 merge 的模块**（如 dept/file）：merge 后按本规范补备注

## 文档

| 文件 | 内容 |
|------|------|
| [ai-checklist.md](./ai-checklist.md) | 写码前/后自检 |
| [database.md](./database.md) | 表、Entity |
| [server.md](./server.md) | Server、seed |
| [admin-ui.md](./admin-ui.md) | 列表、弹窗 |
| [uni-app.md](./uni-app.md) | C 端简版 |
| [comments.md](./comments.md) | 注释 |
| [git.md](./git.md) | 分支、归档 merge |
| [verify.md](./verify.md) | Verify Loop、Playwright 场景 |

功能设计：`docs/superpowers/specs/`（需求层，非写码规范）
