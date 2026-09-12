# 知识、记忆、本体与部署复杂度独立复核

研究日期：2026-09-11（项目本地日期；原始抓取以manifest中UTC为准）。范围：OA数字员工协作平台37、41、46、55、56、58号设计，以及主任务选出的8篇微信公众号文章。状态：`RESEARCH_REVIEW / NOT_IMPLEMENTED / NOT_BENCHMARKED`。

本报告只说明已读取的文章和一手来源，不能代表210个候选组或整个公众号资料库已全文研究。未查询IMA，IMA覆盖由主任务单独记录。未安装候选、运行模型、导入资料、修改产品合同、执行公众号命令或改变全局Skill/记忆。本项目仍无最终底座、无产品实现；173项需求、22页和72个原AC必须保留。

## 1. 独立结论

**现有业务架构方向合理，但不足以声称已经证实是“最佳方案”。主要优化空间是把技术组件从默认清单改成可验证的增量，并消除同一方案里的默认值矛盾。** 不应为了显得更新再叠加一个知识平台、记忆服务、图数据库或Agent循环。

37号的模块化单体、一个OA权威、隔离Worker，41/56号的内容版本与可信授权、58号的单Attempt单循环应保留。知识/记忆首期可以先验证“已有数据库和文件服务 + 授权任务资料目录/章节定位 + 已有全文能力 + 有界按需读取”。Qdrant继续作为MySQL路线优先语义增强候选；Docling继续作为复杂文档解析候选；二者不是最小任务闭环的强制前置。全文中文质量不足、复杂材料无法可靠解析时，不能靠“保持简单”接受业务能力缺失。

56号10.1已经提出A=目录/全文/按需读取、B=增加Qdrant的对照；但9号服务清单仍写首期“加一个实际使用的向量索引”。建议统一为：先跑A/B同样本，A通过本切片标准即可暂不部署额外索引；若B显著改善必要的跨文档语义任务，再启用。**保留完整功能范围，允许不同能力沿既定切片分期实现。**

## 2. 八篇文章的读取覆盖与可采纳结论

以下均已逐段读取`selected-texts/`中的全部可提取正文。空行与图片链接未作为正文论据；未从图片推定额外事实。原始路径、正文摘要和来源元数据见[主任务清单](selected-articles.json)，本分支逐篇覆盖与SHA见[读取记录](primary-sources/article-reading-coverage.json)。发布日期从正文或元数据分别记录，不把下载日当发布日期。

| 文章ID及标题 | 正文范围、时间线索 | 主张核验与项目决定 |
|---|---|---|
| WX-0593《Wiki Creator，一个LLM Wiki管理工具》 | 1—280行；正文2026-07-07 | 两级目录、单主题页、来源、冲突记录、增量更新值得采纳；“不幻觉”“索引永远一致”不成立为已证事实。来源段落/lint只能检查结构，不能证明摘要正确、原文支持或并发更新安全。SkillHub链接仅取到站点壳，未获得具体Skill源码、版本和许可；不得安装或复制脚本。据此补文档导航，不整体采用WikiCreator。 |
| WX-0690《如何打造一个每周都在变聪明的公司大脑》 | 1—183行；转载2026-08-27，原文2026-08-25 | 已取得J.B.的X原文，核心是从一条重复流程开始、给小地图、任务按需读、纠正分流、共享前审查。可映射56号小型记忆及ExperienceProposal，不意味着原私聊全部共有。HQ是作者推荐产品，未获得其可再分发开源实现或本项目收益证据。 |
| WX-0899《OpenViking…文件系统…上下文管理》 | 1—91行；正文2026-08-20 | 官方README确认L0/L1/L2、目录化检索及提交会话后后台提取记忆；它仍结合向量检索，不能作为“文件目录已取代向量”的证据。当前main许可AGPLv3；本项目闭源二开交付条件下继续只研究机制，不默认引入。自动提取也不能代替本项目人员发布与权限检查。 |
| WX-0734《AI Native服务架构（二）：从DDD到Ontology》 | 1—731行；正文2026-08-01 | Fact/Logic/Action、复用已有模型、先场景后扩张是作者工程划分，可与Palantir对象/关系/动作/函数概念交叉理解。不是W3C统一三层标准。映射现有业务对象、指标定义、动作合同及Evidence即可，不因此再建Semantic Service微服务或第二Policy权威。 |
| WX-0746《知识图谱与本体》 | 1—98行；日期见主清单，正文未另取发布日期 | 正确提醒“图展示不等于本体”“先具体场景”“同名不等于业务等价”。本体与图谱的区别是作者业务解释，不应绝对化为图谱不能约束、OWL只能类型层。W3C OWL和PROV说明表达/溯源能力，不保证业务推断正确或要求图数据库。保留关系表优先。 |
| WX-0754《动态本体MVP V0.05：从会研判到会沉淀》 | 1—184行；正文2026-08-28 | 仅采纳通用机制：候选不覆盖基线、回放与人工晋级、失败不伪造结果、冷热资料生命周期。作者第7节明确记忆闭环、回放和数据治理仍待补，不能当成熟生产证明。未取得公开完整仓库/复现产物；不采用文中MinIO/Parquet/DuckDB组合，不延伸其军事场景算法。 |
| WX-0771《Semantica…开源Palantir…》 | 1—210行；日期见主清单 | 当前固定源码确认存在决策记录接口，但reasoning/confidence为调用者输入并作类型/范围检查，不能由此证明“真实推理”“因果正确”“合规通过”。当前HEAD pyproject为0.7.0、Python>=3.9.2，PyPI发行0.6.8仍声明>=3.8；文章和README徽章不能当兼容性结论。MIT只覆盖对应项目源码，额外数据库/模型另审。延后整库引入。 |
| WX-0213《7.1k Star！RAGFlow：最新开源OCR…》 | 1—413行；正文2024-05-10 | 是2024年资料，标题“最新”不能迁移到2026。本轮重新读取v0.27.2 README/Compose，资料解析、引用定位值得借鉴，但仍需数据库、索引、文件和缓存等部署角色。文章“大海捞针/无限上下文/消除幻觉”不能证明本项目中文表格与权限场景。保留56号在复杂文档质量确有持续优势时替换解析/检索实现的候选。 |

一手对应：[公司大脑原文][hq-original]、[WikiCreator登记页][wiki-hub]、[OpenViking说明][ov-readme]、[当前许可][ov-license]、[Palantir概述][palantir]、[OWL概述][owl]、[PROV-O][prov]、[Semantica固定接口][sem-code]、[固定项目元数据][sem-project]、[PyPI发行元数据][sem-pypi]、[RAGFlow固定README][rag-readme]、[Compose][rag-compose]。当前源码观察与本项目运行验证分开。

## 3. 保留、修订、延后与可推翻条件

| 对象 | 决定 | 理由与可推翻条件 |
|---|---|---|
| RuoYi-AI/Java基线 | 保留第一顺位POC，不升级为已采用 | 更换Agent或知识库不要求重写人员/流程/身份。若固定合格子集的流程办理、初始化、授权与维护补丁代价不能达标，才按36/46比较其他底座；不能以单段Python demo替代OA闭环。 |
| LangChain4j | 保留已存在的解析/检索/消息适配 | 可仅作为库，不一定负责未来所有Agent循环。若替换运行内核产生第二套消息/身份/记忆主数据，则先消除重复，而不是并行保留。 |
| Qdrant | 修订为“有收益后启用的优先向量服务” | MySQL路线已有适配，补授权与版本比另造索引平台直接；但已知文件/编号的任务可先直接定位。如果A同样本满足业务质量、延迟和容量标准，则不为完整技术清单强制部署。若B提升必要语义召回且维护成本可接受，再启用。 |
| pgvector | 仅在PG成为业务底座时比较 | pgvector是PG扩展，能复用已采用PG。不能为少一个向量服务而强迁MySQL、重做初始化/驱动/运维。若PG底座原生支持完整业务、许可与迁移总成本更低，可重开底座比较。 |
| PDFBox/POI/Tika与Docling | 保留分级解析；细化成本边界 | 普通件沿现有Java路径，扫描/表格难件送已规划解析Worker。Docling按文件处理模板启用OCR/布局/表格；不默认VLM全量解析。若本机样本证明同一Docling管线可减少维护且性能不劣，再合并解析器。 |
| Mem0/Graphiti/OpenViking/Semantica | 延后独立服务/完整平台 | MemoryVersion、ExperienceProposal与关系表已覆盖首期治理职责。只有明确的长期检索、多跳/时态推理或整理质量缺口，且合格候选赢得留出样本对照时引入；许可证、恢复和撤权先过硬门槛。 |
| 文档Wiki/知识卡 | 保留为派生导航/确认后的知识条目 | 一条来源可被多页引用，但索引、摘要、wiki不能各自写成平行主事实。Wiki编译失败保留原件与旧发布版本；冲突、撤权及过期版本能定位到受影响条目。 |
| 图数据库/湖仓/第二队列 | 延后 | 鱼骨图、关系展示和“本体”名称都不要求图库。先用现有业务ID、关联表、指标服务和既有调度。明确的查询/分析负载用真实执行计划证明现有方案不足后再比较新增组件。 |

核心许可按55/54保持：Qdrant Apache-2.0、Docling MIT代码、pgvector PostgreSQL License、Semantica MIT源码；这些是固定来源级结论，不是整包闭源商业发行放行。OpenViking当前AGPLv3不按旧Apache印象处理。模型权重、OCR、驱动、数据库镜像、插件与部署形态分别审查。[许可来源][q-license]、[Docling][d-license]、[pgvector][pg-license]、[Semantica][sem-license]。

## 4. 检索优化应围绕任务，而非围绕库

首先区分查询意图，默认使用最便宜且能正确回答的路径；不为每次请求新增独立LLM路由器。

| 意图 | 最小路径 | 升级触发 |
|---|---|---|
| 已知文件/版本/条款/设备型号 | 可信任务范围→对象/标识索引→精确章节读取 | 未找到才在当前获准范围扩大词法查找，不能跳全组织搜索 |
| “当前由谁负责”“该审批是否通过” | 既有业务API/正式状态 | 不由历史聊天、Wiki摘要或向量相似度决定 |
| 稳定知识问答、跨文档相似经验 | 授权全文/词法召回与向量候选融合 | 基础召回已足但排序差才启用有限重排；不要所有问题必走重排 |
| 长材料中的跨章节论证 | 文件范围锁定→目录/摘要→受限章节追加读取 | 加载轮数、字节/页数和模型请求达预算即返回部分证据/需补充，不无限漫游 |
| 业务分析 | 已发布指标/维度/时间窗→只读查询→可见证据 | 不是向量数据库承担聚合计算，也不是给模型任意SQL权限 |

Anthropic当前上下文工程页支持轻量引用、按需探索以及混合预取，也明确运行时探索会增加延迟。因此“取消索引，全部让Agent沿文件夹找”不是无条件性能优化。其2024年Contextual Retrieval展示词法与向量互补，适合解释为何精确编码不能只有embedding；文章给出的缓存、召回和成本数字不直接作为本项目指标。[上下文工程][context]、[词法与语义][contextual]

### 4.1 中文与精确标识不能混为一种检索

Qdrant的`keyword`适合ID/标签精确匹配；`text`会分词，默认大小写与标点处理不同。全文过滤是候选限制，不等于已经运行一条BM25相关性排序。当前Hybrid Query文档提供多路融合，具体API仍须与55号服务器/Java客户端版本配对验证。[词法字段][q-text]、[混合查询][q-hybrid]

MySQL8.4官方提供CJK ngram解析，但ngram粒度、停用词、自然语言/布尔模式会改变匹配行为。这证明可作为低增量对照，不证明底座已有SQL注释就完成中文搜索。编号`KM-P13`、`ERR-1024`、`V1.3`、中英混排、全半角、同名产品应保留原值和受控别名；不能用对文本的宽松归一化改变对象主键或授权匹配。[MySQL8.4 ngram][mysql-ngram]

最少分组测试：中文同义问法、精确编号、否定与例外、旧新版本、同名不同实体、跨页表格、无答案、低权限可见集合。分别报告每组召回与最终有依据答案率；平均分不能掩盖编号/权限失败。

### 4.2 ACL的逻辑位置与索引物理执行分开

所有分支先从服务端得到可信主体、任务、用途、当前发布版本和授权范围；检索API不能接受客户端任意allowedIds作为权限。约束须进入每路召回请求或其可证明等价的受限分区；未授权正文不得进入重排、模型、客户端日志。返回源引用后，AuthorizedContentResolver按当前policyRevision再次验证，处理查询期间撤权。授权集合无法可靠表达时用有界已获准集合或拒绝继续扩大，不允许无filter全库召回后“让模型删掉秘密”。

但56号“数据库查询和索引查询都预过滤”应解释为**逻辑授权约束必须先确定并贯穿查询**，不能宣称所有引擎物理上先过滤再ANN。pgvector官方说明近似索引常在索引扫描后应用filter，可能返回不足K；迭代扫描、选择性索引或租户分区可改善，但扫描有预算上限。测1%/10%等不同获准比例时，同时报告Recall@K、候选不足、执行计划和P95。不能为补召回去掉WHERE。[pgvector固定README][pg-readme]

若将来采用PG RLS，它是额外数据库防线；表owner、superuser或BYPASSRLS身份会影响强制效果。不能仅写“有RLS”就省掉受控数据库角色、可信租户上下文及服务端结果发布授权。[PostgreSQL官方RLS][pg-rls]

Palantir当前动作权限文档也区分读时限制、写授权和下游通知接收者；动作编辑成功与通知发送成功可能不同。这支持本项目已有“后台使用不等于人员可读”“执行成功不等于交付/发布”的分工，不要求购买或复制其平台。[动作权限][palantir-actions]

## 5. 文档式管理的边界与可落地简化

普通员工继续在已有文件/知识/任务页面使用“本次资料、草稿、正式交付”；不新建Wiki后台、三层记忆看板、公司大脑设置页。本体对用户体现为对象、关系、依据和当前可做动作，不要求配置OWL/SPARQL/图存储。

轻量“地图”按当前受众生成：可见资料名称、版本、用途、位置、有效期和获准动作引用。不把完整企业目录写入所有人的`index.md`；目录摘要、反向链接、计数同样可以泄露隐藏对象。地图是投影，不是新的授权/流程事实源。重命名与移动沿稳定sourceId，历史任务绑定版本；目录层级仅帮助导航。

Wiki/记忆派生摘要必须指向原件的具体版本和定位。规则/决策含适用范围、有效期、负责人、取代关系；模型补充解释只能是候选，不和原文混在一个“可信正文”字段。修改源后按依赖引用增量重建；生成索引和正文发布在同一release快照上切换，并处理晚到任务。不能依赖脚本执行顺序声称“永远一致”。

热/温/冷适合作为系统保留期和推荐策略，不应固化为三套存储服务。当前任务状态继续由Attempt/OA负责；经验由MemoryVersion负责；长期规范由既有版本化知识负责。一次人工纠正先区分事实错误、模板偏好、工具失败、权限边界，再送已有对应维护入口；一次成功或一条点赞不能自动变成组织政策。

## 6. 解析、延迟和维护成本的对照

Docling现行文档允许本地处理、按功能控制管线，远程文档处理需显式开关；该开关不等于阻断模型权重下载，离线部署仍需预取受审资源与网络控制。当前页还描述native PDF管线，但本分支未把这个滚动页面新特性假定为55号固定2.126.0已验证能力。优先复用现有普通件解析，难件使用明确版本/模板/超时的插件，不为合并类名而新增Python常驻服务。[Docling高级选项][docling]、[管线参考][docling-options]

性能必须拆开衡量：

- 离线摄取：解析/OCR/embedding耗时、重建队列等待、每页成本、可引用产物比例、峰值RAM；不能把异步处理排到后台就宣称零成本。
- 在线检索：授权计算、精确查找、稀疏/向量召回、重排、源版本重验、上下文装配各阶段P50/P95。
- 业务结果：首个有依据内容时间、最终交付正确率、人工修订时间、模型真实请求数与token，不只看向量查询毫秒数。
- 运维增量：新增部署角色/进程、常驻内存、模型权重、备份与恢复对象、补丁数量、故障处置路径；同一台机器上的三个进程仍是三个待维护运行组件。

建议复用56号冻结样本与KM-P用例，在其下增加对照标签而非另一套需求库：A已有目录/全文；B=A+Qdrant；C=B+仅难件Docling；D=选定范围的Wiki/树导航。另对记忆比较无长期记忆、人工确认的小文档记忆、自动候选整理。一次只改变一个主因素，同模型、同资料/权限、同机器、同预算；搜索故障降级不得回“无知识”成功态。

增量组件的准入顺序：关键权限/版本/撤权/恢复全部通过→必要业务质量通过→留出样本显示收益或维护成本下降→延迟和成本在项目冻结预算内→许可与恢复路径通过。当前没有证据给出统一提升百分比或断言某库最快。若无明显收益，保留较简单方案；若简单方案达不到必要能力，则修复或切换，不缩减173项需求。

## 7. 真实取证与限制

本分支先读取当前项目37/41/46/55/56/58及入口材料，再阅读8篇选定文章。当前`make entry`回读确认项目`oa-digital-employee-collaboration`、Git `NOT_INITIALIZED`、产品`NOT_CONFIGURED`，currentTask为本次文章架构复核。只写本报告和`primary-sources/`。

[一手来源manifest](primary-sources/manifest.json)记录URL、时间、退出码和原始SHA。网页首次搜索/打开取得Qdrant/pgvector/Docling结果；后续web工具两次连接失败，改用指定公开HTTPS URL的curl抓取，没有关闭TLS验证、执行远程脚本或使用凭据。HTTP200仅代表拿到响应；WikiCreator是站点壳，单列为内容不可核实。X原文成功取得可提取全文；动态本体原作者文章仅为其自述，未得到公开仓库/运行记录。

Semantica固定HEAD与PyPI版本同时保存，不能混称“最新稳定0.7.0”；OpenViking抓取是当时main快照，有SHA但不是发行采用依据。55号固定RuoYi-AI/SDK源码差距用于本次设计检查，未重复安装或把历史单测源码当本轮通过。RAGFlow读固定v0.27.2，文章里的2024安装命令未运行。代码许可检查只用于筛选，不代表镜像、模型和客户发行包已放行。

本报告已完成证据与建议；检索/解析/恢复/权限/基准案例仍为`NOT_RUN`。主任务59/60生成后的独立只读复核另补在下方，不将主任务最终验证结果提前写为通过。

## 一手来源

[hq-original]: https://x.com/vibemarketer_/status/2092243372929151135
[wiki-hub]: https://www.skillhub.cn/skills/wiki-creator
[ov-readme]: https://github.com/volcengine/OpenViking/blob/main/README.md
[ov-license]: https://github.com/volcengine/OpenViking/blob/main/LICENSE
[palantir]: https://www.palantir.com/docs/foundry/ontology/overview/
[palantir-actions]: https://www.palantir.com/docs/foundry/action-types/permissions/
[owl]: https://www.w3.org/TR/owl2-overview/
[prov]: https://www.w3.org/TR/prov-o/
[sem-code]: https://github.com/semantica-agi/semantica/blob/05aec1975defbac087b29334ab0e35302a49a884/semantica/context/context_graph.py#L4321
[sem-project]: https://github.com/semantica-agi/semantica/blob/05aec1975defbac087b29334ab0e35302a49a884/pyproject.toml
[sem-license]: https://github.com/semantica-agi/semantica/blob/05aec1975defbac087b29334ab0e35302a49a884/LICENSE
[sem-pypi]: https://pypi.org/pypi/semantica/json
[rag-readme]: https://github.com/infiniflow/ragflow/blob/v0.27.2/README.md
[rag-compose]: https://github.com/infiniflow/ragflow/blob/v0.27.2/docker/docker-compose-base.yml
[q-license]: https://github.com/qdrant/qdrant/blob/v1.19.1/LICENSE
[d-license]: https://github.com/docling-project/docling/blob/v2.126.0/LICENSE
[pg-license]: https://github.com/pgvector/pgvector/blob/efa08fda9ec485d80292d0487a77939c087dedcc/LICENSE
[pg-readme]: https://github.com/pgvector/pgvector/blob/efa08fda9ec485d80292d0487a77939c087dedcc/README.md
[pg-rls]: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
[q-text]: https://qdrant.tech/documentation/search/text-search/text-filtering/
[q-hybrid]: https://qdrant.tech/documentation/search/hybrid-queries/
[mysql-ngram]: https://dev.mysql.com/doc/refman/8.4/en/fulltext-search-ngram.html
[context]: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
[contextual]: https://www.anthropic.com/engineering/contextual-retrieval
[docling]: https://docling-project.github.io/docling/usage/advanced_options/
[docling-options]: https://docling-project.github.io/docling/reference/pipeline_options/

## 8. 对59/60号的独立只读复核

复核时间：2026-09-12T00:21:12.159771+00:00。范围为知识/检索/版本/授权/本体与最小化，以及上述8篇文章的证据映射；未对其他24篇文章或IMA正文取证重复作完整审查。读取59号1—114行、60号1—185行，正文过长的工具输出已用定向读取补齐。

- 审查输入：`docs/设计包/59-智能体文章证据复核与全栈优化.md`，SHA-256 `d99b4816e506fd0ceec0ad3955a6b30d5e29a1a4c05a76f98e0b53246c9ee67e`。
- 审查输入：`docs/设计包/60-最小技术方案与验证决策.md`，SHA-256 `7a79691de78dc12a970b658fcbea1247f0cb4ad4d23d485e84397c81618432c1`。

**结论：架构方向无新增阻断；未发现缩减173项业务需求或把研究/文档检查升级为产品实测最佳的声称。以下3处需在最终文案中澄清，避免实施者误解；不要求改底座或增加组件。**

| 级别 | 具体位置（本次输入行号） | 问题与修改建议 |
|---|---|---|
| P2 | 60号:91 | “索引发布失败保留已发布旧版”缺少仍有效且当前获准的条件。应明确旧版已被撤销/判失效时立即停用，不能因新版解析失败继续用于当前规则问答；历史追溯则按当前读取资格。56号已有这一边界，60号概括不应削弱。 |
| P2 | 60号:109 | 同段将本人偏好与共享经验都送候选、负责人确认、留出样本复测，会让普通设置被迫进入重治理。应区分：本人明确设置且在本人作用域内可直接版本化保存/撤销；AI推断、共享经验及改变行为的能力候选再按影响作评审与适用评测。保留作用域、版本并发与当前授权。 |
| P3 | 59号:68 | “复制/移动文件不改变对象权限”过于绝对。重命名/移动不自动扩大授权；复制/共享会产生新对象或接收范围，仍须走对应命令、校验目标范围。按60号:93已有表达统一，避免被理解成复制从不需要重新授权。 |

已核对的正向结论：59号:66—76如实处理WikiCreator站点壳、公司大脑审查、OpenViking仍用向量、Semantica理由输入和RAGFlow旧文；60号:17/22保留R0/R1可推翻的质量门槛；60号:89—105保持目录投影、稳定源版本、逐路可信scope和ANN不足不放宽权限；60号:111不以本体名称强制图库；60号:150—177保留原AC、KM-P、AR-P并将所有实验标为NOT_RUN。59号:11—15如实区分全文/部分和IMA零正文，本文8篇覆盖不扩大为全库阅读。

这是文档独立审核，未执行产品权限/检索/恢复/性能测试；该审查输入哈希若变化，结论须结合具体修改回读，不能只复用本段状态。
