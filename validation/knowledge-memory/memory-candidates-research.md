# OA 项目记忆开源候选源码研究

研究日期：2026-09-11。范围：Mem0 开源版、OpenViking、Graphiti、LangChain4j 原生持久化 ChatMemory；只读官方文档、源码、许可证和发布信息。本笔记不代表完成安装、兼容构建、模型评测或商用发行包审核。全部 POC 为 `NOT_RUN`。

## 1. 结论与适用业务

**首期建议复用既有 OA 底座的 Java SDK 记忆接口、业务数据库和文件版本机制，建立“对话窗口 + 可审阅的记忆文档 + 已确认事实记录”；不新增独立自动记忆引擎。** 若 M0 最终采用 RuoYi-AI，优先使用它依赖的 LangChain4j 1.17.2 `ChatMemoryStore` 接口。若改选 Spring AI 底座，沿用同一业务合同映射其原生接口，不同时运行两套 SDK 循环。这是结合本项目多流程、多实例、人员责任、版本确认、通用权限与低复杂度要求的工程判断。

本项目的“记忆”至少区分五种对象，不能全部写进一个用户向量空间：

| 对象 | 权威位置与用途 | 提交/共享规则 |
|---|---|---|
| 用户可见对话历史 | OA 原有消息及产物引用，支持审计与历史摘要 | 历史本身按当前权限投影；摘要不能获得高于来源的权限 |
| SDK 会话窗口 | `ChatMemoryStore` 持久化的模型输入窗口 | 按租户、工作实例、执行轮次、主体、用途隔离；可淘汰，不能代替完整历史 |
| 私人偏好/团队经验文档 | Markdown 内容、版本/摘要、来源引用，复用原有文档服务 | AI 提出候选，用户可逐条确认、编辑、撤销；默认不扩大共享 |
| 业务事实与本体关系 | 同一业务数据库中带来源版本、确认状态、有效期的记录 | 人员确认才生效；由责任轮次和业务版本约束，模型不能自行改权威事实 |
| 流程/技能经验 | 已验收任务中的经验候选、评测与发布版本 | 走既有进化评审、试用、回滚，不让记忆库控制 OA 流程或自动改权限 |

QoderWake 的文档式记忆交互可用作产品入口参考：工作空间/知识/记忆有作用域，Markdown/MEMORY.md 可编辑、可比较与回滚。**此处该产品细节由主研究负责核实；本笔记只提出集成要求，不把第三方交互等同于本项目已实现。** 文档可读可编辑不意味着路径本身具有权限；业务数据库仍须记录文档版本、作用域、来源、确认人和撤权状态。整份历史回滚应生成新版本，重新按当前权限验证，不能复活已撤权来源或恢复旧授权。

## 2. 固定版本与许可事实

“最新发行”和“研究 HEAD”分开；HEAD 只用于读取当前变化，不能代替稳定发布锁定。下列 SHA 来自 2026-09-11 官方 GitHub API，原始响应与逐文件 SHA256 保存在 [memory-sources](memory-sources/) 和 [source-manifest.json](memory-sources/source-manifest.json)。

| 候选 | 最新相关发行 / 发布时间 | 本次固定源码 | 根许可及判断 | 建议 |
|---|---|---|---|---|
| LangChain4j | 1.20.0 / 2026-09-04；RuoYi-AI 候选依赖仍是 1.17.2 | 1.17.2 tag 解析为 `80b747681106494d57d767cb66ef2c4999d20cb1`；比较 HEAD `0028928eab6d3b0c11d9be13c6a06e9f0abd9512` | Apache-2.0；接口库可作为闭源商业集成候选，具体依赖仍按最终构建核验 | **首期，复用接口并补齐适配** |
| Mem0 Python OSS | v2.0.20 / 2026-09-02；GitHub latest 为 pi-agent-v0.3.0 插件，不能误当 Python 核心版本 | `c7ee362aff94a369af70f13f2b4f853f6793ff4c`，pyproject 2.0.20 | Apache-2.0；所选 Python 核心允许进入商用候选，云服务、可选依赖和发行包另核 | **后续偏好/经验候选提取插件** |
| Graphiti | v0.30.2 / 2026-09-08 | `c035afb7990b6077331a81e98b04efcfd9bf8184`，pyproject 0.30.2 | Apache-2.0；图数据库许可不能继承根许可 | **有实证图检索需求后再评估** |
| OpenViking | v0.4.19 / 2026-09-08 | `0f77ab5625a5e2ead4f286d4e58ea77e05fcfdee` | 当前主项目 **AGPLv3**，CLI/examples 才是 Apache-2.0，third_party 各自许可；不按无额外许可的闭源二开包准入 | **本期不选为产品内置底座** |

许可依据：[LangChain4j 1.17.2 LICENSE](https://github.com/langchain4j/langchain4j/blob/80b747681106494d57d767cb66ef2c4999d20cb1/LICENSE)、[Mem0 LICENSE](https://github.com/mem0ai/mem0/blob/c7ee362aff94a369af70f13f2b4f853f6793ff4c/LICENSE)、[Graphiti LICENSE](https://github.com/getzep/graphiti/blob/c035afb7990b6077331a81e98b04efcfd9bf8184/LICENSE)、[OpenViking LICENSE](https://github.com/volcengine/OpenViking/blob/0f77ab5625a5e2ead4f286d4e58ea77e05fcfdee/LICENSE)与[组件许可说明](https://github.com/volcengine/OpenViking/blob/0f77ab5625a5e2ead4f286d4e58ea77e05fcfdee/README.md)。

AGPL/GPL 并非禁止商用；它们的源码提供及分发义务需要与具体部署和二开边界核对。因此此处“不选”是对本项目“尽可能免费开源复用、闭源二开、商业部署及客户交付”组合条件的准入判断，不能概括为软件不能商用。OpenViking 旧资料或网页页脚中的 Apache 标记不能覆盖本次固定提交的主 LICENSE，也不能用本机已装 OpenViking 推导新产品已采用。

## 3. 原生 LangChain4j：首期最小方案

### 已确认能力与适配量

1. 1.17.2 的 `ChatMemoryStore` 明确提供 `getMessages(memoryId)`、`updateMessages(memoryId,messages)`、`deleteMessages(memoryId)`，可连接既有数据库；窗口策略负责模型上下文裁剪。[固定接口源码](https://github.com/langchain4j/langchain4j/blob/80b747681106494d57d767cb66ef2c4999d20cb1/langchain4j-core/src/main/java/dev/langchain4j/store/memory/chat/ChatMemoryStore.java)
2. 官方明确区分 memory 与 history，窗口裁剪时持久化 store 也会失去被裁剪消息；要完整历史须单独保存。不能把窗口表直接展示为完整聊天记录。[官方说明](https://docs.langchain4j.dev/tutorials/chat-memory/)
3. 当前官方 AI Services 文档说明未指定 `@MemoryId` 时可能使用 `"default"`；同一 memoryId 并发调用可能破坏窗口，SDK没有自动互斥保障。[固定 AI Services 文档](https://github.com/langchain4j/langchain4j/blob/0028928eab6d3b0c11d9be13c6a06e9f0abd9512/docs/docs/tutorials/ai-services.md#chat-memory)
4. 最新 1.20.0 增加实验性 non-blocking/reactive 路径及可选 Jackson3；不应为记忆需求直接升级现有候选依赖树。[官方发行说明](https://github.com/langchain4j/langchain4j/releases/tag/1.20.0)

**当前 RuoYi-AI 适配不是可直接宣布完成的持久化方案。** 主研究提供的固定候选源码已经复读：`PersistentChatMemoryStore.updateMessages` 只解析 sessionId 和写成功日志，没有实际写库；`getMessages` 异常返回空列表，`deleteMessages` 捕获异常后只记录日志。因此首期方案是“复用接口/现有消息服务与数据库”，不是“原类已实现完整可靠记忆”。空窗口与读取失败必须区分，真实删除失败必须对调用方可见。[RuoYi-AI 固定源码](https://github.com/ageerle/ruoyi-ai/blob/cca30905778357e3aeb42b6adb65ef2384e75e60/ruoyi-modules/ruoyi-chat/src/main/java/org/ruoyi/service/chat/impl/memory/PersistentChatMemoryStore.java)

### 商用与成熟度边界

Java SDK 已有持续版本发行、窗口实现、接口扩展机制和测试；这构成可复用的工程基础，不证明本项目持久化、并发控制和权限已通过。默认窗口既不需要新向量数据库，也不需要额外记忆服务。长期记忆可先复用知识检索索引；索引是派生读取层，事实记录仍在业务数据库。模型权重/API条款、JDBC驱动与最终BOM另核，Apache根许可不能代替完整SBOM。

## 4. Mem0：合适的可选自动提取插件，不是权限系统

### 已确认

Python 核心在固定 pyproject 中为2.0.20、Python >=3.10；包含 Qdrant client、OpenAI client、PostHog、SQLAlchemy 等依赖，可切换存储和模型。官方 OSS 当前也提供独立服务器、面板及 API keys；不要把 Platform 文档直接套到 OSS API。[固定依赖](https://github.com/mem0ai/mem0/blob/c7ee362aff94a369af70f13f2b4f853f6793ff4c/pyproject.toml)、[OSS入口](https://docs.mem0.ai/open-source/overview)

`add(infer=True)` 默认用模型提取事实；`infer=False` 可直接保存文本。身份支持 user_id/agent_id/run_id；当前 Python `search/get_all` 用 filters。它们是存储分组与检索过滤参数，不能单独证明本项目 tenant/work/responsibilityEpoch/purpose 与源版本权限。[固定 main.py](https://github.com/mem0ai/mem0/blob/c7ee362aff94a369af70f13f2b4f853f6793ff4c/mem0/memory/main.py#L760)

重要读取边界：固定 `server/main.py` 中 `get/update/history/delete` 使用 `verify_auth` 后直接调用 `get_memory_instance()`；`server_state.py` 返回同一全局实例。上述端点未将认证用户强制绑定 `memory_id` 所属实体，列表与搜索 scope 主要由请求传入。**已确认源码缺少本项目所需对象级绑定，不将它描述为已运行验证的跨租户漏洞。** 本项目不得直接把它的服务/面板/API 暴露给业务用户；必须由 OA 适配器完成授权、作用域派生和回读校验。[端点源码](https://github.com/mem0ai/mem0/blob/c7ee362aff94a369af70f13f2b4f853f6793ff4c/server/main.py#L443)、[全局实例](https://github.com/mem0ai/mem0/blob/c7ee362aff94a369af70f13f2b4f853f6793ff4c/server/server_state.py#L103)、[认证实现](https://github.com/mem0ai/mem0/blob/c7ee362aff94a369af70f13f2b4f853f6793ff4c/server/auth.py)

删除不是完整遗忘：`_delete_memory` 删除向量后把原 `prev_value` 写入 history 的 DELETE 记录；实体关联清理异常被当成非致命处理。`delete_all` 采用分批循环，可停止于重复批次。单个成功响应不能证明历史、实体关联、备份、摘要、向量缓存全部清理，必须另建失效回执及遗忘验证。[删除源码](https://github.com/mem0ai/mem0/blob/c7ee362aff94a369af70f13f2b4f853f6793ff4c/mem0/memory/main.py#L2100)、[history实现](https://github.com/mem0ai/mem0/blob/c7ee362aff94a369af70f13f2b4f853f6793ff4c/mem0/memory/storage.py)

### 成熟度和首期成本

有多版发布、单测和服务器认证测试，但本次未运行；`tests/test_memory.py` 还包含 Mock，不能以其存在证明真实向量后端业务通过。v2.0.20发布修正 notices 远端配置行为，历史版本也修过删除分批及过滤行为，应固定生产版本和回归数据集。[Python发行](https://github.com/mem0ai/mem0/releases/tag/v2.0.20)、[测试源码](https://github.com/mem0ai/mem0/blob/c7ee362aff94a369af70f13f2b4f853f6793ff4c/tests/test_memory.py)

源码默认 `MEM0_TELEMETRY=True`；业务试点应关闭遥测并检查实际出站，同时逐项显式配置模型与存储，不能把 SDK 已装当成本地不外传。[遥测源码](https://github.com/mem0ai/mem0/blob/c7ee362aff94a369af70f13f2b4f853f6793ff4c/mem0/memory/telemetry.py#L14)

建议后续只接为无状态候选提取/检索适配：先把输入限为获准可处理的来源，抽取结果写“待确认记忆文档”，由现有人员确认与发布机制生效。不要让 Mem0 默认推理直接修改合同事实、角色权限或已确认交付。不采购 Platform 也可评估 OSS，但需要增加 Python 服务、监控和删除适配，首期收益尚无本项目数据证明。

## 5. Graphiti：时态关系能力明确，但不适合作为首期记忆底座

固定源码的 `EntityEdge` 包含 episodes、valid_at、invalid_at、expired_at，能表达来源事件与事实时间；核心支持 episode摄取、关系抽取、混合搜索。[边模型](https://github.com/getzep/graphiti/blob/c035afb7990b6077331a81e98b04efcfd9bf8184/graphiti_core/edges.py#L267)

`group_id` 给节点/边建立命名空间，但所有入口仍需上游传入正确 scope。它没有替代本项目 OAuth/组织权限、责任轮次、用途授权与内容发布判定。官方 namespacing 示例及版本间参数可能不同，应以固定源码 `group_ids` 参数为准，禁止省略 scope 或允许用户任意跨 group 查询。[官方命名空间](https://help.getzep.com/graphiti/core-concepts/graph-namespacing)、[固定检索方法](https://github.com/getzep/graphiti/blob/c035afb7990b6077331a81e98b04efcfd9bf8184/graphiti_core/graphiti.py#L1586)

删除要逐项验证：固定 `remove_episode` 按 episode UUID找边/节点，删除由该episode创建的边、只被该episode提到的节点，然后删除episode；它不是本项目完整的来源撤回协议，不能推定共享实体摘要会重算或所有历史派生物都消失。更不能把 Zep Cloud 的删除文档当成 Graphiti 开源同版本行为。[固定删除方法](https://github.com/getzep/graphiti/blob/c035afb7990b6077331a81e98b04efcfd9bf8184/graphiti_core/graphiti.py#L1824)

0.30.2 发布包含并发 group_id 使用 request-scoped driver修复、按group清理Saga节点修复；维护活动明确，但也说明隔离和清理必须成为本项目POC。项目仍处0.x；测试文件含单/多group clone路径，本次未执行。[发行说明](https://github.com/getzep/graphiti/releases/tag/v0.30.2)、[相关测试](https://github.com/getzep/graphiti/blob/c035afb7990b6077331a81e98b04efcfd9bf8184/tests/test_handle_multiple_group_ids.py)

图数据库增加商用和运维成本：默认 Neo4j 依赖与数据库是两件事，Python driver的许可不能覆盖服务器。Neo4j社区服务器GPLv3、FalkorDB服务器SSPLv1；Kuzu虽是旧轻量路径，当前 Graphiti pyproject/README 明确标为 deprecated、上游不再维护，不能为了许可简单而推荐它给新项目。Amazon Neptune是云服务路径，不满足完整免费自托管开源替代目标。[Graphiti依赖和Kuzu说明](https://github.com/getzep/graphiti/blob/c035afb7990b6077331a81e98b04efcfd9bf8184/pyproject.toml#L27)

只有关系查询POC证实“带时间的多跳证据检索”对真实业务明显优于现有关系表+知识索引，且图库发行条件核清，才引入Graphiti插件。它输出关系候选，不接管本体词汇表、业务事实确认、任务状态或Agent执行循环。

## 6. OpenViking：交互和上下文组织可借鉴，当前主许可不符合默认闭源准入

能力方向与用户需求接近：`viking://` 文档式上下文组织，L0/L1/L2分层；account/user/peer/session作用域；共享resources有文件/目录ACL；用户记忆与会话隔离。固定ACL使用read/write/manage等级，目录继承可设置restricted。未配置root key的api_key模式是dev模式，不等同可安全部署的单租户生产模式。[固定多租户文档](https://github.com/volcengine/OpenViking/blob/0f77ab5625a5e2ead4f286d4e58ea77e05fcfdee/docs/en/concepts/11-multi-tenant.md)、[固定ACL文档](https://github.com/volcengine/OpenViking/blob/0f77ab5625a5e2ead4f286d4e58ea77e05fcfdee/docs/en/concepts/15-acl.md)

这些ACL仍不等价本项目“路径可见、原文可读、摘要可读、后台执行可用、结果可发布”五种动作。异步任务保存请求创建时的群组身份并有内部语义维护绕过路径；因此运行中撤权、跨scope摘要、结果发布必须由OA另行核验，不能把后端可用内容直接送入人的聊天。

固定文档说明session.commit会自动提取记忆，ExtractLoop/MemoryUpdater之后进入语义队列；cases还可能触发经验和session-skill训练。相对本项目“人员确认→试用→发布→回滚”，默认自动提取需要约束为候选流程，并避免形成第二套Agent/技能进化权威状态。[提取链](https://github.com/volcengine/OpenViking/blob/0f77ab5625a5e2ead4f286d4e58ea77e05fcfdee/docs/en/concepts/06-extraction.md#memory-extraction)

成熟度证据是持续发布与修复，不能只看功能清单。v0.4.19包含ACL继承、watch归属、session提取等调整；一个已读会话删除测试在删除后GET仍成功时仅打印warning，因此该测试存在不能证明遗忘完备。此结论仅限已读该测试，不概括其他测试全失效。[发行说明](https://github.com/volcengine/OpenViking/releases/tag/v0.4.19)、[会话删除测试](https://github.com/volcengine/OpenViking/blob/0f77ab5625a5e2ead4f286d4e58ea77e05fcfdee/tests/api_test/scenarios/sessions/test_session_delete_cleanup.py)

当前主项目AGPLv3是明确的选型限制。官方还将分布式部署/支持列入需license key的Self-Managed发行。不能以旧Apache版本或Apache CLI代替当前服务端许可，亦不能假设商业许可一定涵盖OEM、客户转交、离线部署及修改再分发。建议借鉴文档式信息架构；若将来要采用，必须单独核验所需版本/发行授权及所有二开边界，当前不承诺“免费且可完整闭源交付”。

## 7. 子依赖许可与实际交付范围

| 组件 | 本次已读原始许可 | 对本项目的适用结论 | 未确认项 |
|---|---|---|---|
| Qdrant server | Apache-2.0；`6ab21cac18ebb6f4ae29102c7f8f5cc11affd5de` | 可作商业集成候选；与既有Java SDK适配复用 | 最终发行版本、镜像SBOM、备份/恢复和过滤正确性未测试 |
| pgvector | PostgreSQL宽松许可；`efa08fda9ec485d80292d0487a77939c087dedcc` | 若本项目已选PostgreSQL可减少单独向量服务；不能为记忆提前增加第二关系DB | 主项目DB尚未选定，原有集成和性能未验证 |
| Neo4j社区服务器 | GPLv3；`f213380f812b820a1b312e2ea52cb3d8f1931ccc` | 商用可行性须按独立服务/改版/分发具体合规；不能称整个Graphiti栈Apache | 企业功能、OEM条件、客户交付包装未核清 |
| FalkorDB服务器 | SSPLv1；`ed5b31553987c44ed516829631a9379b4589bc74` | 不按无额外条件闭源服务交付的默认组件准入 | 产品服务范围/分发方式/另行商业授权未核清 |
| Kuzu | 当前Graphiti明确弃用、上游不维护 | 新项目不采用该路径，即使旧许可宽松也不足以满足成熟维护要求 | 不为使用此候选重新拉入弃用图库 |
| 模型、embedding、reranker | 各候选允许配置不同提供方，根许可不覆盖模型权重/API协议 | 只接项目统一模型网关或获准本地模型；不默认OpenAI/云模型出站 | 最终具体模型及其商用、离线再分发许可须单独锁定 |

固定来源：[Qdrant LICENSE](https://github.com/qdrant/qdrant/blob/6ab21cac18ebb6f4ae29102c7f8f5cc11affd5de/LICENSE)、[pgvector LICENSE](https://github.com/pgvector/pgvector/blob/efa08fda9ec485d80292d0487a77939c087dedcc/LICENSE)、[Neo4j LICENSE](https://github.com/neo4j/neo4j/blob/f213380f812b820a1b312e2ea52cb3d8f1931ccc/LICENSE.txt)、[FalkorDB LICENSE](https://github.com/FalkorDB/FalkorDB/blob/ed5b31553987c44ed516829631a9379b4589bc74/LICENSE)。此表是已检查的关键组件，不是完成全传递依赖的SBOM审计，也不是所有候选HEAD可以直接拼装的版本锁。

## 8. 最小集成合同与权限闭环

以下为本项目设计要求，非候选原生保证；沿用27/34/41/46—54号命名和事实来源，不新增第二身份、审批或任务状态系统。

- `MemoryScope` 由服务端从认证和任务关系派生：tenantId、subjectRef、scopeType/ scopeRef、workItemId（任务scope必填）、responsibilityEpoch、purpose、conversationId、executionBinding/attempt引用、policyRevision/authzEpoch。客户端不能自选tenant或传任意插件filter。
- `MemoryVersion`：memoryId、version、Markdown/结构化内容引用、digest、sourceVersionRefs、createdBy、confirmedBy/confirmedAt、status（候选/已确认/已过期/已撤回）、有效期、保留/遗忘策略。AI置信度不代替人员确认。数据库记录元数据与当前版本，内容复用原文档服务；别额外搭一个Wiki和另一个记忆管理台。
- `propose` 只生成候选文档版本；`confirm` 验证当前权限、来源版本与责任轮次后生成有效版本；`retrieve` 必须过滤获准scope、已确认/有效记录，再做来源当前授权回查；外部插件给出的分数不能跳过回查。
- `getWindow/replaceWindow/clearWindow` 对同一服务端派生memoryId串行执行，窗口replace带revision/CAS或同等锁机制。读取故障返回可诊断失败，禁止转成空窗口继续生成。两个人在同一业务实例的私人窗口与同一人不同实例都须分开。
- `revokeSource/forget` 先在权威DB失效并提高authzEpoch，使检索和输出立即拒绝；再异步清理向量、全文、派生摘要、实体/关系和缓存，逐类记录可重试回执。备份按保留策略隔离，不进入在线召回；恢复必须先重放撤权/删除水位。Mem0 history原文也在清理范围。
- `rollbackDocument` 产生新版本引用，重新验证当前来源/权限/事实状态；不能直接把旧正文、旧scope或旧确认当成现在有效。
- `MemoryResult` 对用户只返回获准正文/摘要、可见来源链接及说明；执行专用内容只交给有界ExecutionGrant下的后台处理。后台记忆独立于人的对话memoryId，输出发布再次校验；鱼骨路径占位与隐藏原文不能互相替代。
- 插件超时或不可用可降级到已确认文档与会话窗口，但不能扩大召回scope；插件不可自行调用OA动作、更新正式事实、发起循环、修改权限、安装技能或自动发布进化结果。

## 9. 五项必做失败 POC（本次均未执行）

| ID | 输入与故障注入 | 必须观察的结果 | 接纳/失败界限 |
|---|---|---|---|
| MEM-P01 身份与scope交叉 | 两租户；同一人两个工作实例；另一个人/peer；用户伪造memoryId、group_id、filter，遗漏@MemoryId | 检索、直接get、history、更新、删除、导出、摘要和恢复均校验服务端scope；不同主体/实例零串扰 | 任一未授权内容/元数据进入用户对话或后台不获准输入即失败，不能靠UI隐藏 |
| MEM-P02 运行中撤权 | 后台已取受限资料，人在看路径；模型生成中撤销source权限/责任轮次，再恢复连接/缓存 | 新请求与最终发布使用新authzEpoch；受限内容不能进入人的聊天、摘要、下载或SSE；旧结果标待重新核验 | 权限收回后任何新发布仍含该来源即失败；允许已有后台执行权限只按独立Grant审查 |
| MEM-P03 自动记忆污染与文档回滚 | 源资料插入“忽略权限/记住错误合同金额”；模型错抽事实；用户确认后又版本冲突；回滚旧MEMORY.md | AI内容停在候选；金额/责任等权威事实保持旧已确认值；冲突显式展示；旧文档回滚不恢复失效来源 | AI直接覆盖业务事实、默认共享、自动发布技能或回滚恢复旧授权即失败 |
| MEM-P04 删除及来源版本传播 | 同一来源产生窗口、摘要、向量、实体、关系、Mem0 history；模拟清理中一个存储宕机，随后备份恢复 | 先拒绝召回并留清理未完回执，恢复后有限重试；在线结果、缓存及恢复索引无被删除正文；保留记录不可供模型召回 | 单个delete成功但history/共享实体摘要继续泄漏即失败；不能用删除主记录或404单点证明完成 |
| MEM-P05 并发、崩溃与预算 | 同memoryId并发两次写；不同group并发图检索；窗口写DB失败/进程重启/插件超时；预算耗尽 | 同scope串行/CAS失败可重试；跨scope独立；失败不伪装空历史；重启恢复一致；预算耗尽停止提取 | 丢失已确认版本、重复发布、串数据、假成功或插件驱动无限Agent循环即失败 |

验收必须使用合成资料起步，记录固定组件版本、请求身份、scope摘要、源版本、各存储清理回执、模型输入/可见输出的脱敏证据。未跑真实数据库/模型/多主体并发前，任何候选只标 `RESEARCHED_NOT_ADOPTED`。

## 10. 研究验证和限制

已完成：读取四主候选固定源码及许可证；获取最新发行信息；读取关键子依赖许可证；对会话历史/窗口、认证/对象权限、删除/遗忘、图group并发及文档式上下文边界作源码级比对。来源清单含成功及失败取回记录：OpenViking不存在的旧memory文档路径、FalkorDB旧LICENSE.txt路径失败后，分别从固定tree定位现行路径并读取；没有把404当成证据成功。

未完成：候选安装运行、真实数据库并发恢复、模型质量/成本评测、完整SBOM与客户交付许可审核。本报告不使用stars作为成熟证明，不把本机开发工具/知识索引当成本产品已部署组件，不修改产品代码或全局记忆。
