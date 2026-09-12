# AGENTS.md — ZKER-staff-1.0 协作约束

## 事实源（强制）

- 设计与契约事实源：本机 `/Users/mac/Documents/OA数字员工协作平台`
- 本仓库仅承载工程落地与 Git 协作
- 禁止写入 `wilson323/ZKER-staff` 或其他仓库

## 对齐规则

1. 云端上传材料 = 临时输入，不得覆盖本机设计主链结论
2. 缺失设计包时只搭可构建骨架，不发明领域契约
3. 设计文档 / contracts：**待本机材料对齐后迁入**
4. 禁止 mock 业务数据与假 AI 服务；AI 必须走 OpenAI 协议适配器

## M0 技术栈（临时）

- pnpm workspace + NestJS API + Vite Vue3 Web
- 可用 `make install|build|test|ci` 作为门禁

## 变更纪律

- 小步提交；领域模型变更须对照本机 00–60 / contracts
- Owner 未签署底座终选前，不得宣称平台已按终态完成
