# 可商用开源组件声明（NOTICE）

本仓库 M0 骨架优先采用 **宽松协议、可闭源商用** 的成熟开源组件，避免 AGPL / SSPL 等强传染性协议进入主路径。

| 组件 | 用途 | 典型协议 | 商用闭源产品可用性 |
|---|---|---|---|
| NestJS | API 框架 | MIT | 可 |
| Express（Nest 默认平台） | HTTP 适配 | MIT | 可 |
| Vue 3 | 前端框架 | MIT | 可 |
| Vite | 前端构建 | MIT | 可 |
| TypeScript | 语言 | Apache-2.0 | 可 |
| pnpm | 包管理 | MIT | 可 |
| Jest / Vitest 生态 | 测试 | MIT | 可 |
| OpenAI Node SDK | OpenAI 协议客户端 | Apache-2.0 | 可 |

## 选型原则

1. 默认只引入 **MIT / Apache-2.0 / BSD** 组件  
2. 新增依赖前检查 `license` 字段与 NOTICE  
3. 领域能力 **待本机材料对齐后迁入**，禁止为赶工引入不可商用底座  
4. 禁止用 mock 服务冒充开源能力  

完整 SPDX 扫描可在 CI 中后续接入（如 `license-checker`，MIT）。
