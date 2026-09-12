# DSH 与 pi：面向 OA 数字员工的执行内核研究

取证日期：2026-09-11。状态：`RESEARCHED_NOT_ADOPTED`。仅研究公开官方资料及固定源码；未安装、未执行候选运行时，未调用模型，未测性能、隔离或恢复。当前项目无最终采用底座，本报告不继承历史旧仓的“DSH 唯一运行时”决策。

## 1. 结论与身份

DSH 指 **DeepSeek Harness**，官方仓库为 `deepseek-ai/deepseek-harness`。pi 继承原 `badlogic/pi-mono` 项目；本次 GitHub API 将该地址重定向到 **`earendil-works/pi`**，当前发行包为 `@earendil-works/pi-coding-agent` / `@earendil-works/pi-agent-core` / `@earendil-works/pi-ai`。不能用旧组织名、旧包前缀或两个月前的功能印象代替本次版本事实。[DSH 官方](https://www.deepseek.com/harness/)、[pi 仓库](https://github.com/earendil-works/pi)

**本项目建议不变：OA 业务服务拥有任务、权限、版本、交付和推进权威；一个 ExecutionAttempt 只使用一个执行内核。** 原底座的 LangChain4j 可先作为最少改造的验证基线；DSH 是需要长期执行与深度插件化时的优先挑战者，pi 是希望保持可嵌入、可控小型服务时的替代候选。两者均未证明足以推翻现有验证顺序，更不能因已经有 Session 和工具接口便省略企业授权、事务和隔离适配。

| 对象 | 本次实际核对 | 适用范围 |
|---|---|---|
| DSH 源码 | HEAD `c291e7961a515f6d7af9304e7fd1d257929aef26`；根 package 版本 `0.1.5-rc.2` | 本文 DSH 源码结论均限此固定提交，不能推定全部存在于较早 npm 包 |
| DSH 标签 | `dsh-v0.1.5-rc.2` → `fb2c4b9e698e30edb738bca4cf0618587db7d203`；发布补丁内日期 2026-09-10 | 最新已观察 Git 标签；仍是 RC、Developer Preview |
| DSH npm | `@deepseek-ai/dsh/latest` 实际返回 `0.1.5-rc.1` | npm 默认发布渠道与源码/标签不同，不合并称“最新版已部署” |
| pi 发行 | `v0.85.1`，2026-09-05；标签与 npm `gitHead` 为 `d981de1229ef899957bbe968bc8dcda02a21f477` | 本文 pi 主要代码按发行提交核对 |
| pi 分支 | HEAD `71dca871bc80b6bc97be37f0ca3189399d651fff` | 仅记录当前分支事实，未将分支实验能力混入稳定 SDK 比较 |

版本证据见 [原始清单](dsh-pi-sources/manifest.json)、[DSH refs](dsh-pi-sources/dsh-refs.txt)、[pi refs](dsh-pi-sources/pi-refs.txt)、[DSH npm](dsh-pi-sources/dsh-npm-latest.source)、[pi npm](dsh-pi-sources/pi-npm-latest.source)。部分 GitHub REST 请求返回 403，DSH `releases/latest` 返回 404；已保存失败，改用公开 Git refs、npm 元数据及固定提交归档，不将 404 解释为仓库不存在。

## 2. 执行模型：相似名词不能直接映射业务

| 维度 | DSH 当前源码 | pi v0.85.1 | 本项目业务适配 |
|---|---|---|---|
| 核心循环 | Agent 接口与具体 agent-loop 分开；Cordis 组合服务；系统上下文、LLM、工具、Session 协同 | pi-agent-core 提供循环；AgentSession 再负责资源、持久化、重试、压缩等 | 复用一个循环，不在网关再实现模型思考与工具再调度 |
| Session | 追加事件日志，带共享 Agent/Session ID；运行期 owner 与持久 fork lineage 分开 | JSONL 条目形成带 parentId 的分支树，当前 leaf 确定使用历史 | 绑定 tenant、work、task、actor、attempt、contextVersion、permissionEpoch；不能仅按用户或员工名字复用 |
| Turn | 一个外部唤起可以包含多 Step；Step 对应模型请求及工具批次 | 每次 assistant 响应与工具批次结束发 turn_end；一个 agent run 可含多 turn | 两者 turn 口径不同。业务 Attempt、人工审批和 OA 节点均为独立对象，禁止一一等同 |
| 动态输入 | followup → next-turn 且唤醒；steer → next-step 且唤醒；inject → next-step 不唤醒 | steer 在当前 assistant 的工具批次完成后进入下一模型轮；followUp 待当前运行自然结束 | 新上下文是否可补入取决于权限、版本和内核能力；禁止声称即时中断所有在途工具 |
| 结束 | turn/end 记录 completed、max-tokens、blocked、aborted、error；崩溃恢复另有 interrupted | agent_end / turn_end 是模型运行生命周期结束；消息仍可能标 error/aborted | 输出候选与业务验收分开；自然停止、命令 success、事件结束都不能直接推进 OA |

证据：[DSH Agent 控制源码](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/packages/core/agent-loop/src/agent.ts)、[DSH 生命周期](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/docs/agent-lifecycle.md)、[pi 循环](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/agent/src/agent-loop.ts)、[pi SessionManager](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/coding-agent/src/core/session-manager.ts)。

对“一个人同时处理多个业务实例”，正确单元是任务的执行尝试；长期数字员工只是版本化职责/工具/知识配置。它可以被多任务引用，但不能让多个任务共享一个可写对话历史、当前目录或凭据容器。

## 3. 事件、协议与工作台投影

**DSH：** `session/event` 承载可重放事件，`agent/*` 承载进程内状态、队列与增量流。成功/失败模型尝试完成后写入正式 settlement；硬进程丢失可能使尚未 settlement 的实时流没有完整持久记录。最新网关使用 Typert 声明与生成 Host/Client 合同；`/api/remote.mux` 承载 Remote stream，命令、流和事件响应具有不同协议。不能按历史字符串日志解析来假装兼容最新网关。[DSH 流协议](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/packages/api/gateway/src/stream-protocol.ts)、[DSH API Gateway](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/docs/api-gateway.md)

**pi：** 支持直接 AgentSession SDK，或进程间 LF 分隔 JSONL 的 stdio RPC。`prompt` 响应 success 表示被接收、入队或即时处理，之后执行失败经事件流发出，不会再返回同一请求的第二条失败响应。v0.85.1 已纠正 v0.85.0 误发内部实验 server/client 依赖的问题；当前 `client` / `experimental/plugin` 入口只有 source 条件，不能作为已承诺的部署协议。[pi RPC](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/coding-agent/docs/rpc.md)、[pi package exports](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/coding-agent/package.json)、[pi 发行修复](https://github.com/earendil-works/pi/releases/tag/v0.85.1)

工作台继续使用“左侧对话＋右侧路径/文件/产物/历史摘要”。接入层将引擎事件投影为受权业务视图；引擎内部 Session 日志是执行记录，不是可直接发给每个人的 UI 数据源。业务路径可能获准展示，工具实参、文件路径、原文、模型历史和摘要则仍需逐项授权。一个只获准看路径的用户不应收到隐藏内容再由前端折叠。

## 4. 恢复与取消：已经有机制，仍不是业务事务

### DSH 可直接利用的机制

1. `SessionHandle` 将读写收敛到单一通道；写句柄单 owner，读取与写入使用同一种事件模型。
2. JSONL provider 在 POSIX 用 flock、Windows 用命名内核对象实现跨进程写所有权；进程死亡释放锁，活着但卡住的进程继续持有，未使用“过期即抢占”TTL。它是本地 OS/文件系统范围的机制，未验证跨主机共享存储/分布式租约适用性。
3. 普通内存 session/event 通知并不等于落盘；write-behind 批处理后，由 `session/flush` 完成排序、错误暴露和持久化检查点。持久化 seam 的通用 append 允许缓冲，JSONL 具体实现 append 在完成时持久。
4. 恢复读取完整物理前缀，补齐中断工具/step/turn 闭合事件；这说明当时执行被打断，不证明工具外部副作用已回滚或应重做。

证据：[持久化合同](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/docs/subsystems/persistence.md)、[文件锁源码](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/packages/session/session-persistence-jsonl/src/lease.ts)、[write-behind 源码](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/packages/session/session-persistence-jsonl/src/storage.ts)。

### pi 必须额外补齐的边界

稳定 SDK 的 SessionManager 以同步文件追加/重写保存分支条目；本次检查的文件中没有 fsync 屏障或与 DSH 相同的跨进程 Session 写租约。因此不能仅凭“JSONL 持久化”承诺掉电后的完整耐久性，也不能允许多 Worker 同时续写一个文件。v0.85.0 起支持从外部托管的条目恢复 inMemory Session，可作为企业存储适配点；完整生命周期、原子性、事件遗漏与格式升级仍需验证，不代表数据库存储插件已经成品。[SessionManager 实现](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/coding-agent/src/core/session-manager.ts)、[SDK 会话入口](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/coding-agent/docs/sdk.md)

pi 的 `abort` 等待 idle，但不自动清除 steer/followUp 队列；在业务“取消整个任务”时需要清队列、取消当前运行、等待退出，再拒绝晚到结果。DSH cancel 默认清 inbox，并传播 AbortSignal；工具调度停止补位、等待已启动调用退出。两者面对不响应 AbortSignal 的工具都需要外层超时和环境终止策略；已发出的付款/邮件等副作用须按业务回执查询，不能因取消再发一次。[pi 取消源码](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/coding-agent/src/core/agent-session.ts)、[DSH 工具调度](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/packages/core/agent-loop/src/tool-calls.ts)

业务服务仍需持有 attempt 状态及 fence、外部请求幂等键、回执与补偿策略；恢复只从经过确认的事实继续。不能用 Agent Session 单写锁代替业务数据库的任务领取与防重复提交。

## 5. 并发与性能：按瓶颈选，不按“极简”或 Star 选

| 事实 | 业务影响 |
|---|---|
| DSH 对 parallel-safe 工具采用 bounded rolling pool；默认 `maxParallelToolCalls = 10`；exclusive 工具形成 barrier，启动前重读分类；结果按模型顺序提交 | 可通过少量固定策略控制读取并行与写入互斥。10 是代码默认配置，不是本项目最佳并发量；慢序号结果可能拖住后续可见提交 |
| pi 默认工具路径支持并行；若批次中任一工具标 sequential，整批串行；并行路径预检查顺序执行，然后 Promise.all 启动准备完成的调用 | 这一路径没有每批 worker-pool 限额。需在工具执行服务侧使用有界并发，不能直接将模型生成调用数量当资源预算 |
| pi read/edit/write 的文件 mutation queue 使用进程内 Map，并按 realpath 串行化同文件修改 | 不同文件可并行，但不提供跨进程/跨主机事务或任务隔离；不能用该队列让多个租户共享文件目录 |
| 两者会做上下文与历史管理，外部服务延迟与模型 token 通常另占大量成本 | “循环代码短”无法证明总延迟更低；需要相同模型、输入和工具数据比较 |

证据：[DSH 默认并发](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/packages/core/agent-loop/src/constants.ts)、[DSH rolling pool](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/packages/core/agent-loop/src/tool-calls.ts)、[pi 工具批次实现](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/agent/src/agent-loop.ts)、[pi 文件修改队列](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/coding-agent/src/core/tools/file-mutation-queue.ts)。

建议验证矩阵（均 `NOT_RUN`）：

| 试验 | 输入和控制变量 | 必须记录 |
|---|---|---|
| D/P-01 普通 OA 草稿 | 同一模型、同一上下文、同一确定性工具；1/10/50 个独立任务的测试档位 | 接收到入队、排队、首次可读内容、有效候选完成的 p50/p95；失败与质量分别统计 |
| D/P-02 突发读取与慢工具 | 20 次只读调用，混入一个慢查询，再混入一个写操作；相同资源限额 | 最大在途量、连接池等待、序列阻塞、其他任务延迟；各档位不视为容量承诺 |
| D/P-03 长文档与压缩 | 固定长上下文、固定文档版本，跨多轮续办 | 输入/输出/缓存 token、压缩次数、摘要耗时、关键事实保留和授权引用准确率 |
| D/P-04 持久化与掉线 | 工具前、外部返回后、结果持久化前分别终止隔离环境；客户端重连 | 重放位置、重复副作用数、缺口状态、恢复耗时；不以重试成功掩盖重复 |
| D/P-05 取消与撤权 | 模型流、并行工具、审批待答、compaction、队列待执行五处取消/撤权 | 新调用是否停止、在途是否回收、晚到结果是否被 fence 拒绝、其他实例是否不受影响 |
| D/P-06 资源隔离 | 两租户同名文件、目录穿越/符号链接、受限上下文诱导输出、插件试图直接读宿主 | 越权读取/输出必须为 0；network/process/filesystem 分别记录，未知不能记为安全 |
| D/P-07 工作空间与上下文 | 同用户并发三类 OA 实例，修改一实例资料版本后继续其他两实例 | 工作目录、凭据、日志、记忆、缓存、生成产物与历史摘要是否隔离 |
| D/P-08 商用包复现 | 固定提交、依赖锁、最小插件组合及镜像，在隔离构建环境复现 | SBOM、许可/NOTICE、插件 digest、安装脚本、模型/API 服务条款、回滚与升级代价 |

先测单 worker/单 attempt，再增加实例数；分别统计纯运行时开销、模型时间、工具时间、持久化与工作台投影时间。模型与工具都随机时，不能把总耗时差直接归因于内核。容量采用活跃 Attempt 数、在途工具数、CPU/RSS、连接与 token 预算联合限制；空闲 Session 不应长期占有独立推理进程。

## 6. 插件与权限：低代码入口，强约束执行

DSH 的工具 pre-execute / execute / post-execute 流水线允许扩展；另有只能否决、不能重新放行的单调 guard。approval 服务的 allowed-once 才允许单次动作，缺失、抛错或非标准答案归为 unavailable。该机制可以承载企业调用前检查，但注册了 guard 并不证明所有 Node 插件的直接文件/网络操作都会经过工具流水线。[DSH 工具源码](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/packages/core/tools/src/index.ts)、[DSH 审批源码](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/packages/interaction/user-approval/src/index.ts)

pi 扩展支持工具注册、上下文/压缩/生命周期事件和自定义 UI，但 TypeScript 模块与进程拥有同等权限。Project Trust 控制项目资源是否装载；AGENTS.md 等上下文在默认规则下仍可加载，Trust 不是 sandbox。官方明确 pi 没有内置 sandbox，容器、VM、微 VM 等边界由部署者建立。[pi 扩展](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/coding-agent/docs/extensions.md)、[pi 安全边界](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/coding-agent/docs/security.md)

DSH 本机 sandbox 的 `read-only` / `workspace-write` 仅描述文件 effects；网络与进程可见性不在此模式语义中。Linux/macOS/Windows 后端不等价；partial enforcement 不可冒充 full。官方 SAFETY 明确仍为开发预览、未安全审计、不应当成安全或生产就绪软件，也不应作为不可信负载唯一安全控制。[DSH sandbox](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/docs/subsystems/sandbox.md)、[DSH 安全公告](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/SAFETY.md)

因此普通员工只配置数字员工模板、可用资料和交付目标；平台管理员选模型配额、工具包、隔离配置和可执行用途，按实际业务显示必要审批。员工市场交付声明式配置与已审查版本的能力包，不把任意 npm 插件安装权开放给业务用户。后台 Agent 的受限资料使用授权与操作者原文阅读权分离；受限内容应放在专用执行上下文，回传经过发布判断的成果，不混入操作者对话历史。

## 7. 完整商用与成熟度

DSH 根许可证为 MIT，pi 根许可证同样 MIT；保留版权及许可通知是其基本条件。**根 MIT 不能覆盖所有可装插件与服务条款。** DSH 当前 THIRD_PARTY_NOTICES 明列 `@anthropic-ai/claude-agent-sdk` 为 `SEE LICENSE IN README.md`，并记录官方 Claude Code 平台 payload closure；也包含 `@openai/codex`（Apache-2.0）、`@earendil-works/pi-ai`（MIT）。pi-ai 属模型适配复用，不等于 DSH 再套 pi-agent-core 循环。不能因 DSH 外壳开源，就将其全部后端插件、预编译客户端和第三方服务合并宣称无条件闭源商用。[DSH MIT](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/LICENSE)、[DSH 第三方清单](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/THIRD_PARTY_NOTICES.md)、[pi MIT](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/LICENSE)

建议选择最小必要插件与代码子集，锁定版本并生成实际构建 SBOM，检查传递依赖、原生模块、模型权重、镜像及服务使用条款。无需的 Claude/Codex 后端不能仅在 UI 隐藏后仍默默打进交付包。涉及消费者订阅/OAuth 的 API 接法也不能自动转作多租户 SaaS 身份池。

DSH 当前丰富的源码边界和测试入口使其值得受控试验，但 Developer Preview 与快速破坏性变更意味着升级成本仍须计入。pi 的稳定本地 SDK/RPC 更适合较小的可嵌入链路，不过企业持久化、租约和隔离适配成本不可省略。本文没有运行两仓测试，也没有将已有测试文件数当成熟度或业务验收证据。

2026-08 的一手源码研究将三类 harness 的趋同归纳为循环、可重放记录、模型差异处理、渐进上下文和扩展点；这支持比较职责边界，不能证明某个引擎对本项目最优。另一篇 DSH 间接提示注入实验显示，受控载体与敏感操作之间仍需独立控制；其旧版本、固定工具夹具和判定方式不等于本次 HEAD 或本项目实际泄漏率，本文不转用其数值。[结构研究](https://arxiv.org/abs/2608.23953)、[DSH 注入研究 v2](https://arxiv.org/abs/2608.16393v2)

## 8. 最终取舍条件

- **维持原最低成本基线**：当工作以资料检索、结构化分析、文档草稿、受控工具为主，先测底座已有链路；它也必须通过同一授权与交付验证。
- **允许 DSH 挑战基线**：确有多步骤长期任务、动态插件、可重放运行轨迹和节点内执行方案需求；证明最小组合可完整商用，版本升级/恢复稳定，独立隔离与业务边界通过 D/P 测试。
- **选择 pi 替代**：团队希望用 TypeScript SDK 或每任务 stdio 子进程构成精简 Worker，能明确承担外部持久化、限流、部署隔离和权限适配；不用 source-only 实验协议做首期依赖。
- **不采用三层嵌套循环**：OA 调 DSH、DSH 再调 pi、pi 再调用 Codex 的串联只有在明确的专门任务委派且限定资源、身份、结果与退出条件时另评估；不能作为一般任务默认路径。

可逆的下一步是执行相同业务夹具的受控适配试验，而不是先大规模搬入整个 Agent 平台。此分支已交付源码研究；产品采用、真实业务闭环、性能容量、最终分发包许可均未验收。
