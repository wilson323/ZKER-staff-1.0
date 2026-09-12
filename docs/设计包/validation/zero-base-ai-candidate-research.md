# 从零开发企业 OA + 数字员工：AI 侧开源候选与许可研究

核查日期：2026-09-11。范围：不受现有产品代码约束；需要企业 B/S、人员职责与 OA 待办、由人配置本任务数字员工、市场资源复制、上下文交接；目标为允许闭源修改、交付和商业运营，并尽可能少开发。状态：`RESEARCHED_NOT_INSTALLED_OR_INTEGRATION_TESTED`。

本文件独立核查 AI 侧；OA 底座由主报告比较。结论中的“工作量”是依赖与缺口推断，不是实测人日。没有安装、执行或集成候选，也没有修改产品仓库。许可证结论针对实际查阅的一方代码；第三方依赖、模型权重和外部服务条款分别适用，不能把根 LICENSE 等同于所有依赖已经审计。

## 1. 结论

**若最终选择已有 AI 模块的 Java OA 完整平台，最省工作量通常是继续使用其已有 Spring AI / Spring AI Alibaba 集成，按需增加 Agent 能力；不再并排部署另一个完整 AI 管理平台。** Spring AI Alibaba 本体和 Admin 前端的许可是 Apache-2.0，Studio 聊天 UI 子目录为 MIT，适合商业产品二次开发；但完整 Admin 自带另一套前端、数据和中间件，搬入整个平台未必省工。[SAA 主许可](https://github.com/alibaba/spring-ai-alibaba/blob/f82da0b50f35744c13968191be2b1cd2452ef550/LICENSE)、[Admin 前端许可](https://github.com/alibaba/spring-ai-alibaba/blob/f82da0b50f35744c13968191be2b1cd2452ef550/spring-ai-alibaba-admin/frontend/LICENSE)、[Studio UI 许可](https://github.com/alibaba/spring-ai-alibaba/blob/f82da0b50f35744c13968191be2b1cd2452ef550/spring-ai-alibaba-studio/agent-chat-ui/LICENSE)。

**AgentScope Java 2.x 是更贴近“长期运行数字员工”的备选 SDK**，原生涵盖工作区、技能、人工许可、持久状态和子 Agent。其新 Service 平台很接近数字员工控制台，但不宜为了省工直接拼出两个管理中心；需要单独验证发布稳定性、身份映射和运行隔离。**Langflow 是许可较简单、可视化最直接的另一条 AI 构建路线**，但官方明确不提供单进程租户安全隔离。Flowise 已归档且含企业商业代码；Dify / n8n 有与本需求直接相关的商业限制，不能统一称为“整套无限制白标商用”。相关逐项证据见下表和后文。

## 2. 当前版本和分支证据

以下通过 GitHub 官方 REST API `GET /repos/{owner}/{repo}`、`/releases/latest`、`/commits/{default_branch}` 实时读取。Release 与主分支并非同一快照；列出的功能来自下文明确引用的分支/文件，不能推断全部已在该发行包验收。

| 项目 | Latest release / 发布日期 UTC | 本次默认分支 HEAD | 维护状态 |
|---|---|---|---|
| Spring AI Alibaba | [v1.1.2.2](https://github.com/alibaba/spring-ai-alibaba/releases/tag/v1.1.2.2) / 2026-03-10 | `main` / `f82da0b50f35744c13968191be2b1cd2452ef550` | 未归档 |
| AgentScope Java | [v2.0.3](https://github.com/agentscope-ai/agentscope-java/releases/tag/v2.0.3) / 2026-09-07 | `main` / `c5db8f72dbea5c2c70de96885e4167ce5b1b24b0` | 未归档 |
| Flowise | [flowise@3.1.4](https://github.com/FlowiseAI/Flowise/releases/tag/flowise%403.1.4) / 2026-07-29 | `main` / `9291856d1ea4a4ceea9f8fef8ce14f4f6c81e8eb` | **2026-08-13 归档** |
| Langflow | [v1.12.1](https://github.com/langflow-ai/langflow/releases/tag/v1.12.1) / 2026-09-08 | `main` / `595cd72a2b2021f2375fa31109af02d20bb17648` | 未归档 |
| Dify | [1.17.1](https://github.com/langgenius/dify/releases/tag/1.17.1) / 2026-09-10 | `main` / `e7981a6f19435d52ef4b92f71054739ebc2b593e` | 未归档 |
| n8n | [n8n@2.38.7](https://github.com/n8n-io/n8n/releases/tag/n8n%402.38.7) / 2026-09-11 | `master` / `d11d185f5ca82ac4ae32a9930c7d416438a62f53` | 未归档 |

[Flowise 仓库归档标记](https://github.com/FlowiseAI/Flowise)、[Flowise 官方 API](https://api.github.com/repos/FlowiseAI/Flowise)。归档日期同时得到仓库网页和 API `archived=true` 交叉支持；不能沿用旧搜索摘要中的活跃社区表述。

## 3. 许可与闭源商用适配

| 候选 | 查阅的真实许可边界 | 对本项目的判断 |
|---|---|---|
| Spring AI Alibaba | 根、Admin、Admin 前端均 Apache-2.0；Studio `agent-chat-ui` 单独 MIT | 可作为无需另购一方商业授权的候选，保留适用的许可证/版权/NOTICE/修改声明；不把云服务纳入许可 |
| AgentScope Java | 根 Apache-2.0；当前递归树未发现类似 Flowise 的 `enterprise` 商业许可分区；SDK 子目录另有 LICENSE | 一方框架适合闭源商用；不能因此宣布所有插件、模型及 Service 第三方依赖全部无条件 |
| Langflow | 当前主仓根 MIT，递归树只发现该根 LICENSE | 一方平台可商业修改与分发，须保留版权和许可文本；安全隔离工作仍在产品方 |
| Flowise | `packages/server/src/enterprise` 与有明确标记的文件（含 `IdentityManager.ts`）商业许可，其余为 Apache-2.0，第三方按原许可 | **整仓不满足本次“无额外商业授权拿来开发”的筛选口径**；仅明确 Apache 部分是候选，切分与构建兼容性未验证 |
| Dify | 修改版 Apache-2.0，额外限制多租户环境和其前端 LOGO/版权修改 | 不能无条件用作本产品多租户白标整套底座；不等于所有商业后端场景都被禁止 |
| n8n | Sustainable Use License；`.ee.` 文件/目录另属企业许可，非 master 分支另有边界 | 面向客户转售工作流、白标、客户自带账号连接器不宜按免费开源许可落地；内部使用/部分公司自有凭据后台用途与此不同 |

逐项原文：[AgentScope LICENSE](https://github.com/agentscope-ai/agentscope-java/blob/c5db8f72dbea5c2c70de96885e4167ce5b1b24b0/LICENSE)、[Langflow LICENSE](https://github.com/langflow-ai/langflow/blob/595cd72a2b2021f2375fa31109af02d20bb17648/LICENSE)、[Flowise LICENSE.md](https://github.com/FlowiseAI/Flowise/blob/9291856d1ea4a4ceea9f8fef8ce14f4f6c81e8eb/LICENSE.md)、[Flowise 企业许可](https://github.com/FlowiseAI/Flowise/blob/9291856d1ea4a4ceea9f8fef8ce14f4f6c81e8eb/packages/server/src/enterprise/LICENSE.md)、[Dify LICENSE](https://github.com/langgenius/dify/blob/e7981a6f19435d52ef4b92f71054739ebc2b593e/LICENSE)、[n8n LICENSE](https://github.com/n8n-io/n8n/blob/d11d185f5ca82ac4ae32a9930c7d416438a62f53/LICENSE.md)。

### Dify 的准确边界

Dify 明确允许商业使用，包括其他应用的后端；但未获书面授权不得运营多租户环境，且把一个 workspace 定义为一个 tenant。使用 `web/` 或 Docker web 镜像构成其前端时，不得移除或修改 LOGO 和版权信息；不用其前端时，该前端限制不适用。因此“单租户、仅后端”与“每家客户/部门独立 workspace + 自有品牌控制台”要分开判断。本需求强调员工、权限、市场和完整 UI，不能把“后端可商用”偷换为“整个平台可无额外限制地复制转售”。依据为上表固定 SHA 的 Dify LICENSE。

### n8n 的准确边界

官方 FAQ 明确列出白标收费、托管后收费访问为不允许的例子；后台使用客户自己的外部系统凭据也不在其示例许可范围内。用公司自己的凭据为应用提供聊天等后台功能是允许例子。因本产品要求员工配置自己的连接器/数字员工、向客户交付流程能力，不能以 n8n 的“可内部商业使用”推断完整嵌入转售许可。[官方 FAQ 源文件](https://github.com/n8n-io/n8n-docs/blob/main/docs/n8n-community-license/README.md)。本次旧文档 URL `/sustainable-use-license` 返回迁移/不存在页，因此改查官方 docs 仓库，而非使用陈旧搜索摘要。

## 4. 已核实能力、UI 和整合成本

### Spring AI Alibaba：Java OA 的优先增量方案

已核实：Agent Framework、Graph 持久状态/分支/流式、多 Agent 模式，基于 Spring AI 的模型/Tool/MCP；`HumanInTheLoopHook` 可审批、修改或拒绝工具调用，使用持久 checkpoint 才能用于跨进程恢复。Admin 是 Prompt、数据集、评估、实验、追踪和模型配置控制台；当前 Admin 前端有 Umi 4、Ant Design 5、TypeScript 和 React 相关依赖。[框架 README](https://github.com/alibaba/spring-ai-alibaba/blob/f82da0b50f35744c13968191be2b1cd2452ef550/README.md)、[HITL 官方说明](https://java2ai.com/en/docs/frameworks/agent-framework/advanced/human-in-the-loop/)、[Admin README](https://github.com/alibaba/spring-ai-alibaba/blob/f82da0b50f35744c13968191be2b1cd2452ef550/spring-ai-alibaba-admin/README.md)、[前端包文件](https://github.com/alibaba/spring-ai-alibaba/blob/f82da0b50f35744c13968191be2b1cd2452ef550/spring-ai-alibaba-admin/frontend/packages/main/package.json)。

知识能力可通过文档加载、向量库和 Agent 工具检索实现，不能把阿里云百炼知识库的托管能力算作开源平台免费附送。[RAG 官方说明](https://v1100.java2ai.com/docs/frameworks/agent-framework/advanced/rag/)。

整合推断：若 OA 底座已经用 Spring AI，则使用已有模型、知识、工具配置存储，增加任务绑定/执行适配器，成本最低。无需为复用 SDK 部署完整 Admin。若整套引入 Admin，将新增另一 UI/身份/资源层，其 README 启动栈还涉及 MySQL、Elasticsearch、Nacos、Redis、RocketMQ。当前根 pom 为 Java 17、Boot 3.5.8、Spring AI 1.1.2；**与另一底座选定 BOM 是否兼容尚未编译验证**。[SAA pom](https://github.com/alibaba/spring-ai-alibaba/blob/f82da0b50f35744c13968191be2b1cd2452ef550/pom.xml)。

未证实：完整企业 OA、待办/加签/转交、员工市场授权继承、数字员工节点绑定及签收上下文已开箱覆盖；本次没有其证据，不计为“已省掉”。

### AgentScope Java：长期数字员工能力强，Service 与 SDK 分开算

已核实：2.x 的 `ReActAgent` / `HarnessAgent`、工作区/沙箱、按 user/session 保存状态、人工许可 allow/ask/deny、流式事件、子 Agent；技能可来自 Git/MySQL/Nacos/工作区，含个人与共享来源；MCP 接入有官方 Tool 文档。v2.0.3 新增/修复执行状态版本和乐观并发、MCP 注册结果、前端会话展示等。[2.x README](https://github.com/agentscope-ai/agentscope-java/blob/c5db8f72dbea5c2c70de96885e4167ce5b1b24b0/README.md)、[Skills](https://java.agentscope.io/v2/en/docs/harness/skill.html)、[Tool/MCP](https://java.agentscope.io/v2/en/docs/building-blocks/tool.html)、[v2.0.3 release](https://github.com/agentscope-ai/agentscope-java/releases/tag/v2.0.3)。

知识方面有 `rag-simple` 文档加载/切片/向量库适配和外部平台集成说明，但 2.0 RC 迁移说明曾标记旧 RAG API 待重写，当前文档部分示例仍使用旧风格接口。故知识集成需要固定发行版实际编译，不能把跨版本文档拼成已验证功能。[当前 Simple RAG 文档](https://github.com/agentscope-ai/agentscope-java/blob/c5db8f72dbea5c2c70de96885e4167ce5b1b24b0/docs/v2/en/integration/rag/simple.md)、[迁移说明所在 release](https://github.com/agentscope-ai/agentscope-java/releases/tag/v2.0.0-RC1)。

新增 Service 已有 Managed Agents、工作区/记忆、持久 Session、HITL 恢复、Teams、观测台；前端为 React 18 + Vite + Radix/Tailwind；后端整体包含 Go 控制面、Java dataplane/scheduler/gateway、PostgreSQL。它不是单纯加一个 Java jar。当前 main 的 Service README 还含未发布/开发 schema 替换提示，虽同仓已有 v2.0.3 标签和部署指南，**本次不能确认 Service 独立发行成熟度与 SDK 一样**。[Service README](https://github.com/agentscope-ai/agentscope-java/blob/c5db8f72dbea5c2c70de96885e4167ce5b1b24b0/agentscope-service/README.md)、[Service 前端](https://github.com/agentscope-ai/agentscope-java/blob/c5db8f72dbea5c2c70de96885e4167ce5b1b24b0/agentscope-service/frontend/package.json)。

整合推断：需要长期沙箱工作、Skills、复杂子 Agent 时，作为单一 SDK 备选很强；若已有 Spring AI AI 模块，为最小工作量不应同时叠两套 Agent loop。Agent Teams 任务协作也不等于人类 OA 的职责、加签、授权和签署规则。

### Langflow：可视化丰富，但企业隔离绝非零开发

已核实：可视化 Agent/flow、组件与 API、MCP 客户端/服务端、Knowledge Base 的摄入与检索；Human Input 和 Agent 工具审批都支持 checkpoint 后继续，不重新执行先前步骤。当前前端包含 React 19、ReactFlow/XYFlow 与 Radix；后端为 Python 生态。[仓库](https://github.com/langflow-ai/langflow)、[MCP 客户端](https://github.com/langflow-ai/langflow/blob/595cd72a2b2021f2375fa31109af02d20bb17648/docs/docs/Agents/mcp-client.mdx)、[HITL](https://github.com/langflow-ai/langflow/blob/595cd72a2b2021f2375fa31109af02d20bb17648/docs/docs/Flows/human-in-the-loop.mdx)、[知识组件](https://github.com/langflow-ai/langflow/blob/595cd72a2b2021f2375fa31109af02d20bb17648/docs/docs/Components/knowledge-base.mdx)、[前端依赖](https://github.com/langflow-ai/langflow/blob/595cd72a2b2021f2375fa31109af02d20bb17648/src/frontend/package.json)。

决定性限制：官方 1.12.x 安全页明确单个 Langflow 进程不强制用户隔离，界面可见性控制不是安全边界；第三方租户部署需要外部进程、磁盘、网络、数据库隔离，鉴权在容器外实施。[官方 Security](https://docs.langflow.org/security)。

整合推断：适合可信内部设计人员的 AI 编排台，或作为受控、隔离的执行服务；Java OA 若以它为节点执行后端，会增加 Python 服务、两套 UI、执行身份/资源授权和隔离运维。它的 MIT 许可很友好，但这不证明项目总工作量比用已有 Java AI 模块更少。

### Flowise：不要把现成 UI 与商业目录混算

已核实：有 Assistant/Chatflow/Agentflow 可视化，工具、MCP、知识库、Human Input、checkpoints。[官方 Agentflow V2](https://docs.flowiseai.com/using-flowise/agentflowv2)。但现成角色、工作区、SSO 的核心文件集中在 `packages/server/src/enterprise`：包括 `role.controller.ts`、`workspace.controller.ts`、`rbac/PermissionCheck.ts`、`sso/*`，受该目录商业许可约束。[企业代码目录](https://github.com/FlowiseAI/Flowise/tree/9291856d1ea4a4ceea9f8fef8ce14f4f6c81e8eb/packages/server/src/enterprise)。

整合推断：仅采用 Apache 子集还要处理身份、隔离与企业目录切分；本次未运行“去企业代码后仍能独立构建”的验证。加上归档状态，不列为本需求最低工作量主选。没有据此宣称其社区部分不能商业使用。

## 5. 最少仍需自建的产品连接层

以下为本产品需求推导，不冒充任何候选的缺陷审计。无论选择哪个 AI 框架，都要在 OA 权威任务上补这层：

1. `humanTaskId → assignedUserId → agentBindingVersion`：由当前承担人选择数字员工；转交后旧绑定与执行如何终止/重建要明确。
2. 数字员工/技能/工具市场模板与个人实例分离，复制时冻结来源版本，不复制他人的凭据；可见、可复制、可使用、可配置分别鉴权。
3. 每次运行固定 tenant、流程实例、任务、人员、Agent/技能/工具/模型版本与授权快照；一个用户的多个流程/同流程多个实例不能串上下文。
4. 接收上游经人确认的业务字段、交付物版本、来源与未解决事项；下游生成自己的上下文，不共享所有私人聊天。
5. Agent 完成只产生待确认交付物；人员确认或审批通过再推动 OA 状态，防止把 AI 工具批准等同于业务审批。
6. 执行失败/超时/人工干预/取消/重试的幂等与回调，转办、退回、撤回后的失效执行回收。
7. 企业凭据托管与按任务下发最小权限，知识检索按业务权限过滤，附件与运行沙箱隔离。
8. 员工任务工作台、数字员工设置、主管/管理员市场治理使用同一身份与数据权限；不能用第二平台的角色菜单替代这些语义。

**因此主方案的取舍应看“OA 平台已自带多少 AI 模块”，而不是把四个 AI 平台一起拼装。** 如果该底座已覆盖模型、聊天、知识、MCP、AI 工作流，先补上述连接层最直接；仅当实际验收显示 Agent 生命周期能力缺失时，再在 Spring AI Alibaba 与 AgentScope Java 中挑一个运行实现，避免双重状态源。

## 6. 证据和未验证范围

实际执行：官方网页检索、官方 GitHub API 元数据/递归树读取、固定 SHA 的 LICENSE/README/package/pom 和官方能力文档读取；均为只读 HTTP。成功的 curl 批次退出码 0。两个旧 URL（n8n 旧许可页、旧 embed 页）不可用，已用官方 n8n-docs 源文件补证；Flowise 某旧工作区文档链接不可达，用当前企业源码目录核实。没有通过搜索摘要推断许可证。

未做：依赖全量 SBOM 许可证扫描、构建、部署、浏览器体验、模型调用、真实 MCP、跨租户攻击验证、实际性能压测、UI 与 OA 嵌入开发。因此本结论是**有源码/许可证依据的选型候选**，不是集成通过或上线认证。
