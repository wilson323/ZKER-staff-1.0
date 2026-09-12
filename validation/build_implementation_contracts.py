"""Build design contracts, never install/start/migrate a product. Python stdlib only.

Generated contracts are reviewable design artifacts. Changes to this generator must
be reviewed with the generated diff and the independent contract checker.
"""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'contracts'
SCHEMAS = {}

def save(name, value):
    p = OUT / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def obj(props, required=None):
    return dict(type='object', properties=props,
                required=list(props) if required is None else required,
                additionalProperties=False)

def s(n=2000): return dict(type='string', minLength=1, maxLength=n)
def enum(*values): return dict(type='string', enum=list(values))
def ref(name): return {'$ref': '#/components/schemas/' + name}
def arr(items, minimum=0, maximum=100):
    return dict(type='array', items=items, minItems=minimum, maxItems=maximum, uniqueItems=True)
def define(name, schema): SCHEMAS[name] = schema; return ref(name)

ID = dict(type='string', pattern=r'^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$', minLength=1, maxLength=64)
REV = dict(type='integer', minimum=1, maximum=9007199254740991)
COUNT = dict(type='integer', minimum=0, maximum=9007199254740991)
DATE = dict(type='string', format='date-time', minLength=20, maxLength=35)
DIGEST = dict(type='string', pattern=r'^sha256:[a-f0-9]{64}$')
BOOL = {'type':'boolean'}
KIND = enum('WORK','HUMAN_TASK','BINDING','SNAPSHOT','MANIFEST','BASELINE','ARTIFACT','CONTRIBUTION','REVIEW','DELIVERY','HANDOFF','PROCESS','PROCESS_DEFINITION','FORM','OUTPUT_CONTRACT','AGENT','SKILL','TOOL','CONNECTION','KNOWLEDGE','MEMORY','TEAM','PLAN','PROPOSAL','ANALYSIS','RELATION','OPPORTUNITY','EVALUATION','TRIAL','POLICY','METRIC','INVOCATION','MEMBER','GRANT','NOTIFICATION')
define('VersionedRef',obj({'kind':KIND,'id':ID,'version':REV,'digest':DIGEST}))
VR = ref('VersionedRef')
define('FieldValue',{'oneOf':[
    obj({'fieldKey':ID,'type':{'const':'TEXT'},'value':s(10000)}),
    obj({'fieldKey':ID,'type':{'const':'BOOLEAN'},'value':BOOL}),
    obj({'fieldKey':ID,'type':{'const':'DECIMAL'},'value':dict(type='string',pattern=r'^-?[0-9]{1,16}(\.[0-9]{1,6})?$')}),
    obj({'fieldKey':ID,'type':{'const':'DATE'},'value':dict(type='string',format='date')}),
    obj({'fieldKey':ID,'type':{'const':'MONEY'},'amount':dict(type='string',pattern=r'^[0-9]{1,16}(\.[0-9]{1,2})?$'),'currency':dict(type='string',pattern='^[A-Z]{3}$')})]})
define('Budget',obj({'maxTokens':dict(type='integer',minimum=1,maximum=200000),'maxToolCalls':dict(type='integer',minimum=0,maximum=100),'timeoutSeconds':dict(type='integer',minimum=1,maximum=3600)}))
define('Error',obj({'code':enum('INVALID_REQUEST','UNAUTHENTICATED','FORBIDDEN','NOT_FOUND','REVISION_CONFLICT','EPOCH_STALE','SOURCE_STALE','IDEMPOTENCY_CONFLICT','CURSOR_EXPIRED','MISSING_INPUT','REVIEW_REQUIRED','SELF_REVIEW_DENIED','ACCESS_REVOKED','RATE_LIMITED','DEPENDENCY_UNAVAILABLE','RESULT_UNKNOWN'),
    'message':s(500),'requestId':ID,'retryable':BOOL,'recoveryAction':enum('SIGN_IN','REFRESH','RECHECK','RESELECT','RECONCILE','RETRY_READ','CONTACT_OWNER','NONE'),
    'fieldErrors':arr(obj({'field':s(120),'code':ID,'message':s(200)}))}))
define('Operation',obj({'operationId':ID,'status':enum('QUEUED','PENDING_COMMIT','CONFIRMED','FAILED','UNKNOWN'),
    'revision':REV,'resourceRefs':arr(VR),'allowedActions':arr(enum('READ','RECONCILE','CANCEL')),'requestId':ID}))
define('WorkCard',obj({'id':ID,'title':s(200),'scope':enum('PROCESS','AD_HOC'),'processInstanceId':{'type':['string','null'],'maxLength':64},'humanTaskId':ID,'state':enum('READY','IN_PROGRESS','AWAITING_REVIEW','READY_TO_COMMIT','COMMITTED','CANCELLED'),
    'revision':REV,'responsibilityEpoch':REV,'allowedActions':arr(enum('OPEN','CLAIM','CONFIGURE','START','COLLABORATE','REVIEW','SUBMIT','RECEIVE'))}))
define('ArtifactCard',obj({'ref':VR,'name':s(255),'mediaType':s(100),'sizeBytes':COUNT,'releaseId':ID,'allowedActions':arr(enum('PREVIEW','DOWNLOAD','COMPARE','REFERENCE'))}))
define('PathNode',{'oneOf':[
    obj({'projection':{'const':'PATH_ONLY'},'nodeId':ID,'stage':enum('PENDING','ACTIVE','DONE','BLOCKED'),'label':{'const':'受限节点'}}),
    obj({'projection':{'const':'CONTENT_ALLOWED'},'nodeId':ID,'stage':enum('PENDING','ACTIVE','DONE','BLOCKED'),'label':s(160),'artifactRefs':arr(VR),'summaryRef':VR},['projection','nodeId','stage','label'])]})
define('PathEdge',obj({'id':ID,'fromNodeId':ID,'toNodeId':ID,'kind':enum('MAIN','CONTRIBUTION','REVIEW','HANDOFF')}))
define('ThreadEntry',obj({'id':ID,'kind':enum('USER_MESSAGE','RELEASED_SUMMARY','SYSTEM_STATUS','RELEASED_ARTIFACT'),'text':s(10000),'createdAt':DATE,'sourceRefs':arr(VR),'releaseId':ID}))
define('WorkspaceView',obj({'work':ref('WorkCard'),'subjectId':ID,'tenantId':ID,'purpose':s(200),'requestGeneration':ID,'expiresAt':DATE,'projectionRevision':REV,'authzEpoch':REV,'policyRevision':REV,
    'path':arr(ref('PathNode'),0,500),'edges':arr(ref('PathEdge'),0,1000),'artifacts':arr(ref('ArtifactCard')),'thread':arr(ref('ThreadEntry')),
    'sourceWatermark':ID,'eventCursor':s(1024),'nextThreadCursor':{'type':['string','null'],'maxLength':1024}}))
define('WorkList',obj({'items':arr(ref('WorkCard')),'nextCursor':{'type':['string','null'],'maxLength':1024},'sourceWatermark':ID}))
define('ResourceList',obj({'items':arr(obj({'ref':VR,'label':s(200),'allowedActions':arr(enum('READ','USE','COPY','EDIT','PUBLISH','REVOKE'))})),'nextCursor':{'type':['string','null'],'maxLength':1024}}))
ATTEMPT_STATES=['QUEUED','PREPARING','RUNNING','WAITING_HUMAN','PAUSED','SUCCEEDED','FAILED','CANCEL_REQUESTED','CANCELLED','RESULT_UNKNOWN']
define('AttemptView',obj({'id':ID,'workId':ID,'status':enum(*ATTEMPT_STATES),'revision':REV,'operationId':ID,'allowedActions':arr(enum('READ','PAUSE','RESUME','CANCEL','RECONCILE'))}))
define('CompletionCheck',obj({'id':ID,'workId':ID,'responsibilityEpoch':REV,'workRevision':REV,'candidateDigest':DIGEST,'baselineDigest':DIGEST,
    'expiresAt':DATE,'ready':BOOL,'blockers':arr(obj({'code':enum('MISSING_INPUT','SOURCE_STALE','REVIEW_REQUIRED','ACCESS_REVOKED','ATTEMPT_UNCERTAIN'),'message':s(300)}))}))
define('ContextPreview',obj({'id':ID,'workId':ID,'bindingVersion':REV,'expiresAt':DATE,'visibleSources':arr(VR),
    'missingRequirements':arr(s(100)),'usable':BOOL,'projectionRevision':REV}))
define('Binding',obj({'id':ID,'workId':ID,'humanTaskId':ID,'mode':enum('MANUAL','ASSISTED','AUTONOMOUS'),'version':REV,'revision':REV,'workRevision':REV,'responsibilityEpoch':REV,'state':enum('DRAFT','ACTIVE','SUPERSEDED','REVOKED','CLOSED')}))

OPERATIONS=[]
def operation(group, action, method, path, fields=None, result='Operation', phase='M2', auth='OBJECT_ACTION', required=None):
    opid=group+'_'+action
    reqname=opid+'Request'
    if fields is not None:
        props={'command':{'const':group+'.'+action},**fields}
        define(reqname,obj(props,None if required is None else ['command']+required))
    OPERATIONS.append(dict(id=opid,commandId=group,action=action,method=method,path=path,requestSchema=reqname if fields is not None else None,
                           responseSchema=result,phase=phase,authorization=auth,implementationStatus='NOT_IMPLEMENTED'))

GUARD={'expectedRevision':REV,'responsibilityEpoch':REV}
TARGET={'targetRef':VR,'expectedRevision':REV}
operation('C01','listInbox','get','/work-items',result='WorkList',phase='M1',auth='CURRENT_MEMBER_DISCOVER')
operation('C01','getWork','get','/work-items/{workId}',result='WorkspaceView',phase='M1',auth='WORK_DISCOVER_AND_FIELD_READ')
operation('C02','startProcess','post','/process-instances',{'definitionRef':VR,'formRef':VR,'intent':s(2000),'fields':arr(ref('FieldValue'),0,100)},phase='M1',auth='DEFINITION_INITIATE')
for a in ['claim','release','transfer','delegate']:
    fields={**GUARD,'humanTaskId':ID}
    if a in ['transfer','delegate']:fields.update(targetMemberId=ID,reason=s(500))
    operation('C03',a,'post','/work-items/{workId}/responsibility-commands',fields,phase='M1',auth='CURRENT_HUMAN_TASK_ACTION')
for a,path in [('saveDraft','/work-items/{workId}/draft'),('saveTaskBinding','/work-items/{workId}/binding')]:
    fields={**GUARD,'humanTaskId':ID,'mode':enum('MANUAL','ASSISTED','AUTONOMOUS'),'resourceRefs':arr(VR),'outputFormat':enum('DOCUMENT','CHECKLIST','TABLE'),'outputContractRef':VR,'budget':ref('Budget')}
    operation('C04',a,'patch',path,fields,result='Binding',phase='M1',auth='CURRENT_ASSIGNEE_AND_FIELD_WRITE')
operation('C05','previewContext','post','/work-items/{workId}/context-previews',{**GUARD,'bindingVersion':REV,'purpose':s(200)},result='ContextPreview',phase='M1',auth='HUMAN_READ_PROJECTION')
operation('C05','eligibleResources','get','/work-items/{workId}/eligible-resources',result='ResourceList',phase='M1',auth='RESOURCE_DISCOVER_AND_USE')
operation('C06','startAttempt','post','/work-items/{workId}/attempts',{**GUARD,'bindingVersion':REV,'contextPreviewId':ID,'executionMode':enum('ASSISTED','AUTONOMOUS'),'outputContractRef':VR},result='AttemptView',phase='M1',auth='ASSIGNEE_AND_EXECUTION_GRANT')
for a in ['pause','resume','cancel']:
    operation('C07',a,'post','/attempts/{attemptId}/controls',{'expectedRevision':REV,'reason':s(500)},result='AttemptView',phase='M1',auth='ATTEMPT_CONTROL_SUPPORTED_BY_SDK')
for a in ['request','accept','decline']:
    fields={'workId':ID,**GUARD,'recipientMemberId':ID,'outputContractRef':VR,'dueAt':DATE} if a=='request' else {**TARGET,'reason':s(500)}
    operation('C08',a,'post','/collaborations/commands',fields,auth='PARENT_CONTRACT_OR_RECIPIENT')
operation('C09','submit','post','/contributions/commands',{'linkRef':VR,**GUARD,'artifactRefs':arr(VR,1),'baselineRef':VR},auth='CHILD_ASSIGNEE')
operation('C09','decide','post','/contributions/commands',{**TARGET,'decision':enum('ACCEPT','RETURN'),'reason':s(500),'baselineRef':VR},auth='PARENT_ASSIGNEE')
operation('C10','requestReview','post','/reviews/commands',{'workId':ID,**GUARD,'candidateRef':VR,'reviewerMemberId':ID,'baselineRef':VR},phase='M1',auth='REVIEW_REQUEST')
operation('C10','decideReview','post','/reviews/commands',{**TARGET,'decision':enum('APPROVE','REJECT','RETURN'),'reason':s(500),'candidateDigest':DIGEST},phase='M1',auth='INDEPENDENT_REVIEWER')
operation('C11','checkCompletion','post','/work-items/{workId}/completion-checks',{**GUARD,'artifactRefs':arr(VR,1),'baselineRef':VR,'approvalRefs':arr(VR)},result='CompletionCheck',phase='M1',auth='CURRENT_ASSIGNEE')
define('DeliveryProvenance',{'oneOf':[obj({'mode':{'const':'MANUAL'},'note':s(1000),'evidenceRefs':arr(VR,1)}),obj({'mode':{'const':'AI'},'attemptId':ID,'attemptFence':REV,'snapshotRef':VR})]})
operation('C11','submitDelivery','post','/work-items/{workId}/deliveries',{**GUARD,'completionCheckId':ID,'artifactRefs':arr(VR,1),'artifactSetDigest':DIGEST,'baselineRef':VR,'approvalRefs':arr(VR),'provenance':ref('DeliveryProvenance')},phase='M1',auth='CURRENT_ASSIGNEE_AND_ALL_GUARDS')
operation('C12','receiveHandoff','post','/handoffs/{packageId}/receipts',{'packageVersion':REV,'recipientWorkId':ID,**GUARD},phase='M1',auth='CURRENT_RECIPIENT_AND_REQUIRED_INPUT_READ')
operation('C13','listMarket','get','/market',result='ResourceList',auth='RESOURCE_DISCOVER')
operation('C13','adoptMarket','post','/market/adoptions',{'sourceRef':VR,'mode':enum('COPY_AND_USE','COPY_AND_EDIT','REFERENCE'),'targetWorkId':ID,'expectedRevision':REV},auth='DISCOVER_COPY_USE_SEPARATELY')
operation('C14','queryOperation','get','/operations/{operationId}',phase='M1',auth='OPERATION_OWNER_OR_SCOPED_RECOVERY')
operation('C14','reconcile','post','/operations/{operationId}/reconcile',{'expectedRevision':REV,'evidenceRefs':arr(VR)},phase='M1',auth='SCOPED_RECOVERY_NO_REDISPATCH')
for a in ['read','remind','withdraw']:
    operation('C15',a,'post','/notifications/commands',{**TARGET,'reason':s(500)},phase='M1',auth='RECIPIENT_OR_WORK_ACTION')
operation('C15','appendWorkMessage','post','/work-items/{workId}/messages',{**GUARD,'text':s(10000),'attachmentRefs':arr(VR)},result='Operation',phase='M1',auth='CURRENT_WORK_CONVERSATION_WRITE_AND_SOURCE_REFERENCE')
operation('C15','saveMessageDraft','patch','/work-items/{workId}/message-draft',{**GUARD,'text':{'type':'string','maxLength':10000}},result='Operation',phase='M1',auth='CURRENT_SUBJECT_DRAFT_ONLY')
for a in ['propose','confirm']:
    operation('C16',a,'post','/facts/commands',{'workId':ID,**GUARD,'baselineRef':{'oneOf':[VR,{'type':'null'}]},'sourceRefs':arr(VR,1),'facts':arr(ref('FieldValue'),1)},phase='M1',auth='SOURCE_WRITE_OR_BASELINE_CONFIRM')

# Typed asset versions: extension fields must be represented by a versioned
# JSON Schema, not injected through a generic command payload.
define('AssetDraft',obj({'kind':enum('AGENT','SKILL','TOOL','PLAN'),'name':s(120),'description':s(4000),'inputSchemaRef':VR,'outputSchemaRef':VR,
    'instructions':s(20000),'dependencyRefs':arr(VR),'capabilityRefs':arr(VR),'budget':ref('Budget')}))
for a in ['draft','test','publish','disable','import','export','diff','promote']:
    fields={'draft':ref('AssetDraft')} if a=='draft' else {**TARGET}
    if a in ['test','publish','promote']:fields['evidenceRefs']=arr(VR,1)
    if a=='import':fields={'artifactRef':VR,'targetScopeRef':VR}
    if a=='diff':fields['compareRef']=VR
    operation('C17',a,'post','/assets/commands',fields,auth='ASSET_KIND_ACTION')
for a in ['discover','health','authorize','revoke']:
    fields={'providerId':ID} if a=='discover' else {**TARGET}
    if a=='authorize':fields.update(requestedActionIds=arr(ID,1),returnPath=enum('TOOLS','CURRENT_WORK'))
    if a=='revoke':fields['reason']=s(500)
    operation('C18',a,'post','/connections/commands',fields,auth='CONNECTION_OWNER_AND_SCOPE')
for a in ['ingest','process','search','publish','reviseMemory']:
    fields={**TARGET}
    if a=='ingest':fields={'sourceArtifactRefs':arr(VR,1),'purpose':s(200),'scope':enum('PERSONAL','WORK','TEAM','ORGANIZATION')}
    if a=='search':fields={'query':s(2000),'workId':ID,'sourceRefs':arr(VR),'limit':dict(type='integer',minimum=1,maximum=50)}
    if a in ['publish','reviseMemory']:fields.update(sourceRefs=arr(VR,1),evidenceRefs=arr(VR,1))
    operation('C19',a,'post','/knowledge/commands',fields,phase='M3',auth='SOURCE_PURPOSE_AND_OUTPUT_READ')
define('UploadTicket',obj({'uploadId':ID,'expiresAt':DATE,'maxBytes':COUNT,'uploadPath':dict(type='string',pattern=r'^/oa-api/v1/uploads/[A-Za-z0-9_-]+$')}))
operation('C20','prepareUpload','post','/artifacts/uploads',{'workId':ID,**GUARD,'fileName':s(255),'mediaType':s(100),'sizeBytes':dict(type='integer',minimum=1,maximum=52428800)},result='UploadTicket',phase='M1',auth='WORK_ARTIFACT_WRITE')
operation('C20','uploadComplete','post','/artifacts/commands',{'workId':ID,**GUARD,'uploadId':ID,'digest':DIGEST},phase='M1',auth='UPLOAD_OWNER_AND_ACTUAL_OBJECT_VERIFY')
for a in ['parse','merge']:
    operation('C20',a,'post','/artifacts/commands',{'workId':ID,**GUARD,'sourceRefs':arr(VR,1),'outputContractRef':VR},auth='ALL_SOURCE_READ_AND_WORK_WRITE')
operation('C20','readContent','get','/artifacts/{artifactId}/versions/{version}/content',result='Binary',phase='M1',auth='EXACT_VERSION_DOWNLOAD_CURRENT_POLICY')
for a in ['configure','execute','replace','control']:
    fields={'workId':ID,**GUARD,'teamRef':VR}
    if a=='configure':fields.update(memberRefs=arr(VR,1,10),budget=ref('Budget'))
    if a=='execute':fields['parentAttemptId']=ID
    if a=='replace':fields.update(oldMemberRef=VR,newMemberRef=VR)
    if a=='control':fields.update(attemptId=ID,control=enum('PAUSE','RESUME','CANCEL'))
    operation('C21',a,'post','/agent-teams/commands',fields,phase='M3',auth='WORK_TEAM_BOUND_GRANTS')
define('Schedule',obj({'timezone':s(64),'frequency':enum('DAILY','WEEKLY','ONCE'),'localTime':dict(type='string',pattern=r'^([01][0-9]|2[0-3]):[0-5][0-9]$'),'weekdays':arr(dict(type='integer',minimum=1,maximum=7),0,7),'startsAt':DATE,'endsAt':DATE,'maxConcurrent':{'type':'integer','const':1},'misfire':enum('SKIP','ONCE_WITHIN_GRACE')}))
for a in ['create','preview','test','pause','resume','trigger']:
    fields={'workId':ID,'definitionRef':VR,'schedule':ref('Schedule'),'budget':ref('Budget')} if a=='create' else {**TARGET}
    operation('C22',a,'post','/automation-plans/commands',fields,phase='M4',auth='PLAN_OWNER_BOUNDED_EXECUTION')
operation('C23','receiveEvent','post','/integrations/events',{'sourceId':ID,'eventId':ID,'occurredAt':DATE,'kind':enum('CHANNEL_MESSAGE','EXPERT_REPLY','ACTION_RECEIPT'),'workRef':VR,'payloadArtifactRef':VR},phase='M4',auth='SIGNED_SOURCE_AND_MAPPED_MEMBER')
for a in ['identity','grant','revoke','transfer','privacy']:
    fields={**TARGET,'purpose':s(300)}
    if a=='identity':fields['memberState']=enum('ACTIVE','SUSPENDED')
    if a=='grant':fields.update(subjectRef=VR,actions=arr(ID,1),expiresAt=DATE,scopeRef=VR)
    if a=='transfer':fields.update(targetMemberId=ID,workIds=arr(ID,1))
    if a=='privacy':fields['requestKind']=enum('EXPORT_OWN','RECTIFY','REQUEST_ERASURE')
    operation('C24',a,'post','/administration/commands',fields,phase='M2',auth='SPECIFIC_ADMIN_DOMAIN_NO_SUPERUSER_ASSUMPTION')
operation('C25','readInsights','get','/operations-insights',result='ResourceList',phase='M2',auth='SCOPED_DIAGNOSTICS_NOT_CONTENT')
for a in ['draft','check','preview','review','publish']:
    fields={**TARGET}
    if a=='draft':fields={'name':s(120),'formRef':VR,'definitionArtifactRef':VR,'nodeContractRefs':arr(VR,1)}
    if a in ['review','publish']:fields['evidenceRefs']=arr(VR,1)
    operation('C26',a,'post','/process-definitions/commands',fields,phase='M2',auth='DESIGNER_OR_INDEPENDENT_PUBLISHER')
define('ConfigChange',{'oneOf':[
    obj({'fieldPath':{'const':'outputFormat'},'value':enum('DOCUMENT','CHECKLIST','TABLE')}),
    obj({'fieldPath':{'const':'executionMode'},'value':enum('MANUAL','ASSISTED','AUTONOMOUS')}),
    obj({'fieldPath':{'const':'agentVersionRef'},'value':VR}),
    obj({'fieldPath':{'const':'budget'},'value':ref('Budget')})]})
for a in ['proposeConfig','applyProposal','undo']:
    fields={**TARGET,'scope':enum('CURRENT_WORK','PERSONAL_PREFERENCE')}
    if a=='proposeConfig':fields['goal']=s(2000)
    if a=='applyProposal':fields.update(selectedChanges=arr(ref('ConfigChange'),1,4),baseRevision=REV)
    if a=='undo':fields.update(mutationId=ID,baseRevision=REV)
    operation('C27',a,'post','/config-proposals/commands',fields,phase='M3',auth='ORIGINAL_OBJECT_FIELD_WRITE')
define('AnalysisQuery',obj({'question':s(2000),'metricRef':VR,'grain':enum('DAY','WEEK','MONTH'),'timeField':ID,'startAt':DATE,'endAt':DATE,'timezone':s(64),'filters':arr(ref('FieldValue')),'limit':dict(type='integer',minimum=1,maximum=1000)}))
for a in ['plan','execute','readResult']:
    operation('C28',a,'post','/analysis/commands',{'query':ref('AnalysisQuery')} if a=='plan' else {**TARGET},phase='M3',auth='METRIC_ROW_COLUMN_READ_AND_OUTPUT_RELEASE')
for a in ['suggest','confirm','readRelated']:
    operation('C29',a,'post','/relations/commands',{'sourceRefs':arr(VR,1),'purpose':s(200)} if a=='suggest' else {**TARGET},phase='M3',auth='SOURCE_READ_ASSERTION_CONFIRM_RESULT_READ')
operation('C30','listOpportunities','get','/opportunities',result='ResourceList',phase='M4',auth='CURRENT_RECIPIENT')
for a in ['accept','dismiss','snooze']:
    fields={**TARGET,'sourceVersion':REV}
    if a=='snooze':fields['until']=DATE
    operation('C30',a,'post','/opportunities/{opportunityId}/commands',fields,phase='M4',auth='CURRENT_RECIPIENT_VALID_SIGNAL')
for a in ['propose','evaluate','trial','publish','rollback']:
    fields={**TARGET,'baselineRef':VR,'candidateRef':VR}
    if a!='propose':fields['evidenceRefs']=arr(VR,1)
    if a=='trial':fields.update(scopeRef=VR,expiresAt=DATE,budget=ref('Budget'))
    if a=='rollback':fields['publicationRef']=VR
    operation('C31',a,'post','/evolution/commands',fields,phase='M5',auth='VERSION_BOUND_EVALUATION_AND_INDEPENDENT_PUBLICATION')

def build_api():
    paths={}
    for op in OPERATIONS:
        item=paths.setdefault(op['path'],{}).setdefault(op['method'],{'tags':[op['commandId']],
            'operationId':op['id'],'summary':op['commandId']+' '+op['action'],'x-design-status':'NOT_IMPLEMENTED','x-actions':[],
            'parameters':[],'responses':{},'security':[{'sessionCookie':[]}]})
        item['x-actions'].append(op['id'])
        item.setdefault('x-authorization',[]).append(op['authorization'])
        for name in re.findall(r'\{([^}]+)\}',op['path']):
            param={'name':name,'in':'path','required':True,'schema':REV if name=='version' else KIND if name=='kind' else ID}
            if param not in item['parameters']:item['parameters'].append(param)
        if op['method']=='get' and '{' not in op['path']:
            item['parameters']=[{'name':'cursor','in':'query','schema':s(1024)},{'name':'limit','in':'query','schema':dict(type='integer',minimum=1,maximum=100,default=20)}]
            filters={
                'C01_listInbox':{'query':s(200),'state':enum('READY','IN_PROGRESS','AWAITING_REVIEW','READY_TO_COMMIT','COMMITTED','CANCELLED'),'processInstanceId':ID,'responsibility':enum('CANDIDATE','ASSIGNEE','COLLABORATOR','REVIEWER','RECIPIENT'),'dueBefore':DATE},
                'C13_listMarket':{'query':s(200),'kind':enum('AGENT','SKILL','TOOL'),'availability':enum('USABLE','NEEDS_CONFIGURATION')},
                'C25_readInsights':{'startAt':DATE,'endAt':DATE,'scopeId':ID,'kind':enum('HEALTH','USAGE','AUDIT')},
                'C30_listOpportunities':{'state':enum('PENDING','ACCEPTED','DISMISSED','SNOOZED','EXPIRED','INVALIDATED')}
            }.get(op['id'],{})
            item['parameters'] += [{'name':n,'in':'query','schema':v} for n,v in filters.items()]
        if op['id']=='C01_getWork':
            item['parameters'].append({'name':'X-Request-Generation','in':'header','required':True,'schema':ID,'description':'客户端请求代次回显，不作为权限证据'})
        if op['requestSchema']:
            for name in ['Idempotency-Key','X-CSRF-Token']:
                param={'name':name,'in':'header','required':True,'schema':s(128)}
                if param not in item['parameters']:item['parameters'].append(param)
            body=item.setdefault('requestBody',{'required':True,'content':{'application/json':{'schema':{'oneOf':[]}}}})
            body['content']['application/json']['schema']['oneOf'].append(ref(op['requestSchema']))
        code='200' if op['method']=='get' or op['responseSchema'] in ['Binding','CompletionCheck','ContextPreview','UploadTicket'] else '202'
        content={'application/octet-stream':{'schema':{'type':'string','format':'binary'}}} if op['responseSchema']=='Binary' else {'application/json':{'schema':ref(op['responseSchema'])}}
        item['responses'][code]={'description':'授权投影或已受理操作；202不代表业务完成','content':content}
        if op['responseSchema']=='Operation' and op['method']!='get':
            item['responses']['200']={'description':'同步确定结果或同幂等意图已完成的结果；仍检查Operation.status','content':content}
        for error in ['400','401','403','404','409','422','429','503']:
            item['responses'][error]={'description':'按48号错误表恢复；禁止暴露受限对象存在性','content':{'application/json':{'schema':ref('Error')}}}
    # Binary upload consumes a bounded ticket; never trust an uploadComplete claim.
    paths['/uploads/{uploadId}']={'put':{'operationId':'C20_uploadBytes','tags':['C20'],'summary':'上传原始字节至隔离区','x-design-status':'NOT_IMPLEMENTED',
        'security':[{'sessionCookie':[]}],'parameters':[{'name':'uploadId','in':'path','required':True,'schema':ID},{'name':'X-CSRF-Token','in':'header','required':True,'schema':s(128)}],
        'requestBody':{'required':True,'content':{'application/octet-stream':{'schema':{'type':'string','format':'binary'}}}},
        'responses':{'204':{'description':'隔离区收到字节；还须服务端校验、扫描和uploadComplete'},'403':{'description':'票据无效或越权'},'413':{'description':'超过票据或50MiB限制'},'409':{'description':'同票据不同字节'}}}}
    paths['/work-items/{workId}/events']={'get':{'operationId':'C01_watchWork','tags':['C01'],'summary':'仅授权投影SSE，断线不重启任务','x-design-status':'NOT_IMPLEMENTED',
        'security':[{'sessionCookie':[]}],'parameters':[{'name':'workId','in':'path','required':True,'schema':ID},{'name':'Last-Event-ID','in':'header','schema':s(1024)}],
        'responses':{'200':{'description':'event: projection; data遵循events.schema.json的PublicEvent；游标过期发reset事件','content':{'text/event-stream':{'schema':{'type':'string'}}}},'401':{'description':'会话失效'},'404':{'description':'不可发现'},'409':{'description':'投影或权限代次失效，重新取快照'}}}}
    webhook=paths['/integrations/events']['post']
    webhook['security']=[{'integrationSignature':[]}]
    webhook['parameters']=[p for p in webhook['parameters'] if p['name']!='X-CSRF-Token']
    webhook['parameters'] += [{'name':name,'in':'header','required':True,'schema':s(256)} for name in ['X-Integration-Key-Id','X-Integration-Timestamp','X-Integration-Nonce','X-Integration-Signature']]
    download=paths['/artifacts/{artifactId}/versions/{version}/content']['get']
    download['parameters'].append({'name':'Range','in':'header','schema':dict(type='string',pattern=r'^bytes=[0-9]+-[0-9]*$')})
    download['responses']['206']={'description':'授权后单Range响应','content':{'application/octet-stream':{'schema':{'type':'string','format':'binary'}}}}
    download['responses']['416']={'description':'Range不满足；不得跳过授权提前透露长度'}
    return {'openapi':'3.1.1','info':{'title':'OA数字员工协作平台设计合同','version':'0.1.0-design','description':'接口设计快照；无运行端点；身份/外层封装由M0唯一adapter对齐。'},
        'jsonSchemaDialect':'https://json-schema.org/draft/2020-12/schema','servers':[{'url':'/oa-api/v1'}],
        'tags':[{'name':f'C{i:02}'} for i in range(1,32)],'paths':paths,
        'components':{'securitySchemes':{'sessionCookie':{'type':'apiKey','in':'cookie','name':'OA_SESSION','description':'候选同源会话名；M0映射底座现有会话，禁止新增身份系统'},
            'integrationSignature':{'type':'apiKey','in':'header','name':'X-Integration-Signature','description':'注册来源密钥签名原始字节；时间窗/nonce/来源与对象关联同时验证；不是人员会话'}},'schemas':SCHEMAS}}

def local_refs(x):
    if isinstance(x,dict):return {k:(v.replace('#/components/schemas/','#/$defs/') if k=='$ref' else local_refs(v)) for k,v in x.items()}
    if isinstance(x,list):return [local_refs(i) for i in x]
    return x

def sample(schema):
    if '$ref' in schema:return sample(SCHEMAS[schema['$ref'].split('/')[-1]])
    if 'const' in schema:return schema['const']
    if 'enum' in schema:return schema['enum'][0]
    if 'oneOf' in schema:return sample(schema['oneOf'][0])
    t=schema.get('type');t=t[0] if isinstance(t,list) else t
    if t=='object':return {k:sample(schema['properties'][k]) for k in schema['required']}
    if t=='array':return [sample(schema['items']) for _ in range(schema.get('minItems',0))]
    if t=='integer':return schema.get('minimum',0)
    if t=='boolean':return False
    if t=='null':return None
    if schema.get('format')=='date-time':return '2026-09-11T12:00:00Z'
    if schema.get('format')=='date':return '2026-09-11'
    pattern=schema.get('pattern','')
    if pattern.startswith('^sha256'):return 'sha256:'+'a'*64
    if 'A-Z]{3}' in pattern:return 'CNY'
    if '[01][0-9]' in pattern:return '09:00'
    if '/oa-api' in pattern:return '/oa-api/v1/uploads/demo_upload'
    if '[0-9]{1,16}' in pattern:return '1.00'
    if schema.get('const'):return schema['const']
    return 'demo'

def main():
    define('AnalysisResult',obj({'ref':VR,'queryStatus':enum('SUCCEEDED','NO_DATA','FAILED','STALE'),'sampleCount':COUNT,'metricRef':VR,
        'value':{'type':['string','null'],'maxLength':100},'unit':s(50),'snapshotAt':DATE,'timezone':s(64),'sourceRefs':arr(VR),'detailArtifactRef':VR},
        ['ref','queryStatus','sampleCount','metricRef','value','unit','snapshotAt','timezone','sourceRefs']))
    define('VersionResourceView',obj({'ref':VR,'label':s(200),'state':s(32),'releaseId':ID,'view':{'oneOf':[
        obj({'type':{'const':'ASSET'},'content':ref('AssetDraft')}),
        obj({'type':{'const':'ANALYSIS'},'content':ref('AnalysisResult')}),
        obj({'type':{'const':'DOCUMENT'},'artifact':ref('ArtifactCard')}),
        obj({'type':{'const':'SUMMARY'},'summary':s(5000),'sourceRefs':arr(VR)})]}}))
    operation('C01','readVersionResource','get','/resources/{kind}/{resourceId}/versions/{version}',result='VersionResourceView',phase='M2',auth='EXACT_VERSION_AND_ALL_RETURNED_FIELDS_READ_RELEASE')
    define('ExecutionGrant',obj({'executionSubjectId':ID,'grantedBy':ID,'workId':ID,'purpose':s(200),
        'inputRefs':arr(VR,1),'fieldPaths':arr(s(120)),'allowedDestinations':arr(ID,1),'actions':arr(ID,1),
        'expiresAt':DATE,'budget':ref('Budget'),'outputPolicyRef':VR,'revision':REV}))
    define('RelationAssertion',obj({'subjectRef':VR,'predicate':ID,'objectRef':VR,'sourceRefs':arr(VR,1),'state':enum('PROPOSED','CONFIRMED','DISPUTED','SUPERSEDED','REVOKED'),
        'scopeRef':VR,'confidence':dict(type='number',minimum=0,maximum=1),'validFrom':DATE,'validUntil':DATE}))
    define('Opportunity',obj({'recipientMemberId':ID,'workRef':VR,'sourceRefs':arr(VR,1),'dedupeKey':ID,'reason':s(500),
        'state':enum('PENDING','ACCEPTED','DISMISSED','SNOOZED','EXPIRED','INVALIDATED'),'expiresAt':DATE,'cooldownSeconds':dict(type='integer',minimum=60,maximum=2592000),
        'suggestedAction':enum('OPEN_WORK','PREPARE_DRAFT','SUGGEST_PLAN')}))
    define('EvolutionProposal',obj({'baselineRef':VR,'candidateRef':VR,'testSetRef':VR,'modelRef':VR,'toolRefs':arr(VR),'policyRef':VR,
        'sourceFeedbackRefs':arr(VR,1),'intendedEffect':s(1000),'state':enum('PROPOSED','EVALUATING','EVALUATED','REVIEW_REQUIRED','TRIALING','PUBLISHED','REJECTED','ROLLED_BACK','STALE'),
        'evaluationRefs':arr(VR),'trialRefs':arr(VR),'publicationRef':VR,'rollbackTargetRef':VR},
        ['baselineRef','candidateRef','testSetRef','modelRef','toolRefs','policyRef','sourceFeedbackRefs','intendedEffect','state','evaluationRefs','trialRefs']))
    api=build_api();save('openapi.json',api)
    save('domain.schema.json',{'$schema':'https://json-schema.org/draft/2020-12/schema','$defs':local_refs(SCHEMAS)})
    save('command-catalog.json',{'status':'DESIGN_CONTRACT_NOT_IMPLEMENTED','basePath':'/oa-api/v1','operations':OPERATIONS})
    cases=[]
    for op in OPERATIONS:
        if not op['requestSchema']:continue
        n=op['requestSchema'];v=sample(SCHEMAS[n])
        cases.append({'id':op['id']+'_valid','schema':n,'valid':True,'input':v})
        cases.append({'id':op['id']+'_reject_subject_injection','schema':n,'valid':False,'input':{**v,'tenantId':'evil_tenant'}})
        bad=dict(v);bad.pop('command')
        cases.append({'id':op['id']+'_missing_command','schema':n,'valid':False,'input':bad})
    save('fixtures/requests.json',{'scope':'SYNTHETIC_SCHEMA_ONLY_NOT_AUTHORIZATION_TEST','cases':cases})
    event_defs=local_refs(SCHEMAS)
    public_types=['WorkResponsibilityChanged','BindingInvalidated','AttemptStateChanged','ToolEffectUncertain','ContextChanged','ContributionDecided','ReviewDecided','DeliveryConfirmed','HandoffReceived','ResourceAccessChanged','UsageSettled']
    event_defs['PublicEvent']=obj({'eventId':ID,'schemaVersion':{'const':1},'type':enum(*public_types),'workId':ID,'sequence':REV,
        'sourceRevision':REV,'projectionRevision':REV,'authzEpoch':REV,'occurredAt':DATE,'cursor':s(1024),
        'data':obj({'action':enum('REFETCH_AUTHORIZED_SNAPSHOT','CLEAR_AND_REAUTHORIZE'),'publicStage':enum('CHANGED','REVOKED','UNKNOWN')})})
    event_defs['ResetEvent']=obj({'type':{'const':'reset'},'reason':enum('CURSOR_EXPIRED','POLICY_CHANGED','GAP'),'snapshotRequired':{'const':True}})
    event_defs['InternalEvent']=obj({'eventId':ID,'source':ID,'tenantId':ID,'schemaVersion':{'const':1},'type':enum(*public_types),
        'aggregateId':ID,'aggregateKind':KIND,'sequence':REV,'sourceRevision':REV,'occurredAt':DATE,'correlationId':ID,'causationId':ID,
        'data':obj({'recordRef':local_refs(VR),'responsibilityEpoch':REV})})
    save('events.schema.json',{'$schema':'https://json-schema.org/draft/2020-12/schema','$defs':event_defs,'oneOf':[{'$ref':'#/$defs/PublicEvent'},{'$ref':'#/$defs/ResetEvent'}]})
    internal_defs=local_refs(SCHEMAS)
    internal_defs['InternalEvent']=event_defs['InternalEvent']
    internal_defs['ContextSources']=arr(obj({'ref':local_refs(VR),'purpose':s(200),'required':BOOL,'fieldPaths':arr(s(120))}),1)
    save('internal.schema.json',{'$schema':'https://json-schema.org/draft/2020-12/schema','$defs':internal_defs})
    # Also publish the named internal event definition for dictionary references;
    # it is never part of a public response schema or SSE union.
    domain=local_refs(SCHEMAS);domain['InternalEvent']=event_defs['InternalEvent']
    save('domain.schema.json',{'$schema':'https://json-schema.org/draft/2020-12/schema','$defs':domain})
    schema_ref=dict(type='string',minLength=1,maxLength=255,pattern=r'^contracts/[A-Za-z0-9_./-]+\.json#/.+$')
    dependency=obj({'pluginId':ID,'version':dict(type='string',pattern=r'^[0-9]+\.[0-9]+\.[0-9]+$'),'digest':DIGEST})
    plugin=obj({'pluginId':ID,'version':dict(type='string',pattern=r'^[0-9]+\.[0-9]+\.[0-9]+$'),'apiVersion':{'const':'oa-extension/v1'},
        'kind':enum('CONFIG_BUNDLE','BUILTIN_MODULE','OPENAPI_TOOL','MCP_TOOL'),'entrypointId':ID,'configurationSchemaRef':schema_ref,
        'actions':arr(obj({'name':ID,'inputSchemaRef':schema_ref,'outputSchemaRef':schema_ref,'risk':enum('READ','REVERSIBLE_WRITE','EXTERNAL_WRITE'),
            'timeoutSeconds':dict(type='integer',minimum=1,maximum=120),'idempotency':enum('READ_ONLY','PROVIDER_KEY','BUSINESS_KEY_RECONCILE','UNSUPPORTED'),
            'requestedPermissions':arr(ID,1),'destinationIds':arr(ID,1)}),1,20),
        'dependencies':arr(dependency,0,20),'provenance':obj({'sourceUrl':s(500),'sourceRevision':s(100),'licenseDeclared':s(100),'commercialReview':enum('NOT_RUN','ACCEPTED_WITH_OBLIGATIONS','REPLACE','EXCLUDE','UNKNOWN')}),
        'evaluationRefs':arr(local_refs(VR)),'enabled':BOOL})
    save('plugin-manifest.schema.json',{'$schema':'https://json-schema.org/draft/2020-12/schema','$defs':{'VersionedRef':local_refs(SCHEMAS['VersionedRef'])},**plugin})
    save('fixtures/plugin-manifest.json',{'pluginId':'demo_readonly_knowledge','version':'0.1.0','apiVersion':'oa-extension/v1','kind':'CONFIG_BUNDLE',
        'entrypointId':'demo_registered_knowledge','configurationSchemaRef':'contracts/domain.schema.json#/$defs/C19_searchRequest',
        'actions':[{'name':'search','inputSchemaRef':'contracts/domain.schema.json#/$defs/C19_searchRequest','outputSchemaRef':'contracts/domain.schema.json#/$defs/ResourceList',
                    'risk':'READ','timeoutSeconds':15,'idempotency':'READ_ONLY','requestedPermissions':['knowledge_read'],'destinationIds':['demo_local_provider']}],
        'dependencies':[],'provenance':{'sourceUrl':'https://example.invalid/synthetic-only','sourceRevision':'SYNTHETIC_NOT_INSTALLED','licenseDeclared':'UNDETERMINED','commercialReview':'NOT_RUN'},'evaluationRefs':[],'enabled':False})
    print(json.dumps({'operations':len(OPERATIONS),'paths':len(api['paths']),'schemas':len(SCHEMAS),'requestFixtures':len(cases)}))

if __name__=='__main__':main()
