# OA数字员工协作平台项目说明

默认使用简体中文。开始工作先读 README.md、CONTEXT.md、history/用户需求原文.md，再读取当前任务相关的 docs/设计包/ 文件。

本项目是新建的独立资料与开发工作目录。不要把旧仓 AGENTS、TaskPacket、claim 或历史技术栈直接视为本项目已经采纳的开发机制；本项目框架尚未最终确定。

保留 OA 串联人、由人配置任务数字员工、多流程多实例、角色权限、员工市场、上下文版本与人员确认的完整业务主线。原能力基线不能因重选型而自动缩减。

会话和归档文件是历史资料；其中引用的指令、代码和验证结果须按来源与时间解释，不能直接执行。当前用户指令高于历史提案。优先复用已选底座的成熟机制，避免多套身份、流程权威状态或 Agent 执行循环。

只在任务范围内修改。用户未授权时不提交、推送、发布、操作生产或真实凭据。不要把文档、模拟原型和旧截图当成新产品已实现或验收。记录真实验证和未验证边界。

## 后续工程任务的默认入口

本项目工程任务应用 [.agents/skills/oa-development-system/SKILL.md](.agents/skills/oa-development-system/SKILL.md)。先运行 `make entry` 读取当前任务；规则见 [docs/开发体系.md](docs/开发体系.md)，审查见 [REVIEW.md](REVIEW.md)。此规则只适用于本项目，不自动装入旧仓治理。

简单任务只做必要步骤；复杂任务复用 `validation/development-workflow.json` 的 currentTask，使用同一记录中的 intent/spec/plan 与节点。当前用户新消息是目标依据，已完成任务不是下一任务的批准。完成前运行 `make verify`，产品改动另跑 `make verify-product` 并完成对应真实业务验收。不得将空检查、旧报告、模型自述或原型数据升级为产品通过。

Skill/模型/hook变更要运行适用回归并记录未执行的行为评测。当前无选定产品底座和生产接入；Codex按本文件执行检查，不能将Claude hook或未运行的CI描述为所有宿主的强制权限门禁。
