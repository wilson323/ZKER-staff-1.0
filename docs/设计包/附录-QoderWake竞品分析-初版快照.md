> 初版分析快照，保留原观察时间和证据边界；本次仅归档，未重新执行其中所有现场/商业信息核验。当前产品方向及增量设计以本包 01 产品需求与完整153项清单为准。

# ZKER-staff × QoderWake CN 完整竞品分析

分析日期：2026-09-11（UTC）；本机观察窗口始于 2026-09-10 晚间（America/Los_Angeles）。

**判断：QoderWake CN 已把“配置数字员工、协作、编排、查看结果”做成可操作的工作产品；ZKER-staff 更有价值的竞争方向，是把 SOP、人员责任、授权、完成标准和交接证据组织成企业业务闭环。当前证据支持前者的现场产品体验，也支持后者具有明确的设计与部分代码基础，但不足以证明后者已经具备交付优势。**

本报告用于产品决策和研发优先级讨论。建议不改变已批准的完整能力范围、商业闭源 B/S 形态和 DeepSeek Harness 唯一 Agent Runtime 决策；不代替产品发布验收，也不修改现行任务图或状态源。

## 1. 范围、方法与结论边界

比较对象为当前 ZKER-staff 工作区与用户指定的 [QoderWake CN 本地控制台](http://127.0.0.1:19830/)。Qoder CN 官方文档用于核验产品语义、部署和商业信息。Dify、n8n、Camunda 仅用于校准竞争类别，未作同等深度现场评测。

采用四种证据标签：

| 标签 | 含义 | 能证明什么 |
|---|---|---|
| D：设计 | 当前产品文档、合同、决策 | 要建设什么、规定什么 |
| C：代码 | 当前源码与路由注册 | 有对应实现或明确缺口 |
| UI：现场 | 本轮浏览器实际页面 | 当前实例具有相应入口、配置和历史展示 |
| O：官方 | 厂商公开资料 | 厂商说明的能力与适用边界 |
| U：未验证 | 本轮无足够直接证据 | 不作支持或缺失的断言 |

这是一份**覆盖全局产品设计、核心代码链及横向模块的竞品分析**，不是全仓每行代码审计。全量计数仅限 public/ui OpenAPI 方法与路径的注册分类；业务接口、数据库、模型、连接器和浏览器流程没有全量执行。

源码观察起点 HEAD 为 faf945a13b8ba65cc53a0152913f27f6fef8373b，交付核对时 HEAD 为 2a890661e6c33a628ecc693b4c5a3fc84aa12012。观察窗口只新增或修改错误码治理台账与生产就绪规划文档，未改变本报告核验的核心代码。起点有 36 项工作区状态条目、无 ACTIVE claim；本轮仓库操作为只读。报告和检查结果保存在仓外。

特别防止三个误判：

- 19830 中出现的 ZK-IPD 员工、Group 和业务流程，是当前实例的用户配置；其业务内容不是 ZKER-staff 的产品事实，也不是 QoderWake 出厂内置行业能力。
- “有权限页面”不等于已经证明跨租户、细粒度权限和职责分离正确；“有代码”也不等于线上已经执行。
- 本轮没有提交新 WakerFlow 运行，没有访问或修改其他项目代码，没有进行真实外部副作用实验。

## 2. 管理层应如何判断这场竞争

**两者存在直接功能重叠，但价值重心不同。**

QoderWake 的最短价值路径，是用户把任务交给合适的 Waker，借助项目上下文、能力资源和协作编排得到可查收的产物。本项目已批准的最短价值路径，是普通员工进入自己的责任队列，在授权范围内完成节点，经过检查、确认和交接，使业务合法进入下一环节。依据分别来自 [QoderWake 产品简介](https://docs.qoder.cn/qoderwake/overview) 和 [本项目用户与 MVP 规格](</Users/mac/Documents/ChatGPT/ZKER- staff/docs/product/user-jtbd-mvp-prioritization.md:5>)。

因此：

1. **现在比配置体验、入口清晰度和现场可操作性，QoderWake 更占优。** 本轮其页面可用；ZKER-staff 的 8765 入口连接被拒绝，前端类型检查失败。这个判断只针对本机观察，不代表两者在所有环境中的可靠性比较。
2. **比较业务责任与受控交接的设计深度，ZKER-staff 有明确的差异化方向。** 但需要转化为普通员工能完成的真实任务，才能成为可售优势。
3. **“我们有 SOP，它只有聊天”“我们有人工审批，它完全没有”“我们能上云，它只能本机运行”均不成立。** QoderWake 有 WakerFlow、人工确认、版本与运行历史，官方也提供云电脑/ECS 部署方式。
4. **最危险的路线是同时追赶其全部通用能力，又把本项目完整企业治理模型一次性暴露给用户。** 这会同时增加研发成本和上手负担。
5. **建议聚焦一个能够付费验证的完整业务闭环，学习竞品的使用方式，保留本项目的人责和业务事实语义。** 这符合现有 Golden Slice 分期原则，并非缩减最终能力范围。

## 3. 产品定位、用户与购买理由

| 维度 | QoderWake CN | ZKER-staff | 产品含义 |
|---|---|---|---|
| 核心价值 | 数字员工承担持续工作，组合能力完成任务（UI/O） | 人员与数字员工按 SOP 完成受控业务结果（D/C） | 比较应以业务结果为单位 |
| 默认进入方式 | 工作看板、Waker、Group、IM、自主工作（UI） | 工作台、责任队列、WorkItem、SOP；也支持 Agent-first（D/C） | 本项目必须降低“找人、找节点、找动作”的成本 |
| 首要使用者 | 委派任务、维护 Waker 的使用者及协作团队（UI/O；非客户调研结论） | 普通员工、节点责任人优先，其次是 SOP/Agent Owner 和管理员（D） | 不应让普通员工先学完整平台架构 |
| 数字员工定位 | 有职责、环境、资源、记忆及权限的工作执行者（UI/O） | AgentProfile 是受授权约束的执行主体，与自然人分离（D/C） | 数字员工名称不能替代责任人身份 |
| 流程管理 | WakerFlow 编排阶段、Waker、分支与人工确认（UI/O） | 独立版本化 SOP，实例化后解析责任与执行候选（D/C） | 本项目优势候选是责任与实例治理 |
| 工作空间 | 项目主要绑定目录、文件上下文和 Waker 访问关系（O） | 企业业务对象、流程实例、任务、证据与组织作用域（D/C） | 两者“项目”不能按名称一一等同 |
| 协作组织 | Group 与 @Waker，具备 Leader/专家协作思路（UI/O） | 人类角色、组织关系、Team、任务授权、责任与审批分离（D/C） | AI Group 不天然等于企业组织结构 |
| 部署 | 本机、远端环境，官方有云电脑/ECS Web UI（UI/O） | 商业闭源 B/S、受控服务端、既有客户/组织供给租户（D） | “有 Web 页面”不是独有能力 |
| 购买理由 | 较快获得通用任务执行与工作自动化 | 对责任、权限、业务状态、交接和审计有更强要求 | 本项目必须证明额外复杂度值得付费 |
| 商业验证 | 有公开套件订阅入口；本轮未核验客户规模或营收 | 首发用户与试点仍须真实研究/验收（D） | 不编造市场份额和 ROI |

QoderWake 官方“项目”描述明确指向工作目录与访问关系，而非完整业务项目账本。参见 [项目文档](https://docs.qoder.cn/qoderwake/projects)。本项目的既定交付与租户来源见 [产品形态规格](</Users/mac/Documents/ChatGPT/ZKER- staff/docs/implementation/product-shape-bs-brought-tenant-2026-08-29.md:15>)。

**潜在客户选择建议，属于待验证商业假设：**

| 客户工作特征 | 更容易获得价值的方向 | 本项目的应对 |
|---|---|---|
| 高频临时资料整理、文件处理、通用开发协作 | QoderWake 的任务委派与能力组合 | 学习体验，不以重复建设通用功能为主要卖点 |
| 明确分工但流程经常变化的小团队 | Group + 轻量 WakerFlow | 保留 Agent-first 与临时协作，不强迫每次聊天建 SOP |
| 跨岗位、跨部门、重复发生且需要交接的工作 | 本项目的目标设计更贴合 | 以真实人员队列和交接质量证明价值 |
| 离职撤权、复核分离、结果追责要求高 | 本项目企业治理方向更贴合 | 必须提供可复核负例与运行证据 |
| 已有 OA/ERP/CRM，只缺部分 AI 执行能力 | 两者都可能成为补充 | 明确业务事实源和集成边界，避免复制业务主数据 |

## 4. 核心对象与业务模型差异

本项目核心设计可概括为：

    SOP 版本与节点策略
        → 流程实例 WorkExecution
        → 待办 WorkItem / 节点实例
        → 当前自然人责任与授权
        → 人工执行或合格数字员工
        → ExecutionAttempt / DSH
        → 完成检查、必要复核与审批
        → ResultCommit / Handoff / Audit / Outbox
        → 下一节点

QoderWake 的产品组织可概括为：

    用户目标 / IM / 自动触发
        → Waker、Group 或 WakerFlow
        → 项目上下文、Skill、连接器、知识与记忆
        → 阶段/节点执行、必要人工确认
        → 运行记录、输出与产物查收

以上为分析示意，第二条不推断其未公开内部数据库或事务实现。

**真正需要比较的是：流程里的“人”是什么对象，结果的“完成”由谁决定。**

本项目把责任、人工执行、Agent 分配、复核、审批分别建模。SOP 模板声明策略，节点激活时解析具体人员和合格 Agent，运行开始后固定相应版本与快照。数字员工退出或人员调动不应迫使业务流程重写。依据见 [产品文档节点人机责任合同](</Users/mac/Documents/ChatGPT/ZKER- staff/StaffDeck能力一致平台-完整产品设计文档.md:609>)。

QoderWake 已有人的确认与风险操作控制。本轮没有证明其具有与本项目同等的自然人组织身份、岗位候选规则、离职撤权、独立复核和跨对象事务语义，因此这些项目应记作“尚未证实”，不能写成“完全没有”。

**需要保持的三项设计判断：**

- SOP-first 与 Agent-first 是两种进入方式，不应变成两套业务完成口径或两套 Runtime。
- 同一节点的“自动/人工触发”和“自动流转/审核后流转”是两个独立选择；自动执行并不自动意味着可以跳过业务验收。
- 节点应让使用者知道目标、输入、责任、候选能力、完成条件、失败去向与输出，而不是只看到一张带 Agent 名称的流程图。

本项目对这两个入口的收敛已有 [ADR](</Users/mac/Documents/ChatGPT/ZKER- staff/docs/adr/0002-dual-entry-single-execution-core.md:4>)，无需为竞品比较另建平行模型。

## 5. 本轮 QoderWake 现场观察

| 页面 | 实际看到的内容 | 可以得出的判断 | 不能得出的判断 |
|---|---|---|---|
| 任务看板 | 本实例显示 9 项任务、2 项需要操作；有列表/泳道、状态和触发方式筛选 | 已提供跨 Waker 的工作管理入口 | “已完成”代表所有业务动作验收通过 |
| Waker 管理 | 本实例显示 14 个 Waker、2 个 Group；可按角色/环境筛选，有导入、分享、管理与对话入口 | 员工资源管理已产品化 | 14 是出厂角色数，或所有 Waker 已验证能工作 |
| Waker 详情 | 工作记录、记忆、自进化 Skill、资源、项目和权限分区 | 以员工为中心维护上下文与能力 | 记忆质量、自动进化效果已经验证 |
| 能力与资源 | Skills、连接器、知识库、WakerFlow、公开项目 | 常用资源集中配置，减少入口分散 | 每项资源都已安装、授权且可执行 |
| 连接器市场 | 当前显示 21 个连接器；浏览器/计算机控制显示全部 Waker 已安装；部分其他连接器仍显示授权入口 | 生态入口与安装/授权差别直观可见 | 21 个连接器全部可用或适合当前企业 |
| WakerFlow | 画布、脚本、输入参数、版本历史、运行、添加触发方式、执行记录 | 工作流已经是可管理的独立资产 | 有画布就证明业务条件均可靠执行 |
| WakerFlow 历史 | 4 条既有记录；其中显示“已完成 · 37 个阶段未执行”或“39 个阶段未执行” | 页面区分运行结束与未执行阶段 | 未执行阶段必然是缺陷；它也可能是结构校验或条件分支的预期结果 |
| 自主工作 | 定时、事件、API 触发，目标可为 Waker 或 WakerFlow；本实例没有自动任务 | 触发器入口明确 | 当前账号已经实现无人值守业务运营 |
| @Waker | 会话转任务的引导、IM 连接管理与待处理申请入口 | IM 是重要工作入口 | 本轮已验证某个渠道收发闭环 |
| 安全与权限 | 危险操作确认、敏感文件保护、工具使用权限、企业安全模式 | 不能把竞品说成“没有安全治理” | 页面存在就说明每项控制已启用或有效 |

抽查一个 Waker 时，危险操作确认、敏感文件保护与企业安全模式显示关闭，工具权限显示“17 直接使用”。这只说明**该对象当时的配置**，不是整个产品的默认策略结论；本轮未更改这些配置，也未测试拦截有效性。

用户定制的工作流中有“只校验编排结构”“平台完成不等于业务完成”等描述。这是很有价值的配置实践，但不能据此认定 QoderWake 已经内置相应行业数据库约束、审批身份模型或验收规则。

## 6. 全局能力对照

| 能力域 | QoderWake CN 的证据 | ZKER-staff 的设计与代码证据 | 竞争判断 |
|---|---|---|---|
| 员工创建与角色配置 | UI：员工列表、角色、环境、档案 | D/C：AgentProfile、版本、发布、Grant、目录与详情页 | 共同基础能力，本项目需缩短配置到试用的路径 |
| 单员工对话 | UI/O：直接对话与工作记录 | D/C：conversation/run/attempt 相关接口与页面 | 不构成独有卖点；本轮未比较输出质量 |
| 多员工协作 | UI/O：Group、Leader 协作、专家路由 | D/C：Team、黑板、成员与任务；高级能力分期 | QoderWake 的可见协作入口更完整，本项目不宜把高级协作提前阻塞主链 |
| SOP/工作流 | UI/O：WakerFlow 画布、脚本、版本、历史 | D/C：SOP 定义、版本、节点、状态编辑与实例 | 需要比责任和完成语义，不比有无画布 |
| 人员待办 | UI：需要操作与查收结果 | D/C：我的待执行、WorkItem、HumanTask；当前装配有缺口 | 这是本项目必须先兑现的差异点 |
| 节点能力配置 | UI：节点可显示所用 Waker | C：数字员工/Skill/Knowledge 三元配置组件 | 本项目组件存在，但本轮未发现其生产调用位置 |
| 人工确认 | UI/O：风险操作确认、流程中的用户决策 | D/C：复核、Approval、Receipt、职责分离 | 不能宣称竞品无人工环节；本项目要证明更精确的人责与授权 |
| Skill | UI/O：市场、安装、绑定、自进化入口 | D/C：创建、导入、发布、读取与版本合同 | 本项目应重视发现、预览、启用和试用体验 |
| Tool/MCP | UI/O：市场及安装/授权状态 | D/C：能力快照、调用/启用门、Runtime Adapter | 已有部分启用入口仅判定资格，不能计为真实工具交付 |
| 知识库 | UI/O：集中入口和 Waker 绑定 | C：文档入库、版本、查询与 citation；核验查询仍为 ILIKE | 本轮不能证明任何一方的检索效果更好 |
| 记忆 | UI/O：个人/项目/@Waker 记忆及版本管理 | D/C：Memory、反馈、权限与保留设计 | 界面可管理和召回正确需要分别验证 |
| 自主进化 | UI：自进化 Skill 入口 | D：人工信号与离线评测优先；C 有相关管理逻辑 | 不应为宣传提前开放未验收的自动生产进化 |
| 定时/事件/API | UI/O：自主工作统一入口 | C：Schedule、scheduled_task_runner、Channel 与 Open API | 入口数量不能替代运行、幂等和失败恢复验证 |
| 组织身份 | O：实例账号与设备、Waker/Group；企业组织级细则未证实 | D/C：Tenant、Membership、组织、角色、Binding、会话 | 本项目差异化基础较清晰，部署验收仍未完成 |
| 结果与交接 | UI/O：运行状态、最终返回、产物查收 | D/C：CompletionCheck、ResultCommit、Handoff、Audit/Outbox | 是本项目最值得做深、也仍存在断点的能力 |
| 恢复与取消 | O：等待、失败、重试；终止不自动撤销已发生副作用 | C：未知结果、fence、调和；部分 RPC unsupported | 不能只比较按钮，应比较外部副作用是否重复 |
| 用量与成本 | UI：用量入口；O：Credits 套件订阅 | D/C：预算、用量与指标相关模块 | 本项目应按已验收业务结果归因，不以 token 或运行次数代替价值 |
| 部署与运维 | O：本机/云电脑/ECS；运行依赖设备与出站服务 | D/C：B/S、PG、Gateway、DSH；当前 8765 不可连接 | QoderWake 可用体验领先；本项目企业部署优势仍待证明 |

这里的“已存在代码”不包含数据库已迁移、模型已连接或生产已验收的承诺。

## 7. 当前代码对竞争判断的约束

### 7.1 已经具备的实际基础

本项目并非只有文档。当前代码可定位到：

- React 路由、工作台、SOP、Agent、知识、工作详情和管理页面。
- FastAPI 应用装配、Cookie/CSRF/安全头和数据库不可用处理。
- SOP 节点、运行和候选成员关系的迁移文件。
- runtime_attempt_start_session → dispatch_attempt → execute_runtime_attempt → RuntimeConnectAdapter 的调用路径。
- COMPLETION_CANDIDATE 转入业务审批等待的逻辑。
- ResultCommit 的租户、幂等、fence、状态检查，以及同连接事务写入包装。
- Handoff 与 SOP 下一节点衔接的代码。

关键源文件见 [应用装配](</Users/mac/Documents/ChatGPT/ZKER- staff/services/control-plane/control_plane/app.py:42>)、[启动后的协调器调用](</Users/mac/Documents/ChatGPT/ZKER- staff/services/control-plane/control_plane/runtime_attempt_start_session.py:583>)、[完成候选审批](</Users/mac/Documents/ChatGPT/ZKER- staff/services/control-plane/control_plane/runtime_execution_coordinator.py:359>)、[结果事务](</Users/mac/Documents/ChatGPT/ZKER- staff/services/control-plane/control_plane/result_commit_store.py:506>)、[下一节点推进](</Users/mac/Documents/ChatGPT/ZKER- staff/services/control-plane/control_plane/sop_node_advance_after_commit.py:1>)。

这意味着正确的研发方向是继续打通已有主链，而不是另建第二套任务执行引擎。

### 7.2 影响产品竞争力的七个明确缺口

| 发现 | 本轮证据 | 对用户与竞争力的影响 | 建议验收方式 |
|---|---|---|---|
| “我的待执行”路由装配失败 | ESLint 通过；tsc 返回 TS2322，路由传入 session 等属性，但 MyWorkPageProps 未声明 | 最核心员工入口无法通过当前编译门 | 当前 checkout 类型检查通过，再验证登录后的实际路由 |
| 人工触发没有接入路由 | MyWorkPage 的按钮依赖 onCompleteNode；路由没有提供回调 | 员工可以有节点列表，但不能据此完成真实任务 | 浏览器从节点增补内容、触发、看到真实回执 |
| 三元配置仍未成为完整配置体验 | NodeCapabilityPanel 有数字员工/技能/知识库字段；生产 TSX 精确查找未找到外部调用，字段仍需手工填 ID | 产品最有特色的能力尚未成为业务人员可用操作 | 在真实 SOP Studio 中选名称/版本，保存、发布、实例读回一致 |
| Runtime 启动路径未证明带入实际业务任务内容 | 核验的启动调用未传 task；dispatch_attempt 缺省使用 attempt:<id> | 不能据此声称节点目标、资料、补充说明完整送达 AI | 比对节点输入、投影、Gateway 请求和实际模型接收内容 |
| 结果事务包装不等于完整交接已经强制发生 | TX08 的 completion_check/handoff_package 为可选，缺省跳过对应 INSERT；该 dispatch 路径未传入 | “执行结束”仍可能没有完整完成检查与交接记录 | 对所选业务链验证应有实体全部产生、失败全回滚、下一节点只激活一次 |
| 对话中增补、恢复和实时反馈仍有限 | Gateway 的 provideInput/resumeExecution 返回 unsupported；streamEvents 先等待 completion | 持续追问、运行中纠正和长任务可观察体验受限 | 长任务运行期间可见事件；输入真正生效；恢复不重放副作用 |
| 某些能力仍是最小读写或门禁语义 | 核验 knowledge.search 为同租户已发布文档 ILIKE；部分 Tool/MCP enable 不持久化启用状态 | 不能把资源管理页面等同于成熟 RAG 或可执行连接器生态 | 使用带答案与拒绝负例的检索集；连接器按安装到真实调用逐层验收 |

源证据：[路由参数](</Users/mac/Documents/ChatGPT/ZKER- staff/apps/web/src/app-session-routes.tsx:408>)、[MyWorkPage 属性](</Users/mac/Documents/ChatGPT/ZKER- staff/apps/web/src/pages/work/MyWorkPage.tsx:24>)、[人工触发按钮](</Users/mac/Documents/ChatGPT/ZKER- staff/apps/web/src/pages/work/MyWorkPage.tsx:191>)、[三元配置组件](</Users/mac/Documents/ChatGPT/ZKER- staff/apps/web/src/pages/work/NodeCapabilityPanel.tsx:112>)、[任务内容缺省](</Users/mac/Documents/ChatGPT/ZKER- staff/services/control-plane/control_plane/coordinator_dispatch.py:151>)、[Gateway 行为](</Users/mac/Documents/ChatGPT/ZKER- staff/packages/runtime-gateway/lib/runtime_contract_service.mjs:478>)、[知识查询实现](</Users/mac/Documents/ChatGPT/ZKER- staff/services/control-plane/control_plane/knowledge_search_session.py:220>)、[MCP 启用入口](</Users/mac/Documents/ChatGPT/ZKER- staff/services/control-plane/control_plane/routes.py:1339>)。

这些判断只适用于已核验路径。例如 ILIKE 查询不证明全仓没有其他检索实现，某个 RPC unsupported 不证明全部 HTTP 交互都不可用；但只要推荐给用户的主路径仍经过这些位置，就必须说明其能力边界。

### 7.3 全量路由分类与现场运行状态

复用仓内 route_gap_audit.py 的合同解析与路径规范化、audit_front_to_back_coverage.py 的显式 stub 判别，对 create_app() 注册表进行只读检查，结果如下：

| public + ui 合同的去重方法/路径 | 数量 |
|---|---:|
| 总数 | 395 |
| 注册到非显式 410 handler | 208 |
| 注册到显式 410 stub | 73 |
| 未找到对应方法/路径注册 | 114 |

命令退出码为 0 仅表明分类过程完成。**208 不代表 208 个可用业务接口，395 也不是产品功能总数；不能据此计算产品完成率。** 条件关闭的能力、专门保留的拒绝面与主链缺口，需要按产品分期逐项解释。

本轮访问 http://127.0.0.1:8765/：浏览器报告连接拒绝；curl 退出码 7，HTTP 000。未启动服务，因此无法进行当前产品登录和浏览器业务验收，也没有把旧截图当作本轮交互证据。

当前任务图与 harness 仍标记 productionStatus=NOT_READY；任务图保留 IMPLEMENTATION_NOT_STARTED 的验收口径。源码已有大量实现与该状态并不矛盾，前者证明存在代码，后者不授予产品完成或生产就绪结论。

## 8. 交互体验与信息架构反思

**QoderWake 值得学习的，是让用户知道“下一步该做什么”。**

工作看板负责管理“事”，Waker 管理负责配置“执行者”，能力与资源负责补齐“执行条件”。员工详情按工作、记忆学习、资源、权限组织，资源中心又复用一致的浏览与安装方式。WakerFlow 把输入、结构、脚本、历史和运行放在同一工作区域。用户不需要先理解内部实体数量。

本项目的文档同样规定了渐进展示：[信息架构](</Users/mac/Documents/ChatGPT/ZKER- staff/docs/ui/information-architecture.md:82>)明确区分工作台、WorkExecution、WorkItem 与 Attempt。因此问题更接近**文档的交互原则尚未完整落实到主路径**，而不是必须另设计一个全新产品。

| 当前可见问题或风险 | 建议的用户表达 | 后台仍须保留的语义 |
|---|---|---|
| WorkExecution、WorkItem、Attempt 概念负担 | 对用户显示“这件事、当前环节、执行记录” | 对象与状态不合并 |
| Agent/Skill/Knowledge 需要填 ID | 搜索名称、看用途/版本/权限，选择合格项 | 版本与能力快照、授权交集 |
| 配置完成与真正可运行混淆 | 显示“还缺什么、谁能处理、处理后如何试用” | 配置、授权、连接、实际试用分层 |
| 无权限或功能未启用时只给技术错误 | 说明原因、可操作恢复路径和责任人 | 后端权威授权不靠菜单隐藏 |
| 日常页面出现 operator CLI 等实现术语 | 普通员工只看到自己的任务和可执行动作 | 运维入口保留在管理域 |
| 管理页面多于主链体验 | 默认突出“待我处理、待我确认、异常待处置” | 完整能力仍按作用域可达 |
| 任务完成只显示一个绿点 | 显示产物、完成标准、复核状态与交接去向 | ResultCommit/Evidence/Audit 分层 |

WorkbenchPage 当前页脚仍提到 operator CLI，可作为“工程说明泄漏到普通用户界面”的具体例子，见 [工作台组件](</Users/mac/Documents/ChatGPT/ZKER- staff/apps/web/src/pages/workbench/WorkbenchPage.tsx:55>)。

**建议的最小主体验：**

员工登录 → 待我处理 → 打开当前节点 → 看目标/资料/标准/截止时间 → 使用推荐且合格的数字员工或人工处理 → 查看产物 → 必要复核 → 提交并看到下一责任人。

普通员工不应在这条路径里创建角色、理解 capability ID、诊断 Runtime 或打开工程门禁。风险控制留在服务端和上下文明确的确认界面。

## 9. 安全、责任与数据完整性比较

QoderWake 已提供工具权限、危险命令确认、敏感文件保护等配置。这类控制更直接回答“执行者能碰什么、遇到什么操作要暂停”。本项目要进一步回答“哪个自然人对哪份业务结果负责、谁有权确认、谁必须独立复核、确认对应哪个版本、失败后如何不重复提交”。

这是层次上的区别，不是安全有无的区别。

| 核验问题 | QoderWake 本轮结论 | 本项目本轮结论 |
|---|---|---|
| 能否限制工具和文件操作 | UI 有对应配置；未做攻击/拒绝测试 | D/C 有授权与快照约束；未做全量实时撤权测试 |
| 是否有人工确认 | UI/O 已证明存在 | D/C 有审批/Receipt/职责分离 |
| 人工确认是否绑定独立自然人、具体对象与版本 | U，需厂商或真实部署验证 | D/C 明确建模；生产效果仍待验收 |
| 是否具备企业租户与组织隔离 | 当前单实例文档不能证明完整企业多租户能力 | D/C 明确；不能仅凭 schema 声称全部安全 |
| 运行失败是否可安全恢复 | O 提供失败处理与重试说明 | C 有未知结果与 fence；部分 Runtime 方法仍不支持 |
| 已发生外部操作能否回滚 | 不能从“终止”推导自动回滚 | 同样不能从数据库事务推导外部系统全回滚 |
| 历史上下文是否保持正确授权 | O 描述记忆作用域与管理 | D/C 有版本/上下文重新授权设计与代码 |
| 是否可称为企业级安全已验收 | 本轮不能 | 本轮不能 |

官方部署文档规定，该部署方式下同一实例的不同访问设备需要使用同一个 Qoder 账号。这与本项目 Tenant/User/Membership 的目标模型确有差异；但不能外推为“Qoder 所有企业产品均不支持多用户”。参见 [QoderWake 云部署账号要求](https://docs.qoder.cn/qoderwake/ecs-deployment)。

**本项目可建立的优势必须通过失败场景体现：**

双人同时领取只有一人成功；人员离职后旧会话和旧授权不能继续生效；执行者不能按策略自批；输入或产物换版本后旧审批失效；外部结果未知时不能盲目重试；提交过程中故障不留下“业务完成但交接缺失”；历史证据可回查且访问受限。

这些测试比增加角色数量或审批页面数量更有竞争意义。

## 10. 技术架构与交付成本

本项目当前既定结构为 React Web → Python/FastAPI 控制面与 PostgreSQL → Runtime Gateway → DeepSeek Harness。控制面拥有人员责任、授权、业务状态和持久事实；DSH 是唯一 Agent Runtime。这个分工适合把随机性较高的 AI 执行与确定性的业务完成判定隔开。

其优势是责任和业务状态可控制、可测试，人员或模型变化不必改变业务语义；代价是必须持续维护跨层合同、状态映射、错误传播、事务与事件，以及真实运行的兼容验证。

QoderWake 的可见优势是把这些使用环节较紧密地包装在现有产品内。官方也支持 Waker 的本地/远端环境与云端部署。不过，未读取其内部源代码，不能猜测其存储引擎、调度架构、隔离实现或内部事务保证。

**本项目的工程反思：**

1. 主路径完整性比横向模块数更重要。一个看似存在的三元面板，如果没有进入真实 SOP 编辑器，就没有替用户完成配置。
2. 函数或接口的返回成功，必须对应明确业务后置条件。调用 TX08 名称的包装函数，不代表每次都写入全部必须实体。
3. 配置可构造、Runtime 可连接、模型执行成功、业务结果通过，应分别呈现。
4. 应持续复用当前协调器与 Adapter，并用契约和消费者测试打通链路。
5. 当前不应把 QoderWake 再塞入本项目充当第二套 Runtime。它可以作为外部工作工具或研发协作工具；未来若需要产品集成，应另行验证官方接口、授权、结果契约与现有 DSH 边界的兼容性。

最后一项是集成建议，不是已经存在或已经授权的产品接入能力。

## 11. 双方优势、劣势与 SWOT

| 类别 | QoderWake CN | ZKER-staff |
|---|---|---|
| 优势 | 本轮现场可用；工作/员工/资源入口清晰；WakerFlow 与历史管理可操作；已有能力市场和生态入口；角色化委派容易理解 | 已明确 SOP、人责、授权、版本、业务完成与交接模型；存在相关控制面、PG 与 Runtime 代码基础；完整能力路线和验收目标明确 |
| 劣势/已知限制 | 当前实例配置与实际可用性仍需逐项验证；安装不等于授权；“已完成”仍须看阶段/产物；依赖设备、模型账户与连接器；公开的单实例账号模型不直接等同企业组织治理 | 当前主入口类型检查失败；8765 未运行；节点触发/配置存在装配缺口；部分 Runtime 能力未支持；一些资源能力仍是最小实现；大量概念增加建设与认知成本 |
| 机会（推断） | 由个人委派扩展至团队协作与重复流程，利用现有工具生态降低采用成本 | 在既有客户场景里，把跨岗位业务结果做到可验收、可交接、可追责；形成可复用流程与验收模板 |
| 威胁（推断） | 通用 Agent、工作流工具与办公平台不断增加相似能力；复杂业务仍可能需要外部事实系统 | QoderWake 持续完善流程/治理，压缩差异窗口；成熟 BPM 与自动化平台已有大量可替代基础能力；尚未证明的重治理可能拖慢首个价值交付 |

**对本项目最重要的自我反思是：设计完整不是需求验证，治理详细不是用户体验，代码数量不是交付质量。**

现有产品文档已经把用户研究和试点证据列为未完成项。不能因为模型能解释架构合理，就认定企业客户愿意为额外的配置、实施和维护成本付费。

## 12. 价格、成本、商业化与替代选择

### 12.1 价格口径

本轮官方公开页面的搜索可读内容显示，Qoder CN 套件专业版为 ¥59/月、高级版为 ¥169/月，并注明个人相关订阅包含 QoderWake。该信息是公开套餐快照；直接价格页未返回可解析正文，本轮未进入结算，因此不把它当成已确认的采购报价。Credits、并发、模型、企业授权和交付范围须以具体方案为准。参见 [Qoder CN 价格页](https://qoder.com.cn/pricing?tab=qoderwork-cli&type=subscription)。

ZKER-staff 未在本轮找到可以据以核验的正式销售价格、毛利、部署成本或付费试点结果，不能编造价格竞争力。

两者也不适合简单按“月费谁更低”比较：个人工具订阅与企业实施交付可能承担不同的身份、数据、运维与服务责任。

### 12.2 应比较单位业务结果成本

建议使用本项目已定义的 WVBO：每周满足业务完成、Evidence 通过、无未决副作用的去重业务结果。指标依据见 [产品指标字典](</Users/mac/Documents/ChatGPT/ZKER- staff/docs/product/product-metrics-dictionary.md:5>)。

    每个已验收结果的总成本 =
      （模型 + 工具 + 运行资源 + 人工复核/返工 + 实施运维分摊）
      ÷ 已验收业务结果数

同时观察周期、首次通过率、人工接管、异常恢复和安全拒绝。没有真实基线时不宣称节省百分比；分母为零时不输出“单位价值成本很低”。

### 12.3 商业路径建议

对本项目更合理的验证路径是：从一个已有客户/组织选一个重复发生、有明确责任和验收标准的流程，拿到真实业务基线，再证明周期缩短、返工下降或交接透明度提升。可能的收费结构包括平台服务、实施集成和用量，但本轮只能作为商业假设，不应直接定价。

流程治理若只是额外填表，客户不会持续使用。只有它降低追问、漏项、返工和对账成本，才支持企业级定价。

### 12.4 其他替代品对差异化的提醒

| 类别与产品 | 一手资料证明的相邻能力 | 对本项目的提醒 |
|---|---|---|
| Dify：AI 应用构建 | Workflow/Chatflow/Agent 与工具插件等扩展点 | 仅有模型、知识、工具和流程画布难形成长期差异 |
| n8n：自动化与 AI 工具审批 | AI 工具调用可通过相应服务暂停并请求人工批准 | 人工确认本身不是独有能力 |
| Camunda：业务流程与人工任务 | 流程到达 User Task 时创建人工任务，支持受理人/候选配置 | SOP、人责和候选分配也有成熟替代方案 |

来源：[Dify 插件类型](https://docs.dify.ai/en/develop-plugin/getting-started/choose-plugin-type)、[n8n 人工批准相关节点说明](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.gmail/message-operations/)、[Camunda User Tasks](https://docs.camunda.io/docs/components/modeler/bpmn/user-tasks/)。

因此，本项目的长期壁垒更可能来自**客户可复用的流程资产、可靠的业务集成、可验证的交接质量和较低的实施成本**。把现有术语组合得更完整，本身不会形成壁垒。此处是战略判断，不是市场份额或客户流失预测。

## 13. 值得学习、需要深化、应避免的方向

| 方向 | 具体建议 | 原因 |
|---|---|---|
| 学习：工作与资源分开 | 工作台只回答待办、结果、异常；员工与资源集中配置 | 用户按工作目标进入，而非按数据库表进入 |
| 学习：配置到试用的连续路径 | 配置职责→选择资源→检查可用条件→小任务试用→发布/绑定 | 让用户直接看到配置的效果 |
| 学习：自然语言与结构化编辑协同 | 生成候选、预览图与差异、校验后发布 | 保留业务控制，又减少手填配置 |
| 学习：以运行失败驱动修改 | 错误定位到具体节点、输入、版本和产物 | 比只返回总流程失败更容易修复 |
| 深化：人责 | 展示当前责任人、执行者、复核人、接收人及变更历史 | 将责任模型转化为业务可见价值 |
| 深化：完成定义 | 产物、检查结果、审批、业务回写与交接绑定 | 避免模型说完成而业务没完成 |
| 深化：版本与恢复 | 运行快照、旧版本回查、未知结果调和、幂等重放 | 支撑长流程和人员交接 |
| 深化：场景模板 | 用已验收流程包降低重复实施成本 | 将行业经验转化为复用资产 |
| 避免：全域同步追赶 | 不让广场、全渠道、高级 Team、自动进化同时阻塞首个业务闭环 | 当前文档本就允许分期 |
| 避免：用提示词代替业务规则 | 决定权限、责任、完成和写回的规则放在权威系统 | 防止配置文字与真实约束脱节 |
| 避免：另建 Runtime | 保持当前 DSH 与协调器主链 | 避免状态和完成口径分叉 |
| 避免：按 Agent 数量宣传生产力 | 按实际合格结果、时间、成本与风险衡量 | 多角色和大工作流不自动产生交付价值 |

对于现有 19830 中的大型定制流程，建议把它视为流程表达和编排验证工具。能显示大量阶段说明表达能力较强；真正交付仍应看每次选择的范围、实际输入、执行节点、验收结果和最终产物，不根据阶段数量评价成熟度。

## 14. 建议优先级与验收路线

以下为分析建议，**不是新 SSOT 或已执行任务排程**。具体开发应继续映射当前 execution-plan、global-development-task-graph、TaskPacket 与 claim。

| 顺序 | 交付目标 | 本轮证据对应 | 完成条件 |
|---|---|---|---|
| 第一优先：员工主路径可使用 | 修复路由装配，接入“我的待执行”真实触发 | TS2322、缺 onCompleteNode、8765 未运行 | 当前源码通过检查；人员登录后可以在真实浏览器完成一个节点 |
| 第二优先：配置进入实例 | 三元配置进入 SOP Studio，名称与版本可选择 | NodeCapabilityPanel 未找到生产使用位置；手填 ID | 编辑、保存、发布、实例化和运行快照一致 |
| 第三优先：业务内容进入执行 | 任务目标、输入、上游摘要、补充内容受控传入 DSH | 缺省 task、输入桥缺口 | 实际模型输入可按授权复核；运行中增补有明确支持或拒绝 |
| 第四优先：结果进入业务事实 | 完成检查、复核、交接、下一节点和证据打通 | TX08 可选参数、业务桥已有但未全链验收 | 正常全有、失败全无、重放不重复；下一责任人可见 |
| 第五优先：让配置可诊断 | 连接器/模型/知识/权限可用性及故障原因清晰 | 安装/启用与实际执行有差距 | 使用者知道缺哪一步；小任务验证可回读 |
| 第六优先：验证业务价值 | 在既有租户中选代表性流程做小范围试点 | 用户与商业证据尚缺 | 周期、返工、质量、成本与用户完成率有真实记录 |
| 后续独立轨：扩展复用 | 按现有分期接渠道、调度、高级协作与进化 | 已有完整范围与条件启用设计 | 每轨都有自己的真实依赖与验收证据 |

不建议先估算一个漂亮的“几周追平竞品”。本轮没有团队产能、依赖可用性、缺陷规模和真实试点信息，给出确定工期会制造虚假精度。

## 15. 下一轮应如何公平实测双方

本轮没有运行以下对照实验。它们是可执行的验证方案，用于把设计比较升级为产品比较。

| 场景 | 对两边使用相同条件 | 记录指标/证据 |
|---|---|---|
| 首次委派一个低风险任务 | 相同材料、目标、输出要求与允许工具 | 首个合格结果时间、人工配置步骤、失败/恢复次数 |
| 三节点跨角色交接 | 起草→独立复核→确认交付 | 每步实际执行者、责任人、产物版本与下游输入一致性 |
| 人工增补与纠正 | 运行前/运行中补充一个会改变结果的事实 | 补充是否实际生效、是否保留来源、是否引入旧上下文 |
| 工具授权不足或过期 | 同一只读测试服务与受控账号 | 是否清晰阻断、如何恢复、是否错误标为成功 |
| 模型失败与额度不足 | 受控失败条件，禁止真实付费扩容 | 已完成步骤如何保留、错误是否传播、是否有无产物成功 |
| 并发/重复提交 | 相同幂等键，重复或并发的受控请求 | 是否重复领取、重复写回、重复交接 |
| 人员权限变化 | 测试身份被撤权或改派 | 旧会话/旧授权/旧审批是否失效；历史是否可追查 |
| 知识引用与隔离 | 同源资料、标准答案、无权文档与缺失答案 | 引用正确、拒答正确、越权检索负例 |
| 业务完成与外部结果未知 | 受控测试系统返回超时或不确定结果 | 是否盲目重试、是否产生重复副作用、调和路径 |
| 运营者事后复盘 | 仅给任务编号，不给执行者总结 | 能否找到版本、输入、工具、产物、审批和交接事实 |

按任务难度分层、多次重复，记录样本量和异常处理成本。首次实验的重点是建立基线；任何“领先百分比”必须注明样本、模型、预算、资料、权限和设备条件。

## 16. 最终产品判断

**ZKER-staff 值得继续推进，但价值不在于成为功能更多的 QoderWake。** 现有设计最值得保留的部分，是独立 SOP、人类责任、合格能力选择、结果确认和交接证据。最应改变的是把这些能力兑现到一个短而完整的使用路径上。

QoderWake 已经证明：数字员工、Group、能力资源、工作流、历史和触发方式可以做成用户可理解的工作产品。本项目应认真学习其产品化方式，同时通过真实业务验收证明更深的人责与结果治理能够减少客户的漏项、返工与追责成本。

本轮最明确的决策建议是：**先交付“一个普通员工真正完成自己的一个 SOP 节点，并把合格结果交给下一责任人”，再扩展到更多员工、流程和自动化。** 这比继续增加孤立页面、角色模板或工作流阶段更能缩短与竞品的实际交付差距。

## 附录 A：检查记录与原始结果

仓外原始检查输出：[competitive-analysis-evidence.json](/Users/mac/.codex/visualizations/2026/09/11/01a08f35-b9ee-7aa0-a8b8-96db2faad927/competitive-analysis-evidence.json)。下列命令均在当前工作区实际执行；路径分类通过现有脚本的函数复用完成，无新增仓内审计脚本。

**前端检查**

工作目录：/Users/mac/Documents/ChatGPT/ZKER- staff/apps/web

    npm run lint && npm run typecheck

ESLint 阶段成功，TypeScript 阶段失败，组合命令退出码 2：

    src/app-session-routes.tsx(412,13): error TS2322:
    Type '{ session: AuthSession; onLogout: () => void; onNavigate: (id: string) => void; }'
    is not assignable to type 'IntrinsicAttributes & MyWorkPageProps'.
    Property 'session' does not exist on type 'IntrinsicAttributes & MyWorkPageProps'.

没有继续宣称 build 通过。未修改代码，因此未运行与本次分析无关的全量回归。

**当前服务入口**

    curl --max-time 8 --silent --show-error --output /dev/null \
      --write-out 'HTTP %{http_code}\n' http://127.0.0.1:8765/

退出码 7，HTTP 000；浏览器同样报告 net::ERR_CONNECTION_REFUSED。这不证明源代码永远不能启动，只证明该时点无可访问的指定服务。

**路由分类方法**

解释器：仓内 .venv/bin/python -B；工作目录：仓根。

    import route_gap_audit as g
    import audit_front_to_back_coverage as a
    from control_plane.app import create_app

    ops = g.contract_ops()
    # 将 app.routes 按 method + g.norm(path) 聚合。
    # 未注册 → unmounted；
    # 同键全部被 a._is_not_implemented_stub_route 判定 → explicit_410_stub；
    # 其余 → non_stub_handler。

实际结果：395 / 208 / 73 / 114，退出码 0。该摘录解释算法；完整可重放命令另见 [route-classification-command.txt](/Users/mac/.codex/visualizations/2026/09/11/01a08f35-b9ee-7aa0-a8b8-96db2faad927/route-classification-command.txt)。

**来源新鲜度**

zvec-grep 前两批响应为 possibly_stale / served_from_current_index / background_refresh running，用于定位；后续代码检索返回 fresh。关键缺口均补充了直接源码读取、精确引用或当前命令验证，没有将旧审计结论直接当作当前缺陷。

**验证层级**

| 层级 | 本轮状态 |
|---|---|
| 产品文档与设计 | 已核验主要定义、用户顺序、分期、责任和完成模型 |
| 代码 | 已核验主链与若干横向域；非逐文件完整审计 |
| 静态检查 | ESLint 成功；TypeScript 失败 |
| 路由 | public/ui 合同全量注册分类完成；非全量 HTTP 行为测试 |
| 数据库 | 读取迁移与事务源码；未执行迁移、业务写入或恢复演练 |
| Runtime/模型 | 读取调用路径与缺口；未启动真实业务执行 |
| 浏览器 | QoderWake 只读现场完成；本项目 8765 连接拒绝 |
| 真实连接器/IM | 读取配置入口；未验证实际调用 |
| 生产/商业 | 未进行部署、真实客户试点或收益验证 |

## 附录 B：主要资料

项目主要证据为当前源码与以下产品资料：

- [完整产品设计文档](</Users/mac/Documents/ChatGPT/ZKER- staff/StaffDeck能力一致平台-完整产品设计文档.md>)
- [用户与 JTBD、MVP](</Users/mac/Documents/ChatGPT/ZKER- staff/docs/product/user-jtbd-mvp-prioritization.md>)
- [产品指标字典](</Users/mac/Documents/ChatGPT/ZKER- staff/docs/product/product-metrics-dictionary.md>)
- [信息架构](</Users/mac/Documents/ChatGPT/ZKER- staff/docs/ui/information-architecture.md>)
- [当前执行计划](</Users/mac/Documents/ChatGPT/ZKER- staff/docs/implementation/execution-plan.md>)
- [全局产品任务图](</Users/mac/Documents/ChatGPT/ZKER- staff/docs/implementation/global-development-task-graph.yaml>)
- [当前 Harness 状态](</Users/mac/Documents/ChatGPT/ZKER- staff/docs/implementation/harness-state.yaml>)

QoderWake 官方核验页：

- [产品简介](https://docs.qoder.cn/qoderwake/overview)
- [Waker 管理](https://docs.qoder.cn/qoderwake/manage-wakers)
- [WakerFlow](https://docs.qoder.cn/en/qoderwake/wakerflow)
- [Skills 与连接器](https://docs.qoder.cn/qoderwake/skills-and-integrations)
- [记忆系统](https://docs.qoder.cn/qoderwake/memory)
- [项目](https://docs.qoder.cn/qoderwake/projects)
- [自主工作](https://docs.qoder.cn/qoderwake/automated-tasks)
- [云电脑/ECS 部署](https://docs.qoder.cn/qoderwake/ecs-deployment)
- [价格](https://qoder.com.cn/pricing?tab=qoderwork-cli&type=subscription)

历史记忆仅帮助定位审计与比较注意点。历史 Waker 数量、运行额度错误和旧路由总数没有作为当前事实使用。当前工作区代码、实时命令和现场页面优先。

