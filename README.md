# ZKER-staff-1.0

Enterprise Digital Employee Platform / OA 数字员工协作平台

## 事实源

设计主链与契约以本机为准：`/Users/mac/Documents/OA数字员工协作平台`。  
本仓库为工程落地仓；设计文档/contracts **待本机材料对齐后迁入**。

## M0 骨架（可商用开源）

- **API**: NestJS（MIT）— `apps/api`
- **Web**: Vite + Vue 3（MIT）— `apps/web`
- **AI**: 官方 OpenAI SDK（Apache-2.0），经适配器调用；无密钥真实失败
- 详见 [NOTICE.md](./NOTICE.md)、[docs/oa-platform-plan.md](./docs/oa-platform-plan.md)、[AGENTS.md](./AGENTS.md)

## 快速开始

```bash
make install
make build
make test
# 开发
make dev-api   # http://127.0.0.1:3080/api/v1/health
make dev-web
```

## 仓库约束

- Remote 必须是 `https://github.com/wilson323/ZKER-staff-1.0.git`
- 禁止写入其他仓库
