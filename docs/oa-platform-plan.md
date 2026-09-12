# OA 数字员工协作平台落地计划（ZKER-staff-1.0）

> **当前优先级**：先产品需求对齐，再编码。  
> **事实源**：本机 `/Users/mac/Documents/OA数字员工协作平台`。  
> **编码状态**：`CODING_PAUSED`（见 [product-requirements-alignment.md](./product-requirements-alignment.md)）。  
> **标注**：「待本机材料对齐后迁入」≠ 已定稿。

## 1. 仓库确认

| 项 | 值 |
|---|---|
| Remote | `https://github.com/wilson323/ZKER-staff-1.0.git` |
| 默认主分支 | `main` |
| 工作分支 | `cursor/oa-digital-employee-platform-530e` |
| 工作目录 | `/workspace` |
| 禁止 | 写入 `ZKER-staff` 或其他仓库 |

## 2. 阶段顺序（强制）

1. **需求对齐**（进行中）— 产品边界 / 角色场景 / M0 验收 / 底座授权  
2. **本机材料迁入** — 设计主链摘要 + contracts **待本机材料对齐后迁入**  
3. **工程门禁** — 在对齐后的 M0 范围上 build/test  
4. **按本机 47 号最小步骤** 扩能力 — 禁止抢跑领域实现  

## 3. 已有工程占位（非需求完成）

空仓上曾用官方脚手架生成 NestJS + Vite Vue3 占位，**仅证明可商用开源工具链可构建**；  
在需求未对齐前：

- 不扩展领域模块
- 不宣称产品能力已交付
- 可整体替换以服从本机底座终选

许可证策略见根目录 `NOTICE.md`（MIT/Apache 优先，禁 AGPL/SSPL 主路径）。

## 4. 阻塞

1. 本机对齐未完成 → 产品定义与 contracts 未迁入  
2. 底座曾 `PENDING_SELECTION` → 需 Owner 签署或「仅 M0 实验」授权  
3. 云端缺完整设计包 → 以本机为准，云端不臆造  

## 5. 下一步

- [ ] 本机对齐任务回传「产品一句话 + 主场景 + contracts 摘要」  
- [ ] Owner 确认 §5 M0 需求边界（见需求对齐文档）  
- [ ] 迁入设计/contracts 后再恢复编码  
