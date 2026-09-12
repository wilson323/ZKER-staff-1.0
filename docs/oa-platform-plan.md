# OA 数字员工协作平台落地计划（ZKER-staff-1.0）

> **当前优先级**：**Agent 全权已授权** — M0/M0+/工作流绑定已通；进行中：**M1-01 双实例工作台**。  
> **有效分支**：`cursor/oa-digital-employee-platform-530e`。  
> **与 main 关系**：`main` = 已入库设计事实；本 feature = 对齐文档 + M0→M1-01 实现。  
> **裁决入口**：[agent-decisions-m0.md](./agent-decisions-m0.md)、[product-requirements-alignment.md](./product-requirements-alignment.md)。  
> **历史**：曾 `CODING_PAUSED` → 文档轨重开 → 2026-09-12 全权授权后恢复编码。

## 1. 仓库确认

| 项 | 值 |
|---|---|
| Remote | `https://github.com/wilson323/ZKER-staff-1.0.git` |
| 默认主分支 | `main`（设计包已入库，禁止误删） |
| 工作分支 | `cursor/oa-digital-employee-platform-530e` |
| 工作目录 | `/workspace` |
| Draft PR | [#3](https://github.com/wilson323/ZKER-staff-1.0/pull/3) |

## 2. 阶段顺序（强制）

1. ~~文档轨重开 / 需求对齐~~ — **完成（口径已统一）**  
2. ~~等待 Owner 底座/M0 授权~~ — **废止；Agent 全权已裁决**  
3. **工程门禁 M0** — NestJS + Vue3 + `make ci`（进行中）  
4. **按 47 号最小步骤** 扩 M1 能力 — 禁止抢跑完整运行时  
5. **产品 OA 底座验证** — 按 60 号：RuoYi-AI → 芋道 → Plus（与 M0 工程层可并行规划，不阻塞门禁）  

## 3. M0 工程层（已采用，非产品 OA 终选）

| 路径 | 技术 | 说明 |
|---|---|---|
| `apps/api` | NestJS | health、digital-employees、workflow 绑定、workbench 双实例、ai/probe；JSON 文件持久化 |
| `apps/web` | Vite Vue3 | 员工 + 绑定面板 + M1-01 双实例工作台，真实 API |
| 根 | pnpm + Makefile | `install` / `build` / `test` / `ci` |

许可证见根 `NOTICE.md`。产品 OA 底座验证通过后，允许目录级替换本工程层。

## 4. 阻塞（现行）

| 项 | 状态 |
|---|---|
| Owner 授权 | **已解除**（全权） |
| M0 口径 | **已统一** |
| GitHub `make verify` | **已绿**（CI 修复 `4b5f465` + M0+ `dbfe63d`） |
| 产品 OA 底座终选 | **不阻塞 M0**；阻塞的是「宣称终态商用完成」 |
| 完整 72 AC | **不在 M0 范围** |

## 5. 下一步检查清单

- [x] Owner 裁决：重开 feature 文档轨  
- [x] Owner 全权授权；Agent 写入底座/M0 裁决  
- [x] `make ci` 绿；health / employees / ai probe 真实验证（本地）  
- [x] M0+：数字员工 POST 创建 + JSON 持久化 + 前端列表/创建（已 push `dbfe63d`）  
- [x] GitHub Actions `verify` 变绿（含 CI 修复 `4b5f465` 与本切片 push）  
- [x] Draft PR #3 同步 M0+ 代码  
- [x] 本切片：最小工作流连接闭环（人/任务/员工绑定读写）  
- [ ] 再下一步：按 47 号推进 M1-01（双实例工作台/登录）规划，不抢跑完整运行时  
- [ ] 产品 OA 底座 POC（RuoYi-AI→芋道）与工程层并行  
