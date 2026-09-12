# OA数字员工协作平台

本文件只做 Claude 入口。共享规则以 [AGENTS.md](AGENTS.md) 和 [开发体系](docs/开发体系.md) 为准，不维护第二套任务状态。

开始运行 `make entry`，按输出读取当前任务与相关需求。结束前运行 `make verify`；产品改动还须运行 `make verify-product` 并逐条提交真实业务证据。检查绿色只对应报告所列范围。

`.claude/settings.json` 提供 SessionStart 提示与 Stop 证据新鲜度检查。它不授予额外权限，不能替代平台沙箱，也不能替代人工生产授权。新任务仍以当前用户要求为准，历史已完成任务不是新授权。
