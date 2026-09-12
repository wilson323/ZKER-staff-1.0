# 产品需求对齐（优先于编码）

> **状态**：**Agent 全权已授权 + M0 工程编码进行中**（见 [agent-decisions-m0.md](./agent-decisions-m0.md)）。  
> **有效分支**：`cursor/oa-digital-employee-platform-530e`。  
> **与 main 关系**：`main` = 已入库设计事实；本 feature = 需求对齐与平台落地文档轨 + M0 工程实现。  
> **事实源**：本机 `/Users/mac/Documents/OA数字员工协作平台`；仓库内 `docs/设计包/` + `contracts/` 已可对照（**不得误删**）。  
> **Git 仓**：仅 `https://github.com/wilson323/ZKER-staff-1.0.git`。  
> **历史**：曾用 `CODING_PAUSED`；2026-09-12 文档轨重开；同日 Owner 全权授权后废止「待 Owner 批底座/M0」阻塞。

## 1. 对齐目标

1. **产品是什么**（边界、非目标）— 已由 main README/CONTEXT 给出，见 §2  
2. **给谁用**（角色与主场景）— 见 §2 / 47 号首期切片  
3. **M0/M1 最小可交付** — Agent 已统一口径，见 §5  
4. **底座与开源选型** — Agent 已裁决 M0 工程门禁底座；产品 OA 底座按 37/60 验证顺序，见 [agent-decisions-m0.md](./agent-decisions-m0.md)  
5. **契约来源** — 以仓库 `contracts/` + 本机主链为准

## 2. 已确认事实

| 项 | 结论 | 来源级别 |
|---|---|---|
| 产品名 | OA 数字员工协作平台 / ZKER-staff-1.0 | 仓库 README |
| 一句话定义 | 以成熟 OA 工作流连接人、任务与交付；承担人配置数字员工；权限与上下文可控的人机协作平台 | main README/CONTEXT |
| 工程仓 | `wilson323/ZKER-staff-1.0` | `git remote` |
| 设计主链 / contracts | 仓库已入库；对照本机 | main @ `454caf6` |
| 文档轨 | 已重开；本 feature `docs/` 为落地入口 | Owner 2026-09-12 |
| 全权授权 | Owner 授权 Agent 自行裁决底座/M0/编码，不再请示 | 用户指令 2026-09-12 |
| M0 工程门禁底座 | **NestJS + Vue3 + pnpm + OpenAI SDK 适配器**（可商用） | Agent 裁决 |
| 产品 OA 底座 | **未终选**；验证顺序 RuoYi-AI → 芋道 → Plus | 设计包 37/60 |
| 编码纪律 | 禁止 mock；AI 走 OpenAI 协议适配；宽松协议优先 | 用户规则 + NOTICE |

## 3. P0 问题处理（Agent 裁决，不再阻塞 M0）

| 原 P0 | Agent 裁决 |
|---|---|
| 产品一句话定义 | 采用 main README 定义（§2） |
| 首期用户与场景 | 采用 47 号：真实业务实例、承担人/协作人/审核人路径；M0 只做工程门禁，M1 起跑业务链 |
| 对象模型 / contracts | 以仓库 `contracts/`（data-dictionary、openapi、implementation-map）为准 |
| 与现有 OA 关系 | 独立产品仓；组织/身份/流程权威待产品 OA 底座验证后映射 |
| 底座终选 | M0 工程门禁已采用 Nest/Vue；产品 OA 底座继续按 60 号验证，不冒充终选完成 |
| 视觉源 | 以设计包 31 号工作台 HTML 为默认视觉参考（M1+ 再落地 UI） |

## 4. 需求对齐工作流（现行）

```text
设计包/contracts（仓库已入库）对照
  → Agent 裁决写入 docs/agent-decisions-m0.md
  → 按 R-M0 真实编码（禁 mock）
  → make ci / 健康检查 / AI probe 验证
  → 再按 47 号推进 M1（待 M0 门禁绿）
```

**禁止**：发明与 contracts 冲突的领域 API、假员工数据、不可商用主路径底座。  
**禁止**：误删 `main` 已入库设计包。

## 5. M0 需求边界（已定稿）

| 编号 | 需求 | 验收 |
|---|---|---|
| R-M0-01 | 仓库可 install/build/test | `make ci` 通过 |
| R-M0-02 | 健康检查真实可用 | `GET /api/v1/health` → ok |
| R-M0-03 | 无登记时员工列表为空 | `GET /api/v1/digital-employees` → `total=0` |
| R-M0-04 | AI 无密钥真实失败 | `GET /api/v1/ai/probe` 可测 |
| R-M0-05 | 许可证可商用 | `NOTICE.md` |
| R-M0-06 | 设计/contracts 对照点明确 | 本文件 + `contracts/README.md` |

## 6. 非目标（M0）

- 不实现完整数字员工运行时 / 编排引擎  
- 不编造 00–60 未给出的业务模块  
- 不切换到其他 Git 仓库  
- 不引入需付费闭源 SDK 作为硬依赖  
- 不宣称产品 OA 底座已终选或 72 AC 已通过  

## 7. 开源商用约束

1. 宽松协议（MIT / Apache-2.0 / BSD）  
2. 成熟维护  
3. 目录级可替换（产品 OA 底座验证后可整体替换工程层）  

组件名单以根目录 `NOTICE.md` 为准。

## 8. 当前决策

| 决策 | 内容 |
|---|---|
| 文档轨 | 已重开；本文件 + plan + decisions 为入口 |
| 全权 | Agent 已授权，不再因底座/M0 向用户请示 |
| M0 编码 | **进行中** — `apps/api` + `apps/web` |
| 下一步 | 完成 R-M0-01…05 验证 → 再按 47 切入 M1 |

## 9. 回传清单（本机可选增强，不阻塞 M0）

1. 若本机与仓库设计包有 diff，回传差异摘要  
2. 产品 OA 底座 POC 结果（RuoYi-AI / 芋道）  
3. 视觉/品牌最终确认（若偏离 31 号）  
