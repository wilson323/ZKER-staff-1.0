# 字段级数据字典

由data-model.json生成。34张候选参考表；优先映射底座，不能直接全部建表。未在数据库执行。

## oa_work_item

归属：业务工作合同；流程运行和人员责任归选定OA引擎。阶段：M1；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| scope | VARCHAR(16) | False | 无 | PROCESS或AD_HOC |
| process_instance_id | VARCHAR(64) | True | 无 | OA引擎业务实例ID，不能当模板ID |
| engine_node_ref | VARCHAR(64) | True | 无 | OA节点ID |
| source_intent_id | VARCHAR(64) | True | 无 | 独立任务的用户意图ID |
| objective | VARCHAR(2000) | False | 无 | 用户目标 |
| output_contract_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/VersionedRef |
| state | VARCHAR(32) | False | 无 | READY/IN_PROGRESS/AWAITING_REVIEW/READY_TO_COMMIT/COMMITTED/CANCELLED |
| readiness | VARCHAR(32) | False | 无 | READY/BLOCKED/NEEDS_RECHECK |
| responsibility_epoch | BIGINT UNSIGNED | False | 1 | 责任轮次；仅责任服务递增 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[]。
索引：[["tenant_id", "process_instance_id", "id"], ["tenant_id", "state", "updated_at", "id"]]。
外键：[]。
CHECK：["scope IN ('PROCESS','AD_HOC')", "(scope='PROCESS' AND process_instance_id IS NOT NULL AND engine_node_ref IS NOT NULL AND source_intent_id IS NULL) OR (scope='AD_HOC' AND source_intent_id IS NOT NULL AND process_instance_id IS NULL AND engine_node_ref IS NULL)", "state IN ('READY','IN_PROGRESS','AWAITING_REVIEW','READY_TO_COMMIT','COMMITTED','CANCELLED')", "readiness IN ('READY','BLOCKED','NEEDS_RECHECK')"]。

## oa_human_task

归属：OA任务只读投影；写入必须经唯一OA适配器。阶段：M1；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| work_id | VARCHAR(64) | False | 无 | 对应工作 |
| engine_task_ref | VARCHAR(64) | False | 无 | 底座人任务或其原生待办ID |
| kind | VARCHAR(24) | False | 无 | EXECUTE/COLLABORATE/REVIEW/RECEIVE |
| assignee_member_id | VARCHAR(64) | True | 无 | OA当前承担人投影，允许尚未领取 |
| candidate_policy_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/VersionedRef |
| responsibility_epoch | BIGINT UNSIGNED | False | 1 | 与OA轮次一致 |
| state | VARCHAR(24) | False | 无 | AVAILABLE/ASSIGNED/IN_PROGRESS/COMPLETED/CANCELLED/SUPERSEDED |
| due_at | DATETIME(6) | True | 无 | 责任截止 |
| engine_revision | BIGINT UNSIGNED | False | 1 | 原始OA版本或单调适配序号 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "engine_task_ref"]]。
索引：[["tenant_id", "assignee_member_id", "state", "due_at", "id"]]。
外键：[{"columns": ["tenant_id", "work_id"], "target": "oa_work_item", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：[]。

## oa_binding

归属：本任务数字员工配置元数据。阶段：M1；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| work_id | VARCHAR(64) | False | 无 | 当前工作 |
| human_task_id | VARCHAR(64) | False | 无 | 当前责任 |
| configured_by | VARCHAR(64) | False | 无 | 实际配置人 |
| responsibility_epoch | BIGINT UNSIGNED | False | 1 | 绑定所属轮次 |
| mode | VARCHAR(16) | False | 无 | MANUAL/ASSISTED/AUTONOMOUS |
| config_version | BIGINT UNSIGNED | False | 1 | 当前不可变配置版本 |
| state | VARCHAR(20) | False | 无 | DRAFT/ACTIVE/SUPERSEDED/REVOKED/CLOSED |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "human_task_id", "responsibility_epoch"]]。
索引：[]。
外键：[{"columns": ["tenant_id", "work_id"], "target": "oa_work_item", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}, {"columns": ["tenant_id", "human_task_id"], "target": "oa_human_task", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：["mode IN ('MANUAL','ASSISTED','AUTONOMOUS')"]。

## oa_binding_version

归属：不可变配置快照。阶段：M1；内容版本不可变标记：True（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| binding_id | VARCHAR(64) | False | 无 | 配置主记录 |
| version | BIGINT UNSIGNED | False | 1 | 配置版本号 |
| config_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/C04_saveTaskBindingRequest |
| digest | VARCHAR(71) | False | 无 | 规范化配置摘要 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "binding_id", "version"]]。
索引：[]。
外键：[{"columns": ["tenant_id", "binding_id"], "target": "oa_binding", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：[]。

## oa_baseline

归属：共同业务事实基线；确认后不可变。阶段：M1；内容版本不可变标记：True（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| work_id | VARCHAR(64) | False | 无 | 基线所属业务工作 |
| version | BIGINT UNSIGNED | False | 1 | 基线版本 |
| facts_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/C16_confirmRequest |
| confirmed_by | VARCHAR(64) | False | 无 | 有权人员 |
| confirmed_at | DATETIME(6) | False | 无 | 真实确认时间 |
| digest | VARCHAR(71) | False | 无 | 基线摘要 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "work_id", "version"]]。
索引：[]。
外键：[{"columns": ["tenant_id", "work_id"], "target": "oa_work_item", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：[]。

## oa_context_manifest

归属：输入集合的不可变版本引用；不存公开对话。阶段：M1；内容版本不可变标记：True（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| work_id | VARCHAR(64) | False | 无 | 限定工作 |
| baseline_id | VARCHAR(64) | False | 无 | 共同基线 |
| target_subject_id | VARCHAR(64) | False | 无 | 精确使用主体 |
| purpose | VARCHAR(200) | False | 无 | 限定用途 |
| source_refs_json | JSON | False | 无 | 带purpose/required的来源引用数组；internal.schema.json#/$defs/ContextSources |
| policy_revision | BIGINT UNSIGNED | False | 1 | 来源校验时策略版本 |
| expires_at | DATETIME(6) | False | 无 | 过期时必须重建 |
| digest | VARCHAR(71) | False | 无 | manifest摘要 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[]。
索引：[]。
外键：[{"columns": ["tenant_id", "work_id"], "target": "oa_work_item", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}, {"columns": ["tenant_id", "baseline_id"], "target": "oa_baseline", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：[]。

## oa_execution_snapshot

归属：真实执行时重验后形成；只供后台。阶段：M1；内容版本不可变标记：True（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| work_id | VARCHAR(64) | False | 无 | 执行工作 |
| binding_id | VARCHAR(64) | False | 无 | 配置 |
| binding_version | BIGINT UNSIGNED | False | 1 | 锁定配置版本 |
| manifest_id | VARCHAR(64) | False | 无 | 锁定上下文 |
| responsibility_epoch | BIGINT UNSIGNED | False | 1 | 创建轮次 |
| authz_epoch | BIGINT UNSIGNED | False | 1 | 执行授权代次 |
| policy_revision | BIGINT UNSIGNED | False | 1 | 策略版本 |
| expires_at | DATETIME(6) | False | 无 | 到期拒绝新工具调用 |
| digest | VARCHAR(71) | False | 无 | 全部执行输入摘要 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[]。
索引：[]。
外键：[{"columns": ["tenant_id", "work_id"], "target": "oa_work_item", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}, {"columns": ["tenant_id", "binding_id"], "target": "oa_binding", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}, {"columns": ["tenant_id", "manifest_id"], "target": "oa_context_manifest", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：[]。

## oa_execution_grant

归属：复用底座Grant的任务用途扩展；不是第二套角色权限。阶段：M1；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| base_grant_id | VARCHAR(64) | False | 无 | 底座权威Grant ID |
| work_id | VARCHAR(64) | False | 无 | 唯一工作 |
| execution_subject_id | VARCHAR(64) | False | 无 | 工作负载身份 |
| granted_by | VARCHAR(64) | False | 无 | 有权来源授权人 |
| policy_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/ExecutionGrant |
| expires_at | DATETIME(6) | False | 无 | 有效期 |
| authz_epoch | BIGINT UNSIGNED | False | 1 | 撤权后递增 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[]。
索引：[]。
外键：[{"columns": ["tenant_id", "work_id"], "target": "oa_work_item", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：[]。

## oa_attempt

归属：SDK执行状态与其持久化引用；不另建循环。阶段：M1；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| work_id | VARCHAR(64) | False | 无 | 工作 |
| binding_id | VARCHAR(64) | False | 无 | 本人配置 |
| snapshot_id | VARCHAR(64) | False | 无 | 锁定输入 |
| attempt_number | BIGINT UNSIGNED | False | 1 | 工作内执行序号 |
| fence | BIGINT UNSIGNED | False | 1 | 唯一运行栅栏 |
| state | VARCHAR(24) | False | 无 | QUEUED/PREPARING/RUNNING/WAITING_HUMAN/PAUSED/SUCCEEDED/FAILED/CANCEL_REQUESTED/CANCELLED/RESULT_UNKNOWN |
| operation_id | VARCHAR(64) | False | 无 | 操作记录 |
| sdk_run_ref | VARCHAR(64) | True | 无 | 底座SDK执行ID |
| checkpoint_ref | VARCHAR(255) | True | 无 | SDK检查点引用，非私有正文 |
| started_at | DATETIME(6) | True | 无 | 实际开始 |
| ended_at | DATETIME(6) | True | 无 | 真实终结 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "work_id", "attempt_number"]]。
索引：[]。
外键：[{"columns": ["tenant_id", "work_id"], "target": "oa_work_item", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}, {"columns": ["tenant_id", "binding_id"], "target": "oa_binding", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}, {"columns": ["tenant_id", "snapshot_id"], "target": "oa_execution_snapshot", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：[]。

## oa_artifact_version

归属：不可变文件元数据；实际字节在私有存储。阶段：M1；内容版本不可变标记：True（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| artifact_id | VARCHAR(64) | False | 无 | 文件跨版本稳定ID |
| version | BIGINT UNSIGNED | False | 1 | 文件版本 |
| work_id | VARCHAR(64) | False | 无 | 所属工作 |
| source_attempt_id | VARCHAR(64) | True | 无 | 人工上传可空 |
| storage_ref | VARCHAR(512) | False | 无 | 私有对象键；不返回公网URL |
| name | VARCHAR(255) | False | 无 | 名称本身受读权限控制 |
| media_type | VARCHAR(100) | False | 无 | 服务端嗅探MIME |
| size_bytes | BIGINT UNSIGNED | False | 无 | 实测大小 |
| digest | VARCHAR(71) | False | 无 | 实际字节SHA256 |
| created_by | VARCHAR(64) | False | 无 | 实际人员/服务主体 |
| scan_state | VARCHAR(20) | False | 无 | QUARANTINED/CLEAN/REJECTED |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "artifact_id", "version"]]。
索引：[]。
外键：[{"columns": ["tenant_id", "work_id"], "target": "oa_work_item", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}, {"columns": ["tenant_id", "source_attempt_id"], "target": "oa_attempt", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：[]。

## oa_collaboration

归属：父子工作关系不隐含私有内容共享。阶段：M2；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| parent_work_id | VARCHAR(64) | False | 无 | 父工作 |
| child_work_id | VARCHAR(64) | True | 无 | 接受后子工作 |
| recipient_member_id | VARCHAR(64) | False | 无 | 候选接收人 |
| output_contract_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/VersionedRef |
| state | VARCHAR(20) | False | 无 | REQUESTED/ACCEPTED/DECLINED/EXPIRED/CANCELLED |
| due_at | DATETIME(6) | False | 无 | 约定期限 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "child_work_id"]]。
索引：[]。
外键：[{"columns": ["tenant_id", "parent_work_id"], "target": "oa_work_item", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}, {"columns": ["tenant_id", "child_work_id"], "target": "oa_work_item", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：[]。

## oa_contribution_version

归属：贡献版本不可变；决定独立记录。阶段：M2；内容版本不可变标记：True（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| collaboration_id | VARCHAR(64) | False | 无 | 分工关系 |
| version | BIGINT UNSIGNED | False | 1 | 贡献版本 |
| submission_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/C09_submitRequest |
| submitted_by | VARCHAR(64) | False | 无 | 子当前承担人 |
| digest | VARCHAR(71) | False | 无 | 候选摘要 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "collaboration_id", "version"]]。
索引：[]。
外键：[{"columns": ["tenant_id", "collaboration_id"], "target": "oa_collaboration", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：[]。

## oa_review

归属：审核请求及目标版本。阶段：M1；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| work_id | VARCHAR(64) | False | 无 | 被审工作 |
| reviewer_member_id | VARCHAR(64) | False | 无 | 独立审核人 |
| requested_by | VARCHAR(64) | False | 无 | 发起审核人 |
| candidate_digest | VARCHAR(71) | False | 无 | 精确候选集 |
| baseline_id | VARCHAR(64) | False | 无 | 基线版本 |
| state | VARCHAR(20) | False | 无 | PENDING/APPROVED/REJECTED/RETURNED/OBSOLETE/CANCELLED |
| receipt_json | JSON | True | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/C10_decideReviewRequest |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[]。
索引：[]。
外键：[{"columns": ["tenant_id", "work_id"], "target": "oa_work_item", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}, {"columns": ["tenant_id", "baseline_id"], "target": "oa_baseline", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：["reviewer_member_id <> requested_by"]。

## oa_completion_check

归属：短期预检证据；交付事务仍重新校验。阶段：M1；内容版本不可变标记：True（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| work_id | VARCHAR(64) | False | 无 | 目标工作 |
| responsibility_epoch | BIGINT UNSIGNED | False | 1 | 目标轮次 |
| work_revision | BIGINT UNSIGNED | False | 1 | 预检版本 |
| candidate_digest | VARCHAR(71) | False | 无 | 精确候选集 |
| baseline_digest | VARCHAR(71) | False | 无 | 基线 |
| result_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/CompletionCheck |
| expires_at | DATETIME(6) | False | 无 | 预检失效时刻 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[]。
索引：[]。
外键：[{"columns": ["tenant_id", "work_id"], "target": "oa_work_item", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：[]。

## oa_delivery

归属：唯一正式交付；成功与OA推进对账。阶段：M1；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| work_id | VARCHAR(64) | False | 无 | 工作 |
| responsibility_epoch | BIGINT UNSIGNED | False | 1 | 交付轮次 |
| completion_check_id | VARCHAR(64) | False | 无 | 引用预检 |
| submission_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/C11_submitDeliveryRequest |
| confirmed_by | VARCHAR(64) | False | 无 | 承担人真实确认 |
| confirmed_at | DATETIME(6) | False | 无 | 实际确认 |
| state | VARCHAR(24) | False | 无 | PENDING_COMMIT/CONFIRMED/FAILED/UNKNOWN |
| digest | VARCHAR(71) | False | 无 | 交付事实摘要 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "work_id", "responsibility_epoch"]]。
索引：[]。
外键：[{"columns": ["tenant_id", "work_id"], "target": "oa_work_item", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}, {"columns": ["tenant_id", "completion_check_id"], "target": "oa_completion_check", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：[]。

## oa_handoff

归属：下游接手包版本。阶段：M1；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| delivery_id | VARCHAR(64) | False | 无 | 上游确认交付 |
| recipient_work_id | VARCHAR(64) | False | 无 | 下游工作 |
| version | BIGINT UNSIGNED | False | 1 | 交接包版本 |
| state | VARCHAR(20) | False | 无 | PENDING/BLOCKED/ACCEPTED/CANCELLED |
| required_refs_json | JSON | False | 无 | 必需输入与用途；internal.schema.json#/$defs/ContextSources |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "delivery_id", "recipient_work_id", "version"]]。
索引：[]。
外键：[{"columns": ["tenant_id", "delivery_id"], "target": "oa_delivery", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}, {"columns": ["tenant_id", "recipient_work_id"], "target": "oa_work_item", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：[]。

## oa_handoff_receipt

归属：下游真实接受回执。阶段：M1；内容版本不可变标记：True（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| handoff_id | VARCHAR(64) | False | 无 | 交接包 |
| package_version | BIGINT UNSIGNED | False | 1 | 接受版本 |
| accepted_by | VARCHAR(64) | False | 无 | 下游承担人 |
| accepted_at | DATETIME(6) | False | 无 | 实际接手 |
| receipt_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/C12_receiveHandoffRequest |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "handoff_id", "package_version"]]。
索引：[]。
外键：[{"columns": ["tenant_id", "handoff_id"], "target": "oa_handoff", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：[]。

## oa_operation

归属：幂等意图与查证；不是任务状态权威。阶段：M1；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| actor_id | VARCHAR(64) | False | 无 | 原始请求主体 |
| command | VARCHAR(64) | False | 无 | 精确命令动作 |
| idempotency_key | VARCHAR(128) | False | 无 | 用户一次意图键 |
| request_digest | VARCHAR(71) | False | 无 | 规范化方法/路径/正文摘要 |
| state | VARCHAR(24) | False | 无 | QUEUED/PENDING_COMMIT/CONFIRMED/FAILED/UNKNOWN |
| response_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/Operation |
| expires_at | DATETIME(6) | False | 无 | 至少7日；终态清理依保留策略 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "actor_id", "command", "idempotency_key"]]。
索引：[["tenant_id", "state", "updated_at", "id"]]。
外键：[]。
CHECK：[]。

## oa_invocation

归属：外部副作用调用台账；未知只查证。阶段：M1；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| attempt_id | VARCHAR(64) | False | 无 | SDK执行 |
| operation_id | VARCHAR(64) | False | 无 | 唯一业务操作 |
| provider_id | VARCHAR(64) | False | 无 | 工具提供者 |
| action | VARCHAR(80) | False | 无 | 白名单工具动作 |
| effect_key | VARCHAR(128) | False | 无 | 对端幂等或业务键 |
| state | VARCHAR(24) | False | 无 | PREPARED/WAITING_CONFIRMATION/DISPATCHED/SUCCEEDED/FAILED/RESULT_UNKNOWN |
| provider_receipt_ref | VARCHAR(255) | True | 无 | 脱敏回执定位 |
| input_digest | VARCHAR(71) | False | 无 | 实际入参摘要 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "provider_id", "action", "effect_key"]]。
索引：[]。
外键：[{"columns": ["tenant_id", "attempt_id"], "target": "oa_attempt", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}, {"columns": ["tenant_id", "operation_id"], "target": "oa_operation", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：[]。

## oa_outbox

归属：同业务事务提交的事件。阶段：M1；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| aggregate_id | VARCHAR(64) | False | 无 | 聚合ID |
| aggregate_kind | VARCHAR(32) | False | 无 | 聚合类型 |
| aggregate_sequence | BIGINT UNSIGNED | False | 1 | 每聚合严格递增 |
| event_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/InternalEvent |
| state | VARCHAR(16) | False | 无 | PENDING/DELIVERED/DEAD |
| available_at | DATETIME(6) | False | 无 | 下一次投递时刻 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "aggregate_kind", "aggregate_id", "aggregate_sequence"]]。
索引：[["state", "available_at", "id"]]。
外键：[]。
CHECK：[]。

## oa_inbox

归属：每消费者去重与应用事务边界。阶段：M1；内容版本不可变标记：True（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| consumer_id | VARCHAR(64) | False | 无 | 消费者 |
| source_id | VARCHAR(64) | False | 无 | 可信来源 |
| event_id | VARCHAR(64) | False | 无 | 来源事件ID |
| payload_digest | VARCHAR(71) | False | 无 | 同ID异载荷必须拒绝 |
| processed_at | DATETIME(6) | False | 无 | 处理成功提交时刻 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "consumer_id", "source_id", "event_id"]]。
索引：[]。
外键：[]。
CHECK：[]。

## oa_output_release

归属：每受众和来源版本的展示发布决定。阶段：M1；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| work_id | VARCHAR(64) | False | 无 | 工作 |
| recipient_id | VARCHAR(64) | False | 无 | 人员主体或受控受众引用 |
| source_ref_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/VersionedRef |
| policy_revision | BIGINT UNSIGNED | False | 1 | 发布策略 |
| authz_epoch | BIGINT UNSIGNED | False | 1 | 授权代次 |
| state | VARCHAR(16) | False | 无 | ALLOWED/DENIED/REVOKED |
| expires_at | DATETIME(6) | False | 无 | 展示授权到期 |
| public_artifact_version_id | VARCHAR(64) | True | 无 | 已审查公开副本，可空 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[]。
索引：[]。
外键：[{"columns": ["tenant_id", "work_id"], "target": "oa_work_item", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}, {"columns": ["tenant_id", "public_artifact_version_id"], "target": "oa_artifact_version", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：[]。

## oa_thread_entry

归属：人员端获准内容索引；原始运行日志不入表。阶段：M1；内容版本不可变标记：True（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| work_id | VARCHAR(64) | False | 无 | 唯一工作 |
| actor_id | VARCHAR(64) | False | 无 | 说话主体 |
| kind | VARCHAR(24) | False | 无 | USER_MESSAGE/RELEASED_SUMMARY/SYSTEM_STATUS/RELEASED_ARTIFACT |
| release_id | VARCHAR(64) | False | 无 | 当前发布决定 |
| entry_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/ThreadEntry |
| sequence | BIGINT UNSIGNED | False | 1 | 工作对话顺序 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "work_id", "sequence"]]。
索引：[]。
外键：[{"columns": ["tenant_id", "work_id"], "target": "oa_work_item", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}, {"columns": ["tenant_id", "release_id"], "target": "oa_output_release", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：[]。

## oa_draft

归属：按主体和工作保存草稿；撤权停止访问。阶段：M1；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| work_id | VARCHAR(64) | False | 无 | 工作 |
| actor_id | VARCHAR(64) | False | 无 | 草稿所有人 |
| kind | VARCHAR(20) | False | 无 | CHAT/BINDING/DELIVERY |
| base_revision | BIGINT UNSIGNED | False | 1 | 起草时版本 |
| body | VARCHAR(10000) | False | 无 | 仅草稿作者可读 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "work_id", "actor_id", "kind"]]。
索引：[]。
外键：[{"columns": ["tenant_id", "work_id"], "target": "oa_work_item", "targetColumns": ["tenant_id", "id"], "onDelete": "RESTRICT", "onUpdate": "RESTRICT"}]。
CHECK：[]。

## oa_asset_revision

归属：底座资源的版本扩展。阶段：M2；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| owner_member_id | VARCHAR(64) | False | 无 | 所有人不自动获得全部来源读权 |
| base_resource_id | VARCHAR(64) | False | 无 | 底座权威资源ID |
| version | BIGINT UNSIGNED | False | 1 | 扩展版本 |
| state | VARCHAR(32) | False | 无 | 状态合法值见53号领域状态表 |
| payload_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/AssetDraft |
| digest | VARCHAR(71) | False | 无 | 不可变内容摘要 |
| expires_at | DATETIME(6) | True | 无 | 适用时有效期 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "base_resource_id", "version"]]。
索引：[["tenant_id", "owner_member_id", "state", "id"]]。
外键：[]。
CHECK：[]。

## oa_market_adoption

归属：复制/引用谱系及异步操作。阶段：M2；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| owner_member_id | VARCHAR(64) | False | 无 | 所有人不自动获得全部来源读权 |
| base_resource_id | VARCHAR(64) | False | 无 | 底座权威资源ID |
| version | BIGINT UNSIGNED | False | 1 | 扩展版本 |
| state | VARCHAR(32) | False | 无 | 状态合法值见53号领域状态表 |
| payload_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/C13_adoptMarketRequest |
| digest | VARCHAR(71) | False | 无 | 不可变内容摘要 |
| expires_at | DATETIME(6) | True | 无 | 适用时有效期 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "base_resource_id", "version"]]。
索引：[["tenant_id", "owner_member_id", "state", "id"]]。
外键：[]。
CHECK：[]。

## oa_knowledge_job

归属：底座摄取作业与来源校验扩展。阶段：M3；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| owner_member_id | VARCHAR(64) | False | 无 | 所有人不自动获得全部来源读权 |
| base_resource_id | VARCHAR(64) | False | 无 | 底座权威资源ID |
| version | BIGINT UNSIGNED | False | 1 | 扩展版本 |
| state | VARCHAR(32) | False | 无 | 状态合法值见53号领域状态表 |
| payload_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/C19_ingestRequest |
| digest | VARCHAR(71) | False | 无 | 不可变内容摘要 |
| expires_at | DATETIME(6) | True | 无 | 适用时有效期 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "base_resource_id", "version"]]。
索引：[["tenant_id", "owner_member_id", "state", "id"]]。
外键：[]。
CHECK：[]。

## oa_team_configuration

归属：底座Agent团队配置扩展。阶段：M3；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| owner_member_id | VARCHAR(64) | False | 无 | 所有人不自动获得全部来源读权 |
| base_resource_id | VARCHAR(64) | False | 无 | 底座权威资源ID |
| version | BIGINT UNSIGNED | False | 1 | 扩展版本 |
| state | VARCHAR(32) | False | 无 | 状态合法值见53号领域状态表 |
| payload_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/C21_configureRequest |
| digest | VARCHAR(71) | False | 无 | 不可变内容摘要 |
| expires_at | DATETIME(6) | True | 无 | 适用时有效期 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "base_resource_id", "version"]]。
索引：[["tenant_id", "owner_member_id", "state", "id"]]。
外键：[]。
CHECK：[]。

## oa_automation_plan

归属：底座调度计划扩展。阶段：M4；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| owner_member_id | VARCHAR(64) | False | 无 | 所有人不自动获得全部来源读权 |
| base_resource_id | VARCHAR(64) | False | 无 | 底座权威资源ID |
| version | BIGINT UNSIGNED | False | 1 | 扩展版本 |
| state | VARCHAR(32) | False | 无 | 状态合法值见53号领域状态表 |
| payload_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/C22_createRequest |
| digest | VARCHAR(71) | False | 无 | 不可变内容摘要 |
| expires_at | DATETIME(6) | True | 无 | 适用时有效期 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "base_resource_id", "version"]]。
索引：[["tenant_id", "owner_member_id", "state", "id"]]。
外键：[]。
CHECK：[]。

## oa_config_proposal

归属：只引用原配置，不成为配置权威。阶段：M3；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| owner_member_id | VARCHAR(64) | False | 无 | 所有人不自动获得全部来源读权 |
| base_resource_id | VARCHAR(64) | False | 无 | 底座权威资源ID |
| version | BIGINT UNSIGNED | False | 1 | 扩展版本 |
| state | VARCHAR(32) | False | 无 | 状态合法值见53号领域状态表 |
| payload_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/C27_proposeConfigRequest |
| digest | VARCHAR(71) | False | 无 | 不可变内容摘要 |
| expires_at | DATETIME(6) | True | 无 | 适用时有效期 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "base_resource_id", "version"]]。
索引：[["tenant_id", "owner_member_id", "state", "id"]]。
外键：[]。
CHECK：[]。

## oa_analysis_plan

归属：只读分析计划；结果存在私有ArtifactVersion。阶段：M3；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| owner_member_id | VARCHAR(64) | False | 无 | 所有人不自动获得全部来源读权 |
| base_resource_id | VARCHAR(64) | False | 无 | 底座权威资源ID |
| version | BIGINT UNSIGNED | False | 1 | 扩展版本 |
| state | VARCHAR(32) | False | 无 | 状态合法值见53号领域状态表 |
| payload_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/AnalysisQuery |
| digest | VARCHAR(71) | False | 无 | 不可变内容摘要 |
| expires_at | DATETIME(6) | True | 无 | 适用时有效期 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "base_resource_id", "version"]]。
索引：[["tenant_id", "owner_member_id", "state", "id"]]。
外键：[]。
CHECK：[]。

## oa_relation_assertion

归属：来源有据的关系断言扩展。阶段：M3；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| owner_member_id | VARCHAR(64) | False | 无 | 所有人不自动获得全部来源读权 |
| base_resource_id | VARCHAR(64) | False | 无 | 底座权威资源ID |
| version | BIGINT UNSIGNED | False | 1 | 扩展版本 |
| state | VARCHAR(32) | False | 无 | 状态合法值见53号领域状态表 |
| payload_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/RelationAssertion |
| digest | VARCHAR(71) | False | 无 | 不可变内容摘要 |
| expires_at | DATETIME(6) | True | 无 | 适用时有效期 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "base_resource_id", "version"]]。
索引：[["tenant_id", "owner_member_id", "state", "id"]]。
外键：[]。
CHECK：[]。

## oa_opportunity

归属：有界主动建议与用户反馈。阶段：M4；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| owner_member_id | VARCHAR(64) | False | 无 | 所有人不自动获得全部来源读权 |
| base_resource_id | VARCHAR(64) | False | 无 | 底座权威资源ID |
| version | BIGINT UNSIGNED | False | 1 | 扩展版本 |
| state | VARCHAR(32) | False | 无 | 状态合法值见53号领域状态表 |
| payload_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/Opportunity |
| digest | VARCHAR(71) | False | 无 | 不可变内容摘要 |
| expires_at | DATETIME(6) | True | 无 | 适用时有效期 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "base_resource_id", "version"]]。
索引：[["tenant_id", "owner_member_id", "state", "id"]]。
外键：[]。
CHECK：[]。

## oa_evolution_proposal

归属：原资源版本的评估/试用/发布证据扩展。阶段：M5；内容版本不可变标记：False（可变安全/扫描状态另按49号处理）。

| 字段 | 类型 | 可空 | 默认值 | 语义 / JSON Schema |
|---|---|---|---|---|
| tenant_id | VARCHAR(64) | False | 无 | 可信租户；所有查询和关联必含 |
| id | VARCHAR(64) | False | 无 | 服务端生成的本表ID |
| owner_member_id | VARCHAR(64) | False | 无 | 所有人不自动获得全部来源读权 |
| base_resource_id | VARCHAR(64) | False | 无 | 底座权威资源ID |
| version | BIGINT UNSIGNED | False | 1 | 扩展版本 |
| state | VARCHAR(32) | False | 无 | 状态合法值见53号领域状态表 |
| payload_json | JSON | False | 无 | 按JSON Schema校验，不允许任意JSON；domain.schema.json#/$defs/EvolutionProposal |
| digest | VARCHAR(71) | False | 无 | 不可变内容摘要 |
| expires_at | DATETIME(6) | True | 无 | 适用时有效期 |
| revision | BIGINT UNSIGNED | False | 1 | 本记录乐观并发版本；更新+1 |
| created_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC写入时间 |
| updated_at | DATETIME(6) | False | CURRENT_TIMESTAMP(6) | 服务端UTC更新时间 |

主键：tenant_id, id。
唯一约束：[["tenant_id", "base_resource_id", "version"]]。
索引：[["tenant_id", "owner_member_id", "state", "id"]]。
外键：[]。
CHECK：[]。
