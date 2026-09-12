# 开发机器合同索引

状态：设计合同与合成样本；未实现产品、未运行数据库/模型、未商用放行。

人读入口：[46号开发基线](../docs/设计包/46-开发基线与低代码插件化决策.md)。业务范围仍由原30号需求追踪决定。

| 文件 | 作用 |
|---|---|
| openapi.json / command-catalog.json / command-reference.md | 31命令组逐动作请求、响应、路径、错误与权限；不是运行API |
| domain.schema.json / events.schema.json / internal.schema.json | 类型、公共事件和后台受限记录的独立合同 |
| plugin-manifest.schema.json | 低代码配置包/既有扩展点插件的最小声明；不授予权限 |
| data-model.json / data-dictionary.md | 字段级物理参考与关系；不是要求新建全部表 |
| storage-reuse-plan.json | 采用底座后先复用，缺口有证据才扩展 |
| migrations/mysql-candidate/ | 仅供审查的候选DDL，禁止让产品迁移器自动扫描 |
| implementation-map.json / ui-pages.json | 173需求、21领域和22页面的派生实现映射 |
| invariants.json / state-machines.json | 必须保持的规则和带条件状态边；不是实际引擎 |
| fixtures/ | 合成请求、权限、状态、种子、插件与AI评测输入；未作产品执行 |
| commercial-component-register.json | 已知候选组件问题与关闭条件；不是最终SBOM |

检查：在项目根运行 `python3 validation/check_implementation_contracts.py`。结果位于validation/implementation-contract-check.json，只证明文档与支持的Schema子集、引用、参考样例一致。完整运行与商用准入按47/51/54号实施。
