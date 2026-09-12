# Agent运行框架最新源码研究：DSH、pi、Codex、QoderWake与StaffDeck

研究截止：2026-09-11。状态：`RESEARCHED / NOT_IMPLEMENTED / RELEASE_NOT_CLEARED`。实施方案见[58号](58-Agent技术架构与性能实施设计.md)；知识、文档工作空间与记忆沿用[55号](55-知识库与记忆开源方案深度研究.md)、[56号](56-知识记忆技术栈与实施决策.md)。

## 1. 推荐结论

**本项目需要一个由OA业务驱动、可替换执行内核的Agent运行层。OA负责人员责任、审批和交付；运行内核负责一次Attempt中的模型与工具循环。** 任务可以持续数小时或等待数天，但无需让模型、数据库事务或工作进程一直占用。

当前底座尚未采用，不应因框架更新而再建一套平台。推荐验证顺序为：

1. 以36/46号优先候选的原生LangChain4j路径作为最低改造成本基线，先补55号已发现的授权、缓存和会话持久化缺口。
2. DSH保留插件化挑战者地位；结合59/60号补入AgentScope/DeepAgents，先比较能力差额，只选择一个有明确减代码理由的候选与合格基线跑相同业务/安全/恢复样本。只有可复用能力收益覆盖额外运行、适配和安全维护成本，才替换该内核；基线不合格同样须修复或重选。预览版本不直接进生产。
3. pi作为轻量可嵌入对照，适合工具集合小、团队愿意自己维护运行治理的情形。代码量小不代表整体开发量最少。
4. Codex适合作为研发、脚本和代码产物任务的专门执行后端；不默认用共享桌面账号或远程App Server承载所有企业员工。
5. QoderWake提供职责、工作方式和低学习成本的体验参考；StaffDeck提供SOP、任务帧、回执、介入与恢复的机制参考。**最新StaffDeck为AGPLv3，不能按宽松许可整库纳入闭源交付。**

采用时默认只启用一个通用运行后端；其他后端保持未启用候选。即使以后按能力开放多后端，每个Attempt也只能绑定一个精确后端版本，不能让LangChain4j、DSH、pi、Codex对同一次任务轮流自主重规划和重放工具。有限子任务可以独立执行，但必须有父子关系、预算、独立作用域与结果合同。

这是依据当前业务、许可和源码的推荐，不是“全行业唯一最佳”或已测性能排名。

## 2. 名称、时间与层次

本报告的DSH指DeepSeek Harness；pi指原badlogic/pi-mono、现earendil-works/pi。Codex区分开源CLI/SDK/App Server与商业模型和桌面产品。StaffDeck区分本轮公开发行源码与33号之前的本地快照，不把相邻项目接受的DSH设计决定搬到本项目。

| 对象 | 本轮核对的最新事实 | 所在层次 | 商用及成熟度边界 |
|---|---|---|---|
| DSH | 官方仍标Developer Preview；Git标签0.1.5-rc.2，npm latest仍0.1.5-rc.1；研究HEAD为c291e796… | Cordis插件化Agent运行框架 | MIT主代码；附带后端、平台payload有独立条款，不能当整包MIT或生产已审计 |
| pi | 仓库迁至earendil-works/pi；v0.85.1，2026-09-05 | Agent核心、Coding Agent SDK、CLI与stdio RPC | MIT主代码；扩展与工具运行在可信进程环境中，不内置企业权限或完整沙箱 |
| Codex | 最新稳定rust-v0.154.0，2026-09-09；本机仅查到CLI包0.144.5 | 完整编码Agent及集成接口 | Apache-2.0代码；模型服务另有条款；远程/daemon部分仍实验性，实际桌面后端版本未验证 |
| QoderWake CN | 官方更新日志最新条目1.0.6，2026-09-10 | 数字员工产品、工作与资源体验 | 官方行为参考；没有本轮获得的可任意二开再分发开源内核证据 |
| StaffDeck | 最新公开v0.5.6，2026-09-11；HEAD与tag均7adc7c84… | 数字员工/SOP业务产品及Python原生运行实现 | **AGPLv3**；包内backend版本仍0.1.0，不能用内部包号替代公开发行号 |
| 本项目Java SDK基线 | 55号固定RuoYi-AI及LangChain4j1.17.2；1.20.0为升级候选 | 所选OA底座已有AI能力 | 保持未采用；源码中的缺口必须修复，不因现成适配就豁免 |

依据：[DSH官网](https://www.deepseek.com/harness/en/)、[DSH/pi独立源码笔记](../../validation/agent-runtime/dsh-pi-research.md)、[pi发行](https://github.com/earendil-works/pi/releases/tag/v0.85.1)、[Codex发行](https://github.com/openai/codex/releases/tag/rust-v0.154.0)、[QoderWake更新日志](https://docs.qoder.cn/product-overview/qoderwake-cn-update-log)、[StaffDeck发行](https://github.com/OpenBMB/StaffDeck/releases/tag/v0.5.6)、[StaffDeck根许可][sd-license]、[backend声明][sd-package]。

最新发行、当前HEAD、安装版本、最终采用版本分别登记。本轮GitHub API部分返回403、raw文件请求部分TLS失败，随后使用Git远程引用、固定commit源码包和官方网页取证。未降低TLS校验、未使用用户凭据绕过限制、未执行下载的程序。来源、失败记录、摘要及提取文件在[研究证据目录](../../validation/agent-runtime/)。

## 3. 为什么不能把五个对象放在同一层比较

| 本项目需要解决的问题 | 可以参考的机制 | 仍属于本项目业务服务的责任 |
|---|---|---|
| 谁接任务、谁审核、哪天哪笔业务 | StaffDeck的任务/SOP关联；QoderWake的工作入口 | OA实例、HumanTask、WorkItem与责任轮次 |
| 一次模型如何选择和调用工具 | DSH/pi/Codex与底座SDK | 选择精确运行后端，限制本次能力和预算 |
| 多步骤是否可以并行 | DSH工具池、pi工具批次、QoderWake WakerFlow | 数据/资源冲突、租户公平、业务依赖与合并责任 |
| 运行中断后如何继续 | Codex线程、DSH会话日志、StaffDeck任务帧/租约 | 当前授权、fence、未知外部效果、正式状态一致性 |
| 结果该给谁看、能否作为交付 | QoderWake结果/日志视图；StaffDeck交付/介入 | 人员读取、后台使用、发布资格、C10—C12审核交接 |
| 经验如何改进 | 各框架的扩展、记忆、技能与评测机制 | 56号来源/作用域/候选/试用/回退；不可自改权限 |

Agent的“计划”是当前任务的执行方法，可以修改；OA流程定义和正式任务责任不能被这个计划直接改写。固定业务流程也不要求每个节点都启动一个Agent：校验、转换、查表、投影等确定性操作可直接调用现有服务，减少耗时和不确定性。

## 4. DSH：插件化收益与边界

DSH官方把模型、工具、技能、会话、存储、循环、调度与UI作为可组合插件。Code Mode可以把工具组合到程序中，适合多次确定性加工及有边界工具编排，但不是授予模型任意脚本、系统权限或免审批外发的理由。[官方介绍](https://www.deepseek.com/harness/en/)

固定源码专项核对显示：已有Session/Turn/Step、会话单写与跨进程OS写锁、持久化屏障、中断记录修复、工具guard、单次审批、有限工具并行池。默认maxParallelToolCalls为10，仅为源码默认值，不是本项目性能建议。这些是比自己从零搭执行循环更值得复用的能力；不是企业多租户、全域权限与业务exactly-once已经解决的证据。[源码定位与许可](../../validation/agent-runtime/dsh-pi-research.md)

适配必须处理：

- Cordis插件生命周期负责功能组合，业务身份和对象授权仍从平台注入；禁止以插件配置自行扩大Grant。
- DSH会话写所有权基于本机OS锁，活进程卡住时不会按TTL自动抢占；不推定它支持跨主机共享文件系统租约。本项目Attempt租约/fence保护业务派发和写入，两者必须显式映射；不能以业务租约过期为由同时续写同一内核日志。
- 沙箱声明有覆盖范围和完整程度；partial不能当full，文件作用范围不能推导出网络/进程已隔离。使用受控进程/容器和独立工具网关补齐本项目要求。
- 对持有秘密、写业务系统的工具，权限判断、审批目标摘要和调用回执必须由宿主服务强制。Code Mode中每次真实工具调用仍过网关。
- 不默认引入DSH的独立调度/UI/市场作为第二业务入口；复用运行内核和必要插件即可。恢复需区分日志一致性和工具外部效果，不能因为Session可回放就自动重发。

官方安全说明仍限制生产就绪推断。因此本轮将DSH列为优先挑战者，不直接改写36/46号底座采用状态。验收若需要大量修改内核、关闭安全检查才能跑通，或插件升级频繁破坏合同，则维持较简单的原SDK路径。

当前DSH第三方清单还包含Claude Agent SDK及平台payload的单独条款、Apache许可的Codex与MIT的pi-ai。pi-ai是模型适配组件，复用它不等于再次启动pi Agent循环。商业交付需明确裁剪不需要的后端和插件，验证最终依赖闭包；仅把开关关闭不证明制品中已无受限内容。[第三方清单](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/THIRD_PARTY_NOTICES.md)、[根许可](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/LICENSE)

## 5. pi：小内核不等于零治理成本

本轮确认仓库和包标识迁移：原仓库所有者为badlogic，旧npm前缀为@mariozechner，当前前缀为@earendil-works，不能把仓库所有者当包名前缀。v0.85.1修复前一版误发布实验server/client对SDK导入的影响；本轮应按官方支持的本地SDK和stdio RPC验证，而非假设新的远程多用户服务已经稳定。[发行](https://github.com/earendil-works/pi/releases/tag/v0.85.1)、[固定源码笔记](../../validation/agent-runtime/dsh-pi-research.md)

pi适合嵌入已有业务系统：执行循环、消息、工具和会话能力可直接使用，减少捆绑平台。代价是业务恢复、运行排队、企业权限、审批映射和沙箱主要由宿主承担。扩展与进程同权限，不能把第三方extension当作天然隔离插件。

源码中的并行工具批次使用Promise.all；没有本项目需要的批次总数/供应商配额限制，某工具要求sequential时该批转串行。这适合说明语义，却不能推导“并发越高越快”。平台必须限制批次、工具服务并发与成本；有写冲突的工具不能靠Promise并发安全执行。

若最终业务只需要少量受控工具、短执行、单会话串行，pi可比大框架直接；若需要大量插件运维、动态能力生命周期和Code Mode，DSH复用面可能更大。两者须与原SDK同样本比较总维护成本，不按代码行数或star打分。

## 6. Codex：编码后端与产品集成边界

固定稳定版源码`6b9826e3aa83b1a5947db50f4332cb9c65f1b340`中，TypeScript SDK包装CLI子进程，通过stdin/stdout交换JSONL事件；`run()`等待并收集，`runStreamed()`提供流式事件；可按线程恢复。Python SDK也已出现在仓库，但本轮未验证其实际发行包或运行。[TS SDK][cx-sdk]、[Python SDK][cx-python]

App Server官方文档面向深度产品集成，区分Thread、Turn、Item、审批及流式通知；提供start/resume/fork、steer、interrupt等动作。它不是本项目OA状态机。当前官方页面明确远程App Server/WebSocket的实验性与生产支持限制，并说明非loopback监听默认可能未认证及入口队列过载返回-32001。[现行文档](https://developers.openai.com/codex/app-server)

以下源码事实对本项目尤其重要：

| 事实 | 影响 |
|---|---|
| TS SDK默认继承进程环境，线程默认沿用工作目录及用户会话位置 | 不共享开发者主目录、认证文件、全局MCP或环境变量；隔离后显式注入最少变量 |
| daemon文档明确不提供per-client环境隔离 | 连接不同员工不等于隔离其环境；不能共享一台开发机daemon就宣称多租户安全 |
| turn/start允许覆盖审批、沙箱等执行设置 | 浏览器不能透传这些字段；平台只接受业务意图，由适配器决定受限配置 |
| turn/steer有expectedTurnId | 有用的防旧输入机制，但仍需业务epoch/revision/当前控制资格 |
| daemon可自动刷新并重启运行版本 | 客户交付须冻结制品、排空或安全终止运行后升级；不让自动更新改变在途快照 |

依据：[SDK源码][cx-thread]、[daemon契约][cx-daemon]、[Turn参数][cx-turn]。当前网页是滚动文档，不能假设所有新增字段都已出现在固定0.154.0协议；M0以该版本可生成的实际协议和往返测试为准。

推荐用于隔离的代码仓、自动化脚本或研发文档任务，产出补丁、文件和验证回执，再回到原任务提交。优先验证本地stdio/SDK链路；不把WebSocket试验接口直连公网或当企业共享业务后端。代码Apache许可不等于模型订阅、桌面资产、账号共享或服务转售权利，按54号分别核定。[根许可][cx-license]

## 7. StaffDeck：有价值的业务机制与最新源码限制

本轮固定公开v0.5.6源码`7adc7c84f61bd6cca13ff0380a811cbb3ae3c544`。AgentLoop直接创建Python的HarnessV2Engine；这是当前已读的本地实现路径，不能因含“harness”一词就称它基于DeepSeek Harness。[调用入口][sd-loop]、[运行引擎][sd-engine]

| 固定源码证据 | 可以借鉴 | 不能直接沿用的假设 |
|---|---|---|
| client_turn_id、会话冲突、TaskFrame、Turn记录 | 请求幂等、任务帧与消息分开、明确并发冲突 | client_turn_id本身不代替本项目operation/epoch/fence |
| 进程内锁加数据库SessionLease，owner及期限校验 | 每个会话单写；租约丢失阻止继续提交 | 租约周期/续约方式需适配长工具调用和多副本；不能只移植局部锁 |
| 孤儿恢复保留checkpoint，将旧执行标abandoned/unknown | 故障回执与后续恢复分离，不谎称成功 | `startup=True`将全部active视作旧进程；多副本启动不得终止其他健康Worker |
| ToolReplayPolicy按工具/参数记录，读写可配置 | 复用已知结果，减少重复调用 | 参数一致或HTTP方法分类不等于外部业务幂等，UNKNOWN仍需查证 |
| SRT/Bubblewrap沙箱和路径映射 | 工作目录与进程路径分离；诊断明确 | 网络默认all，部分Windows路径可降级unsandboxed；本项目生产必须缺能力就拒绝 |
| evolution evaluate仍是static_v1 | 候选、差异、评估记录及审核界面 | Schema通过不能证明效果改善，不能自动晋升技能 |

依据：[会话锁][sd-lock]、[租约][sd-lease]、[孤儿恢复][sd-recovery]、[工具重放][sd-replay]、[沙箱][sd-sandbox]、[命令执行][sd-command]、[进化评估][sd-evolution]。

这些是源码可见路径与本项目部署的适配风险，本轮没有启动StaffDeck复现或测量。根LICENSE和README均声明AGPLv3，因此本项目以行为/架构研究为主；不能复制实现后删除LICENSE，不能将另进程部署自动当作规避许可的依据。若未来考虑合法AGPL使用或额外商业授权，应另做具体组合判断；当前默认闭源二开路线不采用整库。[许可][sd-license]、[README][sd-readme]

## 8. QoderWake：如何降低学习成本

官方区分单Waker、Group、WakerFlow和自主工作：探索从单员工开始，职责可分才用Group，步骤稳定再固化WakerFlow，定时/事件/API负责何时触发。WakerFlow支持串行、并行、分支、人工确认和结果，但“执行完成且含失败”仍需逐节点核对。[WakerFlow](https://docs.qoder.cn/qoderwake/wakerflow)、[自主工作](https://docs.qoder.cn/qoderwake/automated-tasks)

本项目采用同样的渐进方式，但OA继续串联承担人。普通用户只选择“让谁做、用哪些获准资料、交付什么”；运行内核、工具并发、超时和模型配置由已发布模板提供。需要多个员工时，系统解释明确分工与额外耗时/预算，不默认开启团队讨论。

QoderWake 1.0.6的运行/版本历史分页与失败时保留已有记录，也提示本项目应避免一次加载完整事件和聊天。左对话、右侧鱼骨路径/文件/历史摘要使用同一业务实例和授权投影；展开某节点才加载获准详情。CLI中的Run/Task/Session是它自己的对象，不能一一替换本项目WorkItem/Attempt。[更新日志](https://docs.qoder.cn/product-overview/qoderwake-cn-update-log)、[CLI对象](https://docs.qoder.cn/qoderwake/cli-reference)

## 9. 性能与最新研究的反思

2026-08-25的一手源码比较论文总结了可重放会话、渐进上下文和扩展接口等趋同机制；这是研究观察，不证明任何一库适合企业OA。2026-09-01的Harness-of-Harness在指定编码基准探索多日持续改进，指标不适用于本项目审批、隔离和业务数据，不能据此新增一个无界“监督所有Agent的Agent”。[源码比较论文](https://arxiv.org/abs/2608.23953)、[HoH论文](https://arxiv.org/abs/2609.01481)

OpenAI延迟指南支持减少无用生成、减少串行模型请求、利用并行与流式反馈。Anthropic多Agent研究案例同时说明并行收益、token成本和共享上下文任务的协调限制。二者支持**先减少无必要的模型步骤，再并行独立工作**，不支持“多Agent一定更快/更便宜”。[延迟优化](https://developers.openai.com/api/docs/guides/latency-optimization)、[多Agent工程案例](https://www.anthropic.com/engineering/multi-agent-research-system)

本项目性能优先级：正确隔离和交付 → 少启动不必要的Agent → 上下文按需加载 → 确定性工具批处理 → 有界并行 → 排队公平/预热 → 通过实测决定扩容。Node、Python、Rust语言本身不能推导端到端快慢；模型输出、外部工具、排队和人工等待通常需分别测量。58号给出容量公式、假设样本和对照验收。

## 10. 采用前必须解决的断点

1. 模型回答完成、工具执行成功、人员确认和下游接手是不同状态，不能同用一个done。
2. 工具重试不等于业务幂等；执行器失联不证明远端副作用没有发生。
3. 本地Session锁不等于多Worker租约，租约也不代替提交fence和幂等写。
4. 后台获准使用的资料不得进入无权人员的模型上下文、日志、下载包或审批卡。
5. 运行冻结版本不覆盖紧急撤权；记忆/摘要/缓存/旧流式连接同步处理。
6. 插件安装、依赖声明、工具可调用、沙箱检测通过不等于完整业务验收。
7. 并行任务共享凭据或可写目录会抵消性能收益，并引入难以恢复的冲突。
8. 基准有效必须固定输入、模型、工具、权限和版本；没有运行不得填准确率或吞吐量。

以上在58号转成明确职责、事件/恢复顺序与待执行案例。本轮未部署候选、未调用真实模型、未读取用户认证内容、未执行性能或产品验收。

## 固定源码引用

[sd-license]: https://github.com/OpenBMB/StaffDeck/blob/7adc7c84f61bd6cca13ff0380a811cbb3ae3c544/LICENSE
[sd-package]: https://github.com/OpenBMB/StaffDeck/blob/7adc7c84f61bd6cca13ff0380a811cbb3ae3c544/backend/pyproject.toml
[sd-readme]: https://github.com/OpenBMB/StaffDeck/blob/7adc7c84f61bd6cca13ff0380a811cbb3ae3c544/README.md
[sd-loop]: https://github.com/OpenBMB/StaffDeck/blob/7adc7c84f61bd6cca13ff0380a811cbb3ae3c544/backend/app/core/agent_loop.py
[sd-engine]: https://github.com/OpenBMB/StaffDeck/blob/7adc7c84f61bd6cca13ff0380a811cbb3ae3c544/backend/app/core/harness_v2_engine.py
[sd-lock]: https://github.com/OpenBMB/StaffDeck/blob/7adc7c84f61bd6cca13ff0380a811cbb3ae3c544/backend/app/core/harness_session_lock.py
[sd-lease]: https://github.com/OpenBMB/StaffDeck/blob/7adc7c84f61bd6cca13ff0380a811cbb3ae3c544/backend/app/core/harness_session_lease.py
[sd-recovery]: https://github.com/OpenBMB/StaffDeck/blob/7adc7c84f61bd6cca13ff0380a811cbb3ae3c544/backend/app/core/harness_recovery.py
[sd-replay]: https://github.com/OpenBMB/StaffDeck/blob/7adc7c84f61bd6cca13ff0380a811cbb3ae3c544/backend/app/core/tool_replay_policy.py
[sd-sandbox]: https://github.com/OpenBMB/StaffDeck/blob/7adc7c84f61bd6cca13ff0380a811cbb3ae3c544/backend/app/harness/sandbox.py
[sd-command]: https://github.com/OpenBMB/StaffDeck/blob/7adc7c84f61bd6cca13ff0380a811cbb3ae3c544/backend/app/harness/command.py
[sd-evolution]: https://github.com/OpenBMB/StaffDeck/blob/7adc7c84f61bd6cca13ff0380a811cbb3ae3c544/backend/app/evolution/service.py
[cx-sdk]: https://github.com/openai/codex/blob/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/sdk/typescript/README.md
[cx-thread]: https://github.com/openai/codex/blob/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/sdk/typescript/src/thread.ts
[cx-python]: https://github.com/openai/codex/blob/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/sdk/python/README.md
[cx-daemon]: https://github.com/openai/codex/blob/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/codex-rs/app-server-daemon/README.md
[cx-turn]: https://github.com/openai/codex/blob/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/codex-rs/app-server-protocol/src/protocol/v2/turn.rs
[cx-license]: https://github.com/openai/codex/blob/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/LICENSE

## 文章复核增补（2026-09-11）

本文件保留原固定源码证据；[59号](59-智能体文章证据复核与全栈优化.md)/[60号](60-最小技术方案与验证决策.md)补AgentScope2.0.8、DeepAgents0.7.13发行与独立HEAD源码比较。AgentScope已有SQL存储，不以旧文章的Redis必选印象排除；身份占位仍需接OA。DeepAgents直接backend/Compiled或Remote子Agent有权限继承边界，宿主必须约束；不默认要求购买LangSmith。pi harness-v2/j4为未完成设计分支，无fsync承诺，不改写稳定版能力结论。先能力差额筛选，再选一个挑战者验证，不新增第二个执行循环。
