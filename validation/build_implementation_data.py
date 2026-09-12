"""Generate a MySQL 8.4 *candidate* extension DDL and a field-level dictionary.
No connections, no database execution, no base framework tables.
"""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'contracts'
TABLES=[]

def col(name,typ,meaning,nullable=False,default=None):
    return dict(name=name,type=typ,nullable=nullable,default=default,meaning=meaning)
def ident(name,meaning,nullable=False):return col(name,'VARCHAR(64)',meaning,nullable)
def rev(name,meaning):return col(name,'BIGINT UNSIGNED',meaning,False,'1')
def js(name,schema,meaning):return {**col(name,'JSON',meaning),'schemaRef':schema}
def txt(name,length,meaning,nullable=False):return col(name,f'VARCHAR({length})',meaning,nullable)
def dt(name,meaning,nullable=False):return col(name,'DATETIME(6)',meaning,nullable)
def table(name,owner,cols,unique=None,indexes=None,fks=None,checks=None,phase='M1',immutable=False):
    TABLES.append(dict(name='oa_'+name,authority=owner,phase=phase,immutable=immutable,
        columns=[ident('tenant_id','可信租户；所有查询和关联必含'),ident('id','服务端生成的本表ID'),*cols,
                 rev('revision','本记录乐观并发版本；更新+1'),col('created_at','DATETIME(6)','服务端UTC写入时间',False,'CURRENT_TIMESTAMP(6)'),col('updated_at','DATETIME(6)','服务端UTC更新时间',False,'CURRENT_TIMESTAMP(6)')],
        primaryKey=['tenant_id','id'],unique=unique or [],indexes=indexes or [],foreignKeys=fks or [],checks=checks or []))
def fk(column,target):return dict(columns=['tenant_id',column],target='oa_'+target,targetColumns=['tenant_id','id'],onDelete='RESTRICT',onUpdate='RESTRICT')
def docref(name='payload_json',schema='VersionedRef',meaning='按JSON Schema校验，不允许任意JSON'):
    return js(name,'domain.schema.json#/$defs/'+schema,meaning)

table('work_item','业务工作合同；流程运行和人员责任归选定OA引擎',[
    txt('scope',16,'PROCESS或AD_HOC'),ident('process_instance_id','OA引擎业务实例ID，不能当模板ID',True),ident('engine_node_ref','OA节点ID',True),
    ident('source_intent_id','独立任务的用户意图ID',True),txt('objective',2000,'用户目标'),docref('output_contract_json'),
    txt('state',32,'READY/IN_PROGRESS/AWAITING_REVIEW/READY_TO_COMMIT/COMMITTED/CANCELLED'),
    txt('readiness',32,'READY/BLOCKED/NEEDS_RECHECK'),rev('responsibility_epoch','责任轮次；仅责任服务递增')],
    indexes=[['tenant_id','process_instance_id','id'],['tenant_id','state','updated_at','id']],
    checks=["scope IN ('PROCESS','AD_HOC')","(scope='PROCESS' AND process_instance_id IS NOT NULL AND engine_node_ref IS NOT NULL AND source_intent_id IS NULL) OR (scope='AD_HOC' AND source_intent_id IS NOT NULL AND process_instance_id IS NULL AND engine_node_ref IS NULL)","state IN ('READY','IN_PROGRESS','AWAITING_REVIEW','READY_TO_COMMIT','COMMITTED','CANCELLED')","readiness IN ('READY','BLOCKED','NEEDS_RECHECK')"])
table('human_task','OA任务只读投影；写入必须经唯一OA适配器',[
    ident('work_id','对应工作'),ident('engine_task_ref','底座人任务或其原生待办ID'),txt('kind',24,'EXECUTE/COLLABORATE/REVIEW/RECEIVE'),
    ident('assignee_member_id','OA当前承担人投影，允许尚未领取',True),docref('candidate_policy_json'),rev('responsibility_epoch','与OA轮次一致'),
    txt('state',24,'AVAILABLE/ASSIGNED/IN_PROGRESS/COMPLETED/CANCELLED/SUPERSEDED'),dt('due_at','责任截止',True),rev('engine_revision','原始OA版本或单调适配序号')],
    unique=[['tenant_id','engine_task_ref']],indexes=[['tenant_id','assignee_member_id','state','due_at','id']],fks=[fk('work_id','work_item')])
table('binding','本任务数字员工配置元数据',[
    ident('work_id','当前工作'),ident('human_task_id','当前责任'),ident('configured_by','实际配置人'),rev('responsibility_epoch','绑定所属轮次'),
    txt('mode',16,'MANUAL/ASSISTED/AUTONOMOUS'),rev('config_version','当前不可变配置版本'),txt('state',20,'DRAFT/ACTIVE/SUPERSEDED/REVOKED/CLOSED')],
    unique=[['tenant_id','human_task_id','responsibility_epoch']],fks=[fk('work_id','work_item'),fk('human_task_id','human_task')],checks=["mode IN ('MANUAL','ASSISTED','AUTONOMOUS')"])
table('binding_version','不可变配置快照',[
    ident('binding_id','配置主记录'),rev('version','配置版本号'),docref('config_json','C04_saveTaskBindingRequest'),txt('digest',71,'规范化配置摘要')],
    unique=[['tenant_id','binding_id','version']],fks=[fk('binding_id','binding')],immutable=True)
table('baseline','共同业务事实基线；确认后不可变',[
    ident('work_id','基线所属业务工作'),rev('version','基线版本'),docref('facts_json','C16_confirmRequest'),ident('confirmed_by','有权人员'),dt('confirmed_at','真实确认时间'),txt('digest',71,'基线摘要')],
    unique=[['tenant_id','work_id','version']],fks=[fk('work_id','work_item')],immutable=True)
table('context_manifest','输入集合的不可变版本引用；不存公开对话',[
    ident('work_id','限定工作'),ident('baseline_id','共同基线'),ident('target_subject_id','精确使用主体'),txt('purpose',200,'限定用途'),
    js('source_refs_json','internal.schema.json#/$defs/ContextSources','带purpose/required的来源引用数组'),rev('policy_revision','来源校验时策略版本'),dt('expires_at','过期时必须重建'),txt('digest',71,'manifest摘要')],fks=[fk('work_id','work_item'),fk('baseline_id','baseline')],immutable=True)
table('execution_snapshot','真实执行时重验后形成；只供后台',[
    ident('work_id','执行工作'),ident('binding_id','配置'),rev('binding_version','锁定配置版本'),ident('manifest_id','锁定上下文'),rev('responsibility_epoch','创建轮次'),
    rev('authz_epoch','执行授权代次'),rev('policy_revision','策略版本'),dt('expires_at','到期拒绝新工具调用'),txt('digest',71,'全部执行输入摘要')],fks=[fk('work_id','work_item'),fk('binding_id','binding'),fk('manifest_id','context_manifest')],immutable=True)
table('execution_grant','复用底座Grant的任务用途扩展；不是第二套角色权限',[
    ident('base_grant_id','底座权威Grant ID'),ident('work_id','唯一工作'),ident('execution_subject_id','工作负载身份'),ident('granted_by','有权来源授权人'),
    docref('policy_json','ExecutionGrant'),dt('expires_at','有效期'),rev('authz_epoch','撤权后递增')],fks=[fk('work_id','work_item')])
table('attempt','SDK执行状态与其持久化引用；不另建循环',[
    ident('work_id','工作'),ident('binding_id','本人配置'),ident('snapshot_id','锁定输入'),rev('attempt_number','工作内执行序号'),rev('fence','唯一运行栅栏'),
    txt('state',24,'QUEUED/PREPARING/RUNNING/WAITING_HUMAN/PAUSED/SUCCEEDED/FAILED/CANCEL_REQUESTED/CANCELLED/RESULT_UNKNOWN'),ident('operation_id','操作记录'),
    ident('sdk_run_ref','底座SDK执行ID',True),txt('checkpoint_ref',255,'SDK检查点引用，非私有正文',True),dt('started_at','实际开始',True),dt('ended_at','真实终结',True)],
    unique=[['tenant_id','work_id','attempt_number']],fks=[fk('work_id','work_item'),fk('binding_id','binding'),fk('snapshot_id','execution_snapshot')])
table('artifact_version','不可变文件元数据；实际字节在私有存储',[
    ident('artifact_id','文件跨版本稳定ID'),rev('version','文件版本'),ident('work_id','所属工作'),ident('source_attempt_id','人工上传可空',True),
    txt('storage_ref',512,'私有对象键；不返回公网URL'),txt('name',255,'名称本身受读权限控制'),txt('media_type',100,'服务端嗅探MIME'),col('size_bytes','BIGINT UNSIGNED','实测大小'),
    txt('digest',71,'实际字节SHA256'),ident('created_by','实际人员/服务主体'),txt('scan_state',20,'QUARANTINED/CLEAN/REJECTED')],
    unique=[['tenant_id','artifact_id','version']],fks=[fk('work_id','work_item'),fk('source_attempt_id','attempt')],immutable=True)
table('collaboration','父子工作关系不隐含私有内容共享',[
    ident('parent_work_id','父工作'),ident('child_work_id','接受后子工作',True),ident('recipient_member_id','候选接收人'),docref('output_contract_json'),
    txt('state',20,'REQUESTED/ACCEPTED/DECLINED/EXPIRED/CANCELLED'),dt('due_at','约定期限')],fks=[fk('parent_work_id','work_item'),fk('child_work_id','work_item')],unique=[['tenant_id','child_work_id']],phase='M2')
table('contribution_version','贡献版本不可变；决定独立记录',[
    ident('collaboration_id','分工关系'),rev('version','贡献版本'),docref('submission_json','C09_submitRequest'),ident('submitted_by','子当前承担人'),txt('digest',71,'候选摘要')],
    unique=[['tenant_id','collaboration_id','version']],fks=[fk('collaboration_id','collaboration')],phase='M2',immutable=True)
table('review','审核请求及目标版本',[
    ident('work_id','被审工作'),ident('reviewer_member_id','独立审核人'),ident('requested_by','发起审核人'),txt('candidate_digest',71,'精确候选集'),ident('baseline_id','基线版本'),
    txt('state',20,'PENDING/APPROVED/REJECTED/RETURNED/OBSOLETE/CANCELLED'),{**docref('receipt_json','C10_decideReviewRequest'),'nullable':True}],fks=[fk('work_id','work_item'),fk('baseline_id','baseline')],checks=['reviewer_member_id <> requested_by'])
table('completion_check','短期预检证据；交付事务仍重新校验',[
    ident('work_id','目标工作'),rev('responsibility_epoch','目标轮次'),rev('work_revision','预检版本'),txt('candidate_digest',71,'精确候选集'),txt('baseline_digest',71,'基线'),
    docref('result_json','CompletionCheck'),dt('expires_at','预检失效时刻')],fks=[fk('work_id','work_item')],immutable=True)
table('delivery','唯一正式交付；成功与OA推进对账',[
    ident('work_id','工作'),rev('responsibility_epoch','交付轮次'),ident('completion_check_id','引用预检'),docref('submission_json','C11_submitDeliveryRequest'),
    ident('confirmed_by','承担人真实确认'),dt('confirmed_at','实际确认'),txt('state',24,'PENDING_COMMIT/CONFIRMED/FAILED/UNKNOWN'),txt('digest',71,'交付事实摘要')],
    unique=[['tenant_id','work_id','responsibility_epoch']],fks=[fk('work_id','work_item'),fk('completion_check_id','completion_check')])
table('handoff','下游接手包版本',[
    ident('delivery_id','上游确认交付'),ident('recipient_work_id','下游工作'),rev('version','交接包版本'),txt('state',20,'PENDING/BLOCKED/ACCEPTED/CANCELLED'),
    js('required_refs_json','internal.schema.json#/$defs/ContextSources','必需输入与用途')],fks=[fk('delivery_id','delivery'),fk('recipient_work_id','work_item')],unique=[['tenant_id','delivery_id','recipient_work_id','version']])
table('handoff_receipt','下游真实接受回执',[
    ident('handoff_id','交接包'),rev('package_version','接受版本'),ident('accepted_by','下游承担人'),dt('accepted_at','实际接手'),docref('receipt_json','C12_receiveHandoffRequest')],unique=[['tenant_id','handoff_id','package_version']],fks=[fk('handoff_id','handoff')],immutable=True)
table('operation','幂等意图与查证；不是任务状态权威',[
    ident('actor_id','原始请求主体'),txt('command',64,'精确命令动作'),txt('idempotency_key',128,'用户一次意图键'),txt('request_digest',71,'规范化方法/路径/正文摘要'),
    txt('state',24,'QUEUED/PENDING_COMMIT/CONFIRMED/FAILED/UNKNOWN'),docref('response_json','Operation'),dt('expires_at','至少7日；终态清理依保留策略')],
    unique=[['tenant_id','actor_id','command','idempotency_key']],indexes=[['tenant_id','state','updated_at','id']])
table('invocation','外部副作用调用台账；未知只查证',[
    ident('attempt_id','SDK执行'),ident('operation_id','唯一业务操作'),ident('provider_id','工具提供者'),txt('action',80,'白名单工具动作'),txt('effect_key',128,'对端幂等或业务键'),
    txt('state',24,'PREPARED/WAITING_CONFIRMATION/DISPATCHED/SUCCEEDED/FAILED/RESULT_UNKNOWN'),txt('provider_receipt_ref',255,'脱敏回执定位',True),txt('input_digest',71,'实际入参摘要')],
    unique=[['tenant_id','provider_id','action','effect_key']],fks=[fk('attempt_id','attempt'),fk('operation_id','operation')])
table('outbox','同业务事务提交的事件',[
    ident('aggregate_id','聚合ID'),txt('aggregate_kind',32,'聚合类型'),rev('aggregate_sequence','每聚合严格递增'),docref('event_json','InternalEvent'),
    txt('state',16,'PENDING/DELIVERED/DEAD'),dt('available_at','下一次投递时刻')],unique=[['tenant_id','aggregate_kind','aggregate_id','aggregate_sequence']],indexes=[['state','available_at','id']])
table('inbox','每消费者去重与应用事务边界',[
    ident('consumer_id','消费者'),ident('source_id','可信来源'),ident('event_id','来源事件ID'),txt('payload_digest',71,'同ID异载荷必须拒绝'),dt('processed_at','处理成功提交时刻')],
    unique=[['tenant_id','consumer_id','source_id','event_id']],immutable=True)
table('output_release','每受众和来源版本的展示发布决定',[
    ident('work_id','工作'),ident('recipient_id','人员主体或受控受众引用'),docref('source_ref_json'),rev('policy_revision','发布策略'),rev('authz_epoch','授权代次'),
    txt('state',16,'ALLOWED/DENIED/REVOKED'),dt('expires_at','展示授权到期'),ident('public_artifact_version_id','已审查公开副本，可空',True)],fks=[fk('work_id','work_item'),fk('public_artifact_version_id','artifact_version')])
table('thread_entry','人员端获准内容索引；原始运行日志不入表',[
    ident('work_id','唯一工作'),ident('actor_id','说话主体'),txt('kind',24,'USER_MESSAGE/RELEASED_SUMMARY/SYSTEM_STATUS/RELEASED_ARTIFACT'),
    ident('release_id','当前发布决定'),docref('entry_json','ThreadEntry'),rev('sequence','工作对话顺序')],unique=[['tenant_id','work_id','sequence']],fks=[fk('work_id','work_item'),fk('release_id','output_release')],immutable=True)
table('draft','按主体和工作保存草稿；撤权停止访问',[
    ident('work_id','工作'),ident('actor_id','草稿所有人'),txt('kind',20,'CHAT/BINDING/DELIVERY'),rev('base_revision','起草时版本'),txt('body',10000,'仅草稿作者可读')],
    unique=[['tenant_id','work_id','actor_id','kind']],fks=[fk('work_id','work_item')])

# Later slices keep original asset/knowledge/plan authorities. These are
# extension metadata, not new copies of identity, file or workflow systems.
for name,authority,schema,phase in [
    ('asset_revision','底座资源的版本扩展','AssetDraft','M2'),
    ('market_adoption','复制/引用谱系及异步操作','C13_adoptMarketRequest','M2'),
    ('knowledge_job','底座摄取作业与来源校验扩展','C19_ingestRequest','M3'),
    ('team_configuration','底座Agent团队配置扩展','C21_configureRequest','M3'),
    ('automation_plan','底座调度计划扩展','C22_createRequest','M4'),
    ('config_proposal','只引用原配置，不成为配置权威','C27_proposeConfigRequest','M3'),
    ('analysis_plan','只读分析计划；结果存在私有ArtifactVersion','AnalysisQuery','M3'),
    ('relation_assertion','来源有据的关系断言扩展','RelationAssertion','M3'),
    ('opportunity','有界主动建议与用户反馈','Opportunity','M4'),
    ('evolution_proposal','原资源版本的评估/试用/发布证据扩展','EvolutionProposal','M5')]:
    table(name,authority,[ident('owner_member_id','所有人不自动获得全部来源读权'),ident('base_resource_id','底座权威资源ID'),rev('version','扩展版本'),
        txt('state',32,'状态合法值见53号领域状态表'),docref('payload_json',schema),txt('digest',71,'不可变内容摘要'),dt('expires_at','适用时有效期',True)],
        unique=[['tenant_id','base_resource_id','version']],indexes=[['tenant_id','owner_member_id','state','id']],phase=phase)

def main():
    (OUT/'migrations/mysql-candidate').mkdir(parents=True,exist_ok=True)
    (OUT/'data-model.json').write_text(json.dumps({'status':'CANDIDATE_NOT_DATABASE_VALIDATED','dialect':'MySQL 8.4 / InnoDB / utf8mb4','baseTables':'NOT_INCLUDED_NOT_REPLACED','tables':TABLES},ensure_ascii=False,indent=2)+'\n')
    lines=['-- DESIGN CANDIDATE ONLY. Never run before M0 adoption and isolated MySQL validation.',
           '-- Contains extension tables only. No DROP, DELETE, seed credentials or framework SQL.',
           '-- MySQL DDL implicitly commits. Review 49 and 51 before any migration.','']
    # FK definitions are emitted after all tables exist; no transaction illusion.
    for t in TABLES:
        cols=[]
        for c in t['columns']:
            v=f"  `{c['name']}` {c['type']}"+(' NULL' if c['nullable'] else ' NOT NULL')
            if c['default'] is not None:v+=' DEFAULT '+c['default']
            cols.append(v)
        cols.append('  PRIMARY KEY ('+', '.join('`'+x+'`' for x in t['primaryKey'])+')')
        for i,keys in enumerate(t['unique']):cols.append(f"  UNIQUE KEY `uq_{t['name'][3:]}_{i}` ("+', '.join('`'+x+'`' for x in keys)+')')
        for i,keys in enumerate(t['indexes']):cols.append(f"  KEY `ix_{t['name'][3:]}_{i}` ("+', '.join('`'+x+'`' for x in keys)+')')
        for i,check in enumerate(t['checks']):cols.append(f"  CONSTRAINT `ck_{t['name'][3:]}_{i}` CHECK ({check})")
        lines.append('CREATE TABLE `'+t['name']+'` (\n'+',\n'.join(cols)+'\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;\n')
    for t in TABLES:
        for i,f in enumerate(t['foreignKeys']):
            lines.append(f"ALTER TABLE `{t['name']}` ADD CONSTRAINT `fk_{t['name'][3:]}_{i}` FOREIGN KEY ("+', '.join('`'+x+'`' for x in f['columns'])+') REFERENCES `'+f['target']+'` ('+', '.join('`'+x+'`' for x in f['targetColumns'])+') ON DELETE RESTRICT ON UPDATE RESTRICT;')
    (OUT/'migrations/mysql-candidate/V001__oa_extension_candidate.sql').write_text('\n'.join(lines)+'\n')
    print(json.dumps({'tables':len(TABLES),'columns':sum(len(t['columns']) for t in TABLES),'databaseExecuted':False}))

if __name__=='__main__':main()
