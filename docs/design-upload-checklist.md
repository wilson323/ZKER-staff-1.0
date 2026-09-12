# OA 数字员工协作平台 · 设计内容完整性检查表

盘点日期：2026-09-11  
根目录：`/Users/mac/Documents/OA数字员工协作平台`  
配套清单：[`design-material-inventory.md`](design-material-inventory.md)

目的：在**大规模编码 / 完整建平台之前**，确认设计材料是否已齐、缺什么、应如何一次完整上传。  
结论先看：**产品设计主链基本齐全；“可冻结底座并开工写产品”的材料仍有缺口；当前尚不能宣称平台已创建。**

---

## 1. 总判定

| 维度 | 状态 | 说明 |
|---|---|---|
| 用户需求原文与补充 | ✅ 已有 | `history/` 三份需求 + 会话归档 |
| 产品设计 1.3（26–35） | ✅ 已有 | 主文档/合同逻辑/验收/追踪/原型/工作台/AI 体验 |
| 历史基线包（00–25） | ✅ 已有 | 需求、ER、流程、市场、OA 多实例、选型研究 |
| 技术设计（36–44） | ✅ 已有 | 架构提案 + 交互图证据；**底座未最终选定** |
| 开发合同包（46–54）+ `contracts/` | ✅ 已有 | OpenAPI/Schema/夹具/候选 DDL；**设计态，非运行态** |
| 知识/Agent/最小决策（55–60） | ✅ 已有 | 研究与决策提案；未安装/未实测 |
| 开发体系入口 | ✅ 已有 | Skill、`docs/开发体系.md`、Makefile、`make verify` |
| 设计包可分发 ZIP（`docs/设计包.zip`） | ❌ 缺失 | 仅有已解压目录 + `archive/` 原始快照 |
| 视觉源文件（Figma/Sketch/drawio） | ❌ 缺失 | 仅有 HTML 原型与 PNG 截图 |
| 品牌资源包 | ❌ 缺失 | 无独立 logo/字体授权包 |
| 底座 Owner 终选与签署 | ❌ 缺失 | `PENDING_SELECTION` / `NOT_CONFIGURED` |
| 产品源码与可运行服务 | ❌ 缺失 | 无 `apps/`/`services/`/`packages/`，无 Git |
| 72 项真实产品验收 | ❌ 未执行 | 全部 `NOT_RUN` |
| 商用放行包 | ❌ 未放行 | `RELEASE_NOT_CLEARED` |

**对「完整创建一个平台」的含义：**

- **设计侧**：材料已足够做评审、M0 实验准备、切片规格阅读。  
- **工程侧**：仍缺「终选底座 + 真实环境启动证据 + 可运行产品树」。  
- **上传侧**：缺一份面向外部/新环境的**一次完整打包**（见 §5）。

---

## 2. 分项检查表（已有 / 不完整 / 缺失）

### 2.1 接续与治理

| 项 | 状态 | 证据路径 | 备注 |
|---|---|---|---|
| 项目接续提示词 | ✅ | `项目接续提示词.md` | |
| AGENTS / CLAUDE / CONTEXT / README / REVIEW | ✅ | 根目录 | |
| Makefile 入口 | ✅ | `Makefile` | |
| OA Skill | ✅ | `.agents/skills/oa-development-system/` | |
| CI 工作流文件 | ⚠️ 不完整 | `.github/workflows/verify.yml` | 文件有，未启用远程 CI、无 Git |
| Git 仓库 | ❌ | — | 完整工程交付通常需要 |

### 2.2 需求与产品设计

| 项 | 状态 | 证据路径 | 备注 |
|---|---|---|---|
| 早期用户需求 | ✅ | `history/用户需求原文.md` | |
| U19–U24 补充 | ✅ | `history/本轮产品设计需求补充-2026-09-11.md` | |
| 开发体系优化需求 | ✅ | `history/开发体系优化需求-2026-09-11.md` | |
| 153 原需求 + 追踪 | ✅ | `06`/`10`/`29`/`30` | |
| AI-01–12 | ✅ | `30`/`33`/`35` | |
| EW-01–08 工作台权限 | ✅ | `34`/`30` | |
| 完整产品主文档 | ✅ | `26` | |
| 逻辑模型与接口 | ✅ | `27` | 逻辑级，非底座映射终版 |
| 验收用例设计 | ⚠️ 不完整 | `28` | 有设计，72 AC 未跑 |
| 交互原型 | ⚠️ 不完整 | `08`/`31` | 虚构内存原型，非真实 B/S |
| 业务流程图源 | ⚠️ 不完整 | `32` + md 内 mermaid | 无独立 drawio/visio 源文件 |
| 全角色/市场/OA 增量 | ✅ | `12`–`21`、`15`–`17` | |

### 2.3 技术与合同

| 项 | 状态 | 证据路径 | 备注 |
|---|---|---|---|
| 技术架构总设计 | ⚠️ 不完整 | `37` | 提案，未冻结 |
| 最小技术决策 | ⚠️ 不完整 | `60` | 推荐验证顺序，非 Owner 终选 |
| OpenAPI / 命令目录 | ⚠️ 不完整 | `contracts/openapi.json` 等 | 设计合同，无实现端点 |
| 物理模型与候选 DDL | ⚠️ 不完整 | `49`、`migrations/mysql-candidate/` | 禁止当生产迁移 |
| 权限/不变量夹具 | ⚠️ 不完整 | `50`、`contracts/fixtures/` | 合成样本，未跑产品 |
| 商用组件登记 | ⚠️ 不完整 | `54`、`commercial-component-register.json` | 未出最终 SBOM |
| `contracts.zip` | ❌ | — | 目录已有，无独立压缩包 |

### 2.4 证据与验证资产

| 项 | 状态 | 证据路径 | 备注 |
|---|---|---|---|
| 设计包内原型截图/回归 | ✅ | `docs/设计包/validation/` | 本地演示证据 |
| 工程 validation 大目录 | ✅ | `validation/` | 含研究缓存，体积大 |
| 迁移完整性记录 | ✅ | `validation/项目创建与迁移记录.json` | 397→工作副本扩展 |
| 产品 `verify-product` | ❌ | workflow `product.commands=[]` | 底座未配置 |
| Agent 行为评测 20 项 | ❌ | `development-agent-evals.json` | `NOT_RUN` |

### 2.5 视觉 / 品牌 / 分发包

| 项 | 状态 | 备注 |
|---|---|---|
| `docs/设计包.zip` | ❌ 缺失 | 提示词写过该路径；实际只有解压目录 |
| `archive/设计包原始快照-2026-09-11.zip` | ✅ | 原始 397 文件；**不含**后续 35–60 等增量 |
| Figma / Sketch | ❌ | 无 |
| drawio / 流程图源 | ❌ | 无 |
| Logo / 品牌字体授权 | ❌ | 无独立资源包 |
| `.env.example`（无秘密） | ❌ | 无 |

---

## 3. 必须补传清单（按优先级）

### P0 — 不做则无法「一次完整上传」或无法合法开工

| 优先级 | 建议文件名 | 应包含什么 | 为何需要 |
|---|---|---|---|
| P0-1 | `docs/设计包-完整上传-YYYYMMDD.zip` | 当前 `docs/设计包/` **全量**（00–60 + 包内 validation）重新打包；附 `MANIFEST.txt`（文件数、sha256、生成时间） | 现有 `archive` 快照过旧；`docs/设计包.zip` 不存在，新环境无法一键落盘 |
| P0-2 | `docs/contracts-完整上传-YYYYMMDD.zip` | 整个 `contracts/` + `contracts/README.md` | 机器合同与人读设计分离上传时不易丢；目前无独立包 |
| P0-3 | `docs/owner-stack-decision.md`（Owner 签署） | 终选底座名称/版本、许可结论、淘汰项、回退条件、签字人与日期；或明确「仍授权仅做 M0 实验、不写产品树」 | 无此文件则**禁止**宣称已创建平台或选定 RuoYi-AI/芋道 |
| P0-4 | `docs/design-source-pack/` 或同名 ZIP | 若存在：Figma 导出（或链接+只读权限说明）、关键页 PDF/PNG 源、图标 SVG、品牌色板/字体授权 | HTML 原型无法替代可编辑设计源；无源则上传包只能标「原型即设计」 |

### P1 — 影响 M0/M1 真实落地与验收

| 优先级 | 建议文件名 | 应包含什么 | 为何需要 |
|---|---|---|---|
| P1-1 | `docs/m0-lab-runbook-filled.md` | 基于 51 号填空：实际目录、构建命令、端口、种子账号范围（无密码）、一次成功/失败原始日志路径 | 51 号仍是设计态；缺实测无法开 M1 |
| P1-2 | `docs/commercial-sbom-draft/` | 候选组件 SPDX/许可全文索引、已知 AGPL/专有例外、替换方案 | 54 号 `RELEASE_NOT_CLEARED`；闭源商用交付硬门槛 |
| P1-3 | `docs/flow-diagrams-source.zip` | 关键业务流程图可编辑源（drawio/vsdx）或「仅用 mermaid、无外部源」的书面声明 | 避免评审以为有独立图源实际没有 |
| P1-4 | `history/` 增量（若还有未归档用户指令） | 截至今的全部用户原文与附件 | 防止会话外口头要求丢失 |

### P2 — 增强完整性，非阻塞设计评审

| 优先级 | 建议文件名 | 应包含什么 | 为何需要 |
|---|---|---|---|
| P2-1 | README 设计索引补丁 | 将 35–60 纳入与 00–34 同级索引表 | 内容已有，导航不全易漏传 |
| P2-2 | `docs/ima-unread-articles-note.md` | 59 号标明不可读全文的清单与替代来源 | 避免把「未读文章」当已核证据 |
| P2-3 | 精简 `validation-evidence-core.zip` | 仅保留与 26–35/46–54 直接相关的检查 JSON + 关键截图，排除巨大研究缓存 | 全量 `validation/` ~244MB，不适合当「设计上传」主包 |

---

## 4. 明确「不需要补传 / 不应当作设计缺口」的项

| 项 | 说明 |
|---|---|
| 旧仓 ZKER-staff 产品源码 | 本项目禁止把旧仓实现当已迁入；设计包内引用仅为来源线索 |
| StaffDeck AGPL 源码包 | 研究可引用公开版本信息；**不要**解压/复制进产品树 |
| 真实模型 API Key / 生产库连接串 | 禁止入仓；只需无秘密的 `.env.example` |
| 72 AC 已通过报告 | 当前真实状态是未执行；伪造 PASS 属于违规 |
| IOE-DREAM / 一卡通材料 | **不属于**本项目范围，勿混入上传包 |

---

## 5. 「一次完整上传」推荐打包结构

```text
OA-digital-employee-design-upload-YYYYMMDD/
├── 00-README-UPLOAD.md                 # 上传说明：版本、哈希、边界（DESIGN_ONLY）
├── 01-project-entry/                   # 根接续薄文件
│   ├── AGENTS.md
│   ├── CLAUDE.md
│   ├── CONTEXT.md
│   ├── README.md
│   ├── REVIEW.md
│   ├── Makefile
│   └── 项目接续提示词.md
├── 02-requirements-history/            # history/ 全量
├── 03-design-pack/                     # docs/设计包/ 全量（00–60 + 包内 validation）
├── 04-contracts/                       # contracts/ 全量
├── 05-dev-system/                      # docs/开发体系.md + Anthropic研究 + .agents/skills
├── 06-evidence-core/                   # 精选 validation 检查 JSON + 关键截图（可选精简）
├── 07-archive-original/                # archive/设计包原始快照-*.zip（可选，用于溯源）
├── 08-owner-decisions/                 # ★ 待补：底座终选、商用边界签署
├── 09-design-sources/                  # ★ 待补：Figma/图源/品牌；无则放「无源声明.md」
└── MANIFEST.json                       # 文件列表、size、sha256、生成时间、排除规则
```

### 建议排除（不要塞进「设计上传」主包）

- `validation/agent-runtime/*-source/` 等大体量源码缓存  
- `validation/article-review/ima-install/*.zip`（工具安装包）  
- `.DS_Store`、密钥、本机绝对路径私货  
- 任何未授权的第三方闭源产品完整拷贝

### 建议校验命令（上传方本地执行后把结果写入 MANIFEST）

```sh
# 在项目根
find docs/设计包 contracts history docs/*.md -type f ! -name .DS_Store | wc -l
python3 - <<'PY'
import hashlib, json, os
from pathlib import Path
root = Path('docs/设计包')
rows=[]
for p in sorted(root.rglob('*')):
    if p.is_file() and p.name!='.DS_Store':
        h=hashlib.sha256(p.read_bytes()).hexdigest()
        rows.append({'path':str(p),'sha256':h,'bytes':p.stat().st_size})
print(json.dumps({'count':len(rows),'totalBytes':sum(r['bytes'] for r in rows)},ensure_ascii=False))
PY
```

---

## 6. 与「完整创建平台」的门禁对齐

按本项目自有规则（`CONTEXT.md` / `28` / `47` / `开发体系.md`）：

| 阶段 | 设计材料是否够 | 还缺什么 | 可否开始 |
|---|---|---|---|
| 设计评审 | ✅ 够 | 无 | 可以评审 |
| 完整上传/交接 | ⚠️ 差打包与 Owner 决策页 | P0-1～P0-4 | 先补传再交接 |
| M0 底座实验 | ⚠️ 研究够、手册未实测 | P0-3 + P1-1 | 仅实验，不写产品树 |
| M1 产品编码 | ❌ 不够 | M0 通过记录 + 切片合同冻结 | **暂停大规模编码** |
| 宣称「平台已创建/可验收」 | ❌ | 真实构建、接口、浏览器、72 AC 证据 | 禁止宣称 |

---

## 7. 给用户的补传请求（可直接回复）

请按需回传或在本机补齐以下内容（有则传文件，无则书面声明「不存在」）：

1. **当前设计包完整 ZIP**（含 35–60，不要只用 9/11 旧 archive）  
2. **contracts 完整 ZIP**  
3. **底座终选**：选定哪一套 / 或明确「仅授权 M0 对比实验」  
4. **设计源文件**：Figma/图源/品牌包，或声明「以 31 号 HTML 为唯一视觉源」  
5. 是否还有**未放入本目录**的额外 PRD、原型、会议纪要、许可证批复

补齐 P0 并完成 Owner 底座决定后，再进入「按 47 号最小步骤真实落地」；在此之前保持**材料梳理与缺口关闭**，不开展大规模产品编码。

---

## 8. 本轮已落盘文档

| 文档 | 路径 |
|---|---|
| 材料清单 | `/Users/mac/Documents/OA数字员工协作平台/docs/design-material-inventory.md` |
| 本检查表 | `/Users/mac/Documents/OA数字员工协作平台/docs/design-upload-checklist.md` |
