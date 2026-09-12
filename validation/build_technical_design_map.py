"""Project-specific technical mapping; original requirements stay authoritative."""
from pathlib import Path
import json, hashlib, re
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'docs/设计包'
source=BASE/'30-产品设计追踪数据.json';trace=json.loads(source.read_text())
modules={
'WD':('work','本人待办/工作查询，读BPM与协作投影'), 'HR':('system + work','可信人员/任职与当前任务责任'),
'NC':('work + execution','任务配置head与不可变版本'), 'AG':('ai + adoption','数字员工资质、发布版与个人采用'),
'SK':('ai + adoption','技能定义、隔离测试、版本谱系'), 'CN':('integration','连接身份、ToolGate及效果查证'),
'KB':('ai + intelligence','来源、索引、关系候选与发布'), 'MM':('intelligence','本人偏好、经验与受控进化'),
'WS':('infra + context','私有产物版本与授权预览'), 'CV':('execution + context','会话投影、Attempt及检查点'),
'TM':('execution','同一Attempt树的有界子执行'), 'FL':('ai + execution','节点方法/方案版本，非第二OA引擎'),
'AT':('infra + intelligence','调度计划、机会和触发去重'), 'IM':('integration','可信渠道身份、具体工作路由和回执'),
'RS':('contribution + bpm','贡献、独立审核、正式交付与接手'), 'SD':('bpm','原流程设计器、模板、表单和发布'),
'AD':('system + integration','角色/对象/字段/用途授权与撤权'), 'OP':('execution + infra','用量、审计、运行恢复和监控'),
'HC':('work + ai','承担人与本人绑定资源及版本'), 'CX':('context','人员投影与后台输入快照分离'),
'SY':('context + contribution','依据变更传播、版本重核及旧结果失效')}
page_specs=[
('work/inbox','WorkInbox','C01,C02,C15','work'),('work/:workId','WorkShell','C01,C05,C06,C07','work/context'),
('work/:workId/collaboration','CollaborationPanel','C08,C09','contribution'),('work/:workId/config','BindingEditor','C04,C05,C27','work'),
('resources/employees','EmployeeCatalog','C17,C13','ai/adoption'),('resources/skills','SkillCatalog','C17,C13','ai/adoption'),
('resources/connections','ConnectionList','C18','integration'),('knowledge','KnowledgeWorkspace','C19,C29','intelligence'),
('experience','MemoryEvolution','C19,C31','intelligence'),('work/:workId/files','WorkDisplay(files)','C20','infra/context'),
('work/:workId/chat','WorkShell(chat)','C01,C06,C07','execution/context'),('resources/teams','AgentTeam','C21','execution'),
('resources/plans','ExecutionPlan','C17,C21','ai/execution'),('assistance','ProactivePlans','C22,C30','intelligence'),
('channels','ChannelExpert','C23','integration'),('work/:workId/delivery','DeliveryReview','C10,C11,C12','contribution/bpm'),
('admin/processes','ProcessDesigner','C26','bpm'),('admin/organization','OrgPermissions','C24','system'),
('insights','AnalysisOperations','C25,C28','intelligence/execution'),('work/:workId/context','ContextInspector','C05,C16','context'),
('preferences','PersonalPreferences','C15,C27','system/intelligence'),('market','ResourceMarket','C13','adoption')]
command_specs=[
('GET','/work-items','listInbox/getWork；详情 /work-items/{workId}','本人可发现/可见投影','query/cursor；WorkspaceView'),
('POST','/process-instances','startProcess','模板发起资格','definitionVersion/formVersion/intent；实例与任务'),
('POST','/work-items/{workId}/responsibility-commands','claim/release/transfer/delegate','当前任务动作资格','action/expectedRevision/epoch/target；新责任'),
('PATCH','/work-items/{workId}/binding','saveDraft/saveTaskBinding；草稿 /draft','当前承担人与字段权','selectedFields/revision；绑定版本'),
('POST','/work-items/{workId}/context-previews','previewContext/eligibleResources','人员读取/元数据用途','bindingCandidate/purpose；获准预览与缺项'),
('POST','/work-items/{workId}/attempts','startAttempt','当前责任+独立执行用权','epoch/bindingVersion/revision；202/Attempt'),
('POST','/attempts/{attemptId}/controls','controlAttempt','当前Attempt控制权','pause/resume/cancel/expectedRevision；真实状态'),
('POST','/collaborations/commands','request/accept/declineCollaboration','父合同/接收资格','work/recipient/contract/action/version；请求/Link'),
('POST','/contributions/commands','submit/decideContribution','子提交人或父当前承担人','link/version/artifacts/decision；不可变贡献与决定'),
('POST','/reviews/commands','requestReview/decideReview','目标版本+独立审核资格','targetDigest/request/decision；审核任务与回执'),
('POST','/work-items/{workId}/deliveries','submitDelivery；检查 /completion-checks','当前承担人+全守卫','check/approval/epoch/digests；交付或待同步'),
('POST','/handoffs/{packageId}/receipts','receiveHandoff','当前接收责任+必需资料可读','packageVersion/recipientWork/revision；接手回执'),
('POST','/market/adoptions','adoptMarket；目录GET /market','资源可见/复制/引用/使用分判','type/sourceVersion/mode/target；operation/谱系'),
('GET','/operations/{operationId}','queryOperation；查证 POST /reconcile','当前对象查证权','operationRef；确定/未知/待恢复'),
('POST','/notifications/commands','read/remind/withdraw','本人接收项或合法催办/撤回','action/target/version；通知/补偿状态'),
('POST','/facts/commands','propose/confirmBusinessFact','来源维护与范围确认','sourceVersion/oldBaseline/newFacts；新基线'),
('POST','/assets/commands','draft/test/publish/disable/import/export/diff/promote','资源类型的独立动作权','kind/action/version/schemaPayload；测试/发布/操作'),
('POST','/connections/commands','discover/health/authorize/revoke','连接所有人与工具动作权','action/scopes/secretRef；脱敏资格'),
('POST','/knowledge/commands','ingest/process/search/publish；memory修订','来源/记忆的用途与读写权','kind/action/version/sourceRefs；状态/引用'),
('POST','/artifacts/commands','uploadComplete/parse/merge；内容GET版本路径','文件对象/版本/字段/动作权','action/ref/digest/mime；版本或处理状态'),
('POST','/agent-teams/commands','configure/execute/replace/control','当前任务团队与预算范围','action/parentAttempt/members；子执行树'),
('POST','/automation-plans/commands','create/preview/test/pause/resume/trigger','本人计划或限定维护权','action/timezone/scope/limits；计划/触发回执'),
('POST','/integrations/events','channel/expert/A2A/API事件','可信来源+对象映射+动作授权','event/schema/signature/nonce；已受理/去重'),
('POST','/administration/commands','identity/grant/revoke/transfer/privacy','细分管理域与目的','action/target/scope/expiry/version；影响/恢复'),
('GET','/operations-insights','health/usage/audit；恢复用C14/C07','诊断与正文分别授权','range/scope/cursor；真实指标/限制'),
('POST','/process-definitions/commands','draft/check/preview/review/publish','流程设计/发布资格','action/formVersion/definitionVersion；预检/版本'),
('POST','/config-proposals/commands','proposeConfig/applyProposal/undo','原对象的字段写权','action/baseRevision/selectedChanges；差异/变化'),
('POST','/analysis/commands','plan/execute/readResult','只读指标/数据/结果发布范围','question/metric/queryScope/resultRef；计划/结果'),
('POST','/relations/commands','suggest/confirm/readRelated','来源可读/断言确认/结果读取分判','action/sourceVersion/assertionRef；候选/关系'),
('POST','/opportunities/{opportunityId}/commands','accept/dismiss/snooze；列表GET /opportunities','当前接收人与有效事件','action/sourceVersion；原任务草稿/计划引用'),
('POST','/evolution/commands','propose/evaluate/trial/publish/rollback','独立评估/发布权与证据版本','action/baseline/candidate/evidence/trial；真实阶段')]
domains=[{'id':d['id'],'label':d['label'],'module':modules[d['id']][0],'responsibility':modules[d['id']][1]} for d in trace['domains']]
pages=[dict(id=p['id'],label=p['label'],route='/'+v[0],component=v[1],commandIds=v[2].split(','),module=v[3]) for p,v in zip(trace['pages'],page_specs)]
for p in pages:
 p['primaryCommandIds']=p['commandIds']
 p['commandIds']=sorted(set(p['primaryCommandIds'])|{c for kind in ['requirements','aiEnhancements','workspaceRefinements'] for r in trace[kind] if p['id'] in r['pageIds'] for c in r['commandIds']})
commands=[dict(id=f'C{i:02}',method=v[0],path='/oa-api/v1'+v[1],actions=v[2],authorization=v[3],contract=v[4],status='PROPOSED_NOT_IMPLEMENTED') for i,v in enumerate(command_specs,1)]
refs=['docs/设计包/'+n for n in ['37-技术架构总设计与决策.md','38-模块边界与前端工程设计.md','39-数据存储与事务一致性设计.md','40-接口事件与集成技术设计.md','41-AI运行知识分析与安全设计.md','42-部署运维与非功能设计.md','43-技术实施路线与验证矩阵.md']]
rows=[]
for kind in ['requirements','aiEnhancements','workspaceRefinements']:
 for r in trace[kind]:
  rows.append({'id':r['id'],'sourceCollection':kind,'sourceRef':'docs/设计包/30-产品设计追踪数据.json','pageIds':r['pageIds'],'commandIds':r['commandIds'],'caseIds':r.get('caseIds',[]),'module':modules[r['domain']][0] if 'domain'in r else 'cross-domain','technicalRefs':refs,'productEvidence':[],'implementationStatus':'NOT_IMPLEMENTED_IN_THIS_PROJECT'})
x={'schemaVersion':1,'scope':'DERIVED_TECHNICAL_DESIGN_MAP_NOT_NEW_REQUIREMENT_AUTHORITY','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'domains':domains,'pages':pages,'commands':commands,'requirements':rows,'productTestsRun':False}
(ROOT/'validation/technical-design-map.json').write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def render_table(path, marker, table):
 s=path.read_text()
 pattern=re.compile(r'<!-- '+marker+r'_START -->.*?<!-- '+marker+r'_END -->',re.S)
 block='<!-- '+marker+'_START -->\n'+table+'\n<!-- '+marker+'_END -->'
 if pattern.search(s): s=pattern.sub(lambda m:block,s)
 elif '<!-- '+marker+' -->' in s: s=s.replace('<!-- '+marker+' -->',block)
 else: raise ValueError('Missing managed table marker: '+marker)
 if s!=path.read_text(): path.write_text(s)
render_table(BASE/'38-模块边界与前端工程设计.md','DOMAIN_MAPPING','| ID / 领域 | 模块 | 技术责任 |\n|---|---|---|\n'+'\n'.join(f"| {r['id']} / {r['label']} | {r['module']} | {r['responsibility']} |" for r in domains))
render_table(BASE/'38-模块边界与前端工程设计.md','PAGE_MAPPING','| 页面 | 拟议路由 / 组件 | 常用命令 | 数据模块 |\n|---|---|---|---|\n'+'\n'.join(f"| {r['id']} / {r['label']} | {r['route']} / {r['component']} | {', '.join(r['primaryCommandIds'])} | {r['module']} |" for r in pages))
render_table(BASE/'40-接口事件与集成技术设计.md','COMMAND_MAPPING','| 命令 / 动作 | 方法 / 路由 | 授权 | 输入 → 输出重点 |\n|---|---|---|---|\n'+'\n'.join(f"| {r['id']} {r['actions']} | {r['method']} `{r['path'].removeprefix('/oa-api/v1')}` | {r['authorization']} | {r['contract']} |" for r in commands))
print(json.dumps({'requirements':len(rows),'domains':len(domains),'pages':len(pages),'commands':len(commands)}))
