# Agent专题复核与证据边界

日期：2026-09-11。范围：57/58及既有文档入口同步。研究使用当前项目材料与公开官方资料；没有把相邻旧仓的DSH采用决定视为本项目授权。

## 实际发现与处理

| 发现 | 原始证据与处理 |
|---|---|
| pi身份及发布变更 | 后台研究核GitHub重定向、发行和npm：原badlogic/pi-mono迁至earendil-works/pi；旧npm前缀@mariozechner。57已修正初稿错误的@badlogic表述 |
| DSH发布渠道与依赖范围 | npm latest为rc.1，Git标签为rc.2；THIRD_PARTY_NOTICES有其他后端独立条款。57与54明确区分，不称整包MIT已放行 |
| StaffDeck最新许可 | 公开v0.5.6根LICENSE与README均AGPLv3；仅研究机制，未复制进产品实现。54/57及入口已同步 |
| StaffDeck运行器及多副本假设 | AgentLoop调用Python HarnessV2Engine；startup恢复把全部active视作旧进程。57/58明确不可按DSH名称或单进程恢复假设直接扩容 |
| Codex共享环境与远程协议 | 稳定0.154.0 daemon文档明确无per-client环境隔离；现行App Server页面含实验性和远程认证边界。57/58禁止共享开发者daemon作为企业身份隔离 |
| DSH文件锁与业务租约 | 独立复核指出OS锁不会因业务fence更新释放。58补旧进程退出/锁释放前不得续写，不删除锁文件强抢 |
| 原生审批等待无法跨进程直接恢复 | 独立复核指出DSH运行内Promise与持久化日志不是同一物。58补业务待办独立持久化，重验后新执行关联原动作 |
| 不同Turn口径导致预算不可比 | 独立复核指出DSH与pi定义不同。58改为实际model_request_count，并纳入重试、压缩、子任务及汇总 |

主执行者读取了后台研究全文，并直接核对Codex与StaffDeck固定源码、QoderWake当前文档及原项目合同；后台研究者再次只读57/58后反馈上述4项具体修正。没有把复核者冒充业务负责人或商业授权人。

## 工具与失败路径

语义检索返回Transport closed，未创建/更新索引；使用rg精确锚点继续。GitHub API 403、DSH release 404及部分raw TLS失败均在清单保留；改用Git远程refs、npm、官方页面与固定codeload源码包，未关闭TLS校验、未读用户凭据。web工具后续连接失败后使用官方网页直接抓取。已下载源码仅供读取，没有执行其安装/启动/测试命令。

capture_public_sources.py捕获明确列出的公开URL；Git refs、提取文件与后台研究各有清单。check_agent_runtime_research.py直接重算快照摘要、固定引用、原30/31字节与设计结构。validate_technical_design.py和make verify继续使用本项目原有验证机制。实际通过/失败以对应JSON和命令输出为准。

## 未验证范围

全部30项AR-P与原产品AC仍NOT_RUN。未安装或运行DSH/pi/Codex/StaffDeck候选、未调用真实模型、未压测或做真实权限攻击、未完成依赖构建与商业交付包准入。新流程图仅核Mermaid文本结构，未宣称已浏览器渲染。研究源归档不能自动进入产品打包路径；未修改全局技能、长期记忆、产品原型或contracts。
