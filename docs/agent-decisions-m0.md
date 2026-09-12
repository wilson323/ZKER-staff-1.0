# Agent 全权裁决记录（底座 / M0）

| 项 | 值 |
|---|---|
| 日期 | 2026-09-12 |
| 授权依据 | Owner：「以后不要再问了，所有全授权给智能体」 |
| 有效分支 | `cursor/oa-digital-employee-platform-530e` |
| 仓库 | `https://github.com/wilson323/ZKER-staff-1.0.git` |
| 裁决人 | 执行 Agent（全权） |

## 1. 底座裁决

### 1.1 产品 OA 底座（设计轨推荐，未冒充终选完成）

设计包 **37 / 46 / 60** 推荐验证顺序：

1. 先验证 **RuoYi-AI** 合法社区子集（公开 SQL / 身份 / Warm-Flow / AI 能力）
2. 再比较 **芋道** 成熟 OA/BPM/Vue3 收益是否覆盖 BOM、许可与独立 DDL 成本
3. Plus 等为第三对照

设计原文明确：最终底座仍可为 `PENDING_SELECTION`，不能把条件性映射写成已采用。

**Agent 裁决**：产品 OA 底座 **不在本回合终选**；下一验证仍按 60 号顺序推进。本回合不下载不明 SQL、不整库合并 AGPL 参考实现。

### 1.2 M0 工程门禁底座（本回合已采用）

为满足 28/47 号 M0 中「干净构建、版本锁、许可证清单、构建入口」及对齐文档 R-M0-01…05，**立即采用可商用工程骨架**：

| 层 | 选型 | 协议 | 理由 |
|---|---|---|---|
| 包管理 | pnpm workspace | MIT | 成熟、可商用 |
| API | NestJS（Node 22） | MIT | 可替换、官方脚手架、OpenAI SDK 易接 |
| Web | Vite + Vue 3 | MIT | 与 37 号「统一 Vue3」方向一致且可商用 |
| AI | OpenAI 官方 Node SDK + 本仓适配器 | Apache-2.0 | 强制 OpenAI 协议；无密钥真实失败 |
| 语言 | TypeScript | Apache-2.0 | 前后端一致 |

**明确边界**：本骨架是 **M0 工程门禁与协作 API 落地层**，**不是** 产品 OA 底座终选，目录级可整体替换；领域模型不绑死在 Nest 模块名上。

## 2. M0 范围统一口径

合并对齐文档 §5 与 28/47 最小可运行切片，本回合 M0 验收为：

| 编号 | 需求 | 验收 |
|---|---|---|
| R-M0-01 | 仓库可 install/build/test | `make ci` 通过 |
| R-M0-02 | 健康检查真实可用 | `GET /api/v1/health` → ok（含真实 uptime） |
| R-M0-03 | 数字员工登记为空则 total=0 | `GET /api/v1/digital-employees`；禁止 mock 员工 |
| R-M0-04 | AI 未配置密钥时真实失败 | `/api/v1/ai/probe` 可测 |
| R-M0-05 | 许可证可商用 | 根 `NOTICE.md` |
| R-M0-06 | 设计/contracts 对照点 | 以仓库 `docs/设计包` + `contracts/` 为准（main 已入库） |

**非目标（本回合）**：完整数字员工运行时、Flowable/Warm-Flow 集成、员工市场、多租户生产部署。

## 3. 授权状态变更

| 原阻塞表述 | 新状态 |
|---|---|
| 待 Owner 底座终选 / 「仅 M0 实验」授权 | **Agent 全权已授权**；M0 工程门禁底座已按上表采用 |
| 待 Owner 批 M0 边界 | **Agent 已统一口径**（上表） |
| CODING_PAUSED / 本回合不扩业务代码 | **废止**；允许按 M0 真实编码 |

## 5. M0+ 后续：最小工作流连接闭环（本切片）

| 项 | 值 |
|---|---|
| 日期 | 2026-09-12 |
| 目标 | 人 / 人任务 / 数字员工绑定真实读写 |
| 需求锚点 | CN-01（绑定可回读；非完整 AC 全量） |
| 非目标 | 完整 C04 合同、执行循环、OA 引擎身份 |

### API

| 方法 | 路径 | 行为 |
|---|---|---|
| GET/POST | `/api/v1/work-items` | 工作项列表/创建，JSON 落盘 |
| GET/POST | `/api/v1/human-tasks` | 人任务列表/创建（须挂已有 workId） |
| GET/POST | `/api/v1/task-bindings` | 绑定列表/创建；ASSISTED/AUTONOMOUS 校验员工存在 |
| GET | `/api/v1/task-bindings/:id` | 单条回读 |

### 前端

`WorkflowBindingPanel.vue`：工作项 → 人任务 → 绑定表单，调用真实 API。

### 验证

见任务记录 `validation/development-task-task-m0plus-workflow-binding-20260912.json`；冒烟脚本 `scripts/curl_workflow_binding_smoke.sh`。

## 6. M1-01 双实例工作台（本切片）

| 项 | 值 |
|---|---|
| 日期 | 2026-09-12 |
| 目标 | 同模板 A1/A2、幂等回放、租户隔离待办/草稿 |
| 需求锚点 | 47 号 M1-01；WD-01/WD-02 最小切片 |
| 非目标 | 完整 AC-01/02/03/07、OA 登录、完整运行时 |
| 会话 | 请求头 `X-Tenant-Id` / `X-Person-Id` 派生；禁止正文传主体 |

### API

| 方法 | 路径 | 行为 |
|---|---|---|
| GET | `/api/v1/workbench/session` | 回显会话 |
| GET/POST | `/api/v1/workbench/templates` | 已发布模板列表 / 按 code 确保 |
| GET/POST | `/api/v1/workbench/instances` | 租户内实例；同幂等键回放 |
| GET | `/api/v1/workbench/instances/:id` | 本租户详情；跨租户 404 |
| PUT | `/api/v1/workbench/instances/:id/draft` | 实例私有草稿 |
| GET | `/api/v1/workbench/todos` | 本人待办聚合 |

### 前端

`DualInstanceWorkbench.vue`：发起 A1/A2、待办列表、打开实例与草稿；表单 `label[for]`/`id` 关联。

### 验证

见 `validation/development-task-task-m1-01-dual-instance-workbench-20260912.json`；冒烟 `scripts/curl_dual_instance_workbench_smoke.sh`。
