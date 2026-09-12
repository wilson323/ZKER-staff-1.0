# 文档轨裁决记录

| 项 | 值 |
|---|---|
| 日期 | 2026-09-12 |
| Owner 选择 | **重开 feature 文档轨**（相对 `main` 的并行/未来文档轨） |
| 有效分支 | `cursor/oa-digital-employee-platform-530e` |
| 历史参考 SHA | `ab898f6`（旧 feature tip / PR #1 基线） |
| 当前基线 | 基于 `main` @ `454caf6` 叠加文档轨提交（因与旧 main 无共同历史，旧 PR #1 无法 reopen） |
| 仓库 | `https://github.com/wilson323/ZKER-staff-1.0.git` |
| 默认主分支 | `main` @ `454caf6`（设计包已入库，**禁止误删**） |

## 双轨关系

| 轨道 | 角色 |
|---|---|
| **main** | 已入库设计事实（设计主链 / 上传包 / 源码快照等） |
| **本 feature** | 需求对齐与平台落地文档轨；以本分支 `docs/` 为推进与对齐入口 |

## 状态用语

- 废止：`CODING_PAUSED` 作为当前文档轨主状态
- 现行：**文档轨已重开 / 以本 feature 文档为准推进对齐**
- 业务编码仍须待 Owner 底座终选或「仅 M0 实验」授权；本回合不扩业务代码

## 关联入口

- [product-requirements-alignment.md](./product-requirements-alignment.md)
- [oa-platform-plan.md](./oa-platform-plan.md)
