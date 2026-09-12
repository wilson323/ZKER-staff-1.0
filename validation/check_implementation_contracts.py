"""Independent, offline checks for this design package.

Implements only the JSON Schema keywords used here, fails on unsupported
keywords, and never imports generators. NOT a general OpenAPI validator,
database engine, production policy engine, or model evaluation runner.
"""
from pathlib import Path
from urllib.parse import unquote
import copy
import datetime
import hashlib
import json
import re
import sys

ROOT=Path(__file__).resolve().parents[1]; C=ROOT/'contracts'
CHECKS=[]; FAILURES=[]
def check(name,ok,detail=''):
    CHECKS.append({'check':name,'passed':bool(ok)})
    if not ok:FAILURES.append({'check':name,'detail':str(detail)[:1000]})
def read(p):return json.loads(p.read_text())
def resolve(schema,document):
    value=schema['$ref']
    if not value.startswith('#/'):
        raise ValueError('Only local schema refs supported: '+value)
    result=document
    for part in value[2:].split('/'):
        result=result[part.replace('~1','/').replace('~0','~')]
    return result

KEYWORDS={'$schema','$defs','$ref','type','properties','required','additionalProperties','oneOf','const','enum','items',
          'minItems','maxItems','uniqueItems','minLength','maxLength','pattern','format','minimum','maximum','default','description','title'}
def inspect_schema(schema,doc,label):
    check(label+': supported-keywords',set(schema)<=KEYWORDS,set(schema)-KEYWORDS)
    if '$ref' in schema:
        try:resolve(schema,doc);check(label+': ref',True)
        except (KeyError,ValueError) as e:check(label+': ref',False,e)
    if 'required' in schema:
        check(label+': required-exist',set(schema['required'])<=set(schema.get('properties',{})))
    if schema.get('type')=='object':check(label+': closed-object',schema.get('additionalProperties') is False)
    if 'pattern' in schema:
        try:re.compile(schema['pattern'])
        except re.error as e:check(label+': pattern',False,e)
    for k in ['properties','$defs']:
        for n,s in schema.get(k,{}).items():inspect_schema(s,doc,label+'/'+n)
    for i,s in enumerate(schema.get('oneOf',[])):inspect_schema(s,doc,label+'/oneOf/'+str(i))
    if 'items' in schema:inspect_schema(schema['items'],doc,label+'/items')

def valid(value,schema,doc,depth=0):
    if depth>60:raise ValueError('Schema recursion limit')
    if '$ref' in schema:return valid(value,resolve(schema,doc),doc,depth+1)
    if 'const' in schema and (value!=schema['const'] or isinstance(value,bool)!=isinstance(schema['const'],bool)):return False
    if 'enum' in schema and value not in schema['enum']:return False
    if 'oneOf' in schema and sum(valid(value,s,doc,depth+1) for s in schema['oneOf'])!=1:return False
    types=schema.get('type');types=types if isinstance(types,list) else [types] if types else []
    def istype(t):
        return {'object':isinstance(value,dict),'array':isinstance(value,list),'string':isinstance(value,str),
                'integer':isinstance(value,int) and not isinstance(value,bool),'number':isinstance(value,(int,float)) and not isinstance(value,bool),
                'boolean':isinstance(value,bool),'null':value is None}[t]
    if types and not any(istype(t) for t in types):return False
    if isinstance(value,dict):
        if not set(schema.get('required',[]))<=value.keys():return False
        if schema.get('additionalProperties') is False and not value.keys()<=schema.get('properties',{}).keys():return False
        if any(not valid(v,schema['properties'][k],doc,depth+1) for k,v in value.items() if k in schema.get('properties',{})):return False
    if isinstance(value,list):
        if not schema.get('minItems',0)<=len(value)<=schema.get('maxItems',float('inf')):return False
        if schema.get('uniqueItems') and len({json.dumps(i,sort_keys=True) for i in value})!=len(value):return False
        if 'items' in schema and not all(valid(v,schema['items'],doc,depth+1) for v in value):return False
    if isinstance(value,str):
        if not schema.get('minLength',0)<=len(value)<=schema.get('maxLength',float('inf')):return False
        if 'pattern' in schema and re.search(schema['pattern'],value) is None:return False
        if schema.get('format') in ['date','date-time']:
            try:
                if schema['format']=='date':datetime.date.fromisoformat(value)
                else:
                    dt=datetime.datetime.fromisoformat(value.replace('Z','+00:00'))
                    if 'T' not in value or dt.tzinfo is None:return False
            except ValueError:return False
    if isinstance(value,(int,float)) and not isinstance(value,bool):
        if value<schema.get('minimum',float('-inf')) or value>schema.get('maximum',float('inf')):return False
    return True

api=read(C/'openapi.json');domain=read(C/'domain.schema.json');catalog=read(C/'command-catalog.json');ops=catalog['operations']
check('OpenAPI-version',api['openapi']=='3.1.1')
check('31-command-groups',{o['commandId'] for o in ops}=={f'C{i:02}' for i in range(1,32)})
check('unique-action-IDs',len({o['id'] for o in ops})==len(ops))
for n,schema in api['components']['schemas'].items():inspect_schema(schema,api,'api/'+n)
for f in ['domain.schema.json','events.schema.json','internal.schema.json','plugin-manifest.schema.json']:
    d=read(C/f);inspect_schema(d,d,f)

for op in ops:
    route=api['paths'][op['path']][op['method']]
    check(op['id']+': registered',op['id'] in route['x-actions'])
    check(op['id']+': authorization',bool(op['authorization']) and bool(route['security']))
    check(op['id']+': response',op['responseSchema']=='Binary' or op['responseSchema'] in api['components']['schemas'])
    params={p['name']:p for p in route['parameters']}
    check(op['id']+': path-params',all(n in params and params[n]['required'] for n in re.findall(r'\{([^}]+)\}',op['path'])))
    if op['requestSchema']:
        check(op['id']+': idempotency','Idempotency-Key' in params)
        check(op['id']+': csrf-or-signed-source','X-CSRF-Token' in params or op['commandId']=='C23' and 'X-Integration-Signature' in params)
        check(op['id']+': exact-command',api['components']['schemas'][op['requestSchema']]['properties']['command']['const']==op['commandId']+'.'+op['action'])
        check(op['id']+': body-alternative',{'$ref':'#/components/schemas/'+op['requestSchema']} in route['requestBody']['content']['application/json']['schema']['oneOf'])

fixtures=read(C/'fixtures/requests.json')['cases']
for case in fixtures:
    schema=domain['$defs'][case['schema']]
    check('fixture/'+case['id'],valid(case['input'],schema,domain)==case['valid'])
    if case['valid']:
        # Independently remove every required property, not just command.
        for name in schema['required']:
            v=copy.deepcopy(case['input']);v.pop(name)
            check(case['id']+': required/'+name,not valid(v,schema,domain))
        for name in ['expectedRevision','responsibilityEpoch','baseRevision']:
            if name in case['input']:
                for bad in [0,-1,1.5,'1',None,True]:
                    v=copy.deepcopy(case['input']);v[name]=bad
                    check(case['id']+': invalid-'+name+'/'+str(bad),not valid(v,schema,domain))

# Negative output fixtures are constructed independently of generator samples.
events=read(C/'events.schema.json')
ev={'eventId':'evt_demo','schemaVersion':1,'type':'ContextChanged','workId':'work_demo','sequence':1,'sourceRevision':1,'projectionRevision':1,'authzEpoch':1,
    'occurredAt':'2026-09-11T12:00:00Z','cursor':'opaque','data':{'action':'REFETCH_AUTHORIZED_SNAPSHOT','publicStage':'CHANGED'}}
check('public-event-valid',valid(ev,events,events))
for key,value in [('tenantId','private_tenant'),('rawPrompt','PRIVATE_CONTEXT_CANARY_7F31'),('toolArguments',{'secret':'synthetic'})]:
    check('public-event-reject/'+key,not valid({**ev,key:value},events,events))
path={'projection':'PATH_ONLY','nodeId':'node_demo','stage':'ACTIVE','label':'受限节点'}
check('path-only-valid',valid(path,domain['$defs']['PathNode'],domain))
for key in ['summaryRef','artifactRefs','privateTitle']:
    check('path-only-reject/'+key,not valid({**path,key:[]},domain['$defs']['PathNode'],domain))
check('config-reject-privilege-change',not valid({'fieldPath':'role','value':'ADMIN'},domain['$defs']['ConfigChange'],domain))
check('first-baseline-explicit-null',any(s=={'type':'null'} for s in domain['$defs']['C16_confirmRequest']['properties']['baselineRef']['oneOf']))
check('asset-import-no-preexisting-target','targetRef' not in domain['$defs']['C17_importRequest']['properties'] and 'targetScopeRef' in domain['$defs']['C17_importRequest']['required'])
check('binding-work-revision-explicit','workRevision' in domain['$defs']['Binding']['required'])
check('manual-provenance-without-attempt',valid({'mode':'MANUAL','note':'人工形成真实成果','evidenceRefs':[{'kind':'ARTIFACT','id':'a','version':1,'digest':'sha256:'+'a'*64}]},domain['$defs']['DeliveryProvenance'],domain))
check('manual-provenance-reject-attempt',not valid({'mode':'MANUAL','note':'note','evidenceRefs':[],'attemptId':'a'},domain['$defs']['DeliveryProvenance'],domain))
plugin=read(C/'fixtures/plugin-manifest.json');ps=read(C/'plugin-manifest.schema.json')
check('plugin-example-schema',valid(plugin,ps,ps))
check('plugin-example-not-enabled',plugin['enabled'] is False and plugin['provenance']['commercialReview']=='NOT_RUN')
check('plugin-reject-script',not valid({**plugin,'postInstallScript':'synthetic'},ps,ps))

# Reference decisions check consistency of the fixture specification only.
def policy(action,f):
    if not f['policyAvailable']:return 'UNAVAILABLE'
    if not f['tenantMatch'] or not f['discover']:return 'NOT_FOUND'
    if not all(f[k] for k in ['sameWork','currentEpoch','purposeMatch','grantActive']):return 'DENY'
    if action=='PATH':return 'PATH_ONLY' if f['pathDiscover'] else 'DENY'
    if action=='READ':return 'ALLOW' if f['contentRead'] else 'DENY'
    if action=='EXECUTE':return 'BACKEND_ONLY' if f['executionGrant'] and f['destinationAllowed'] else 'DENY'
    if action=='RELEASE':return 'ALLOW' if f['releaseAllowed'] else 'DENY'
    return 'DENY'
perms=read(C/'fixtures/permissions.json')['cases']
for case in perms:check(case['id']+': reference-only',policy(case['action'],case['facts'])==case['expected'])
machines=read(C/'state-machines.json')['machines']
for name,states in machines.items():
    check('states/'+name+': targets',all(t in states for ts in states.values() for t in ts))
for case in read(C/'fixtures/states.json')['cases']:
    check(case['id']+': reference-only',(case['after'] in machines[case['machine']][case['before']])==case['allowed'])
check('unknown-does-not-rerun','RUNNING' not in machines['Attempt']['RESULT_UNKNOWN'])

tables=read(C/'data-model.json')['tables'];table_map={t['name']:t for t in tables}
sql=(C/'migrations/mysql-candidate/V001__oa_extension_candidate.sql').read_text()
check('sql-table-names',set(re.findall(r'CREATE TABLE `([^`]+)`',sql))==set(table_map))
check('sql-no-destructive-statements',not re.search(r'^\s*(DROP|DELETE|TRUNCATE)\b',sql,re.M|re.I))
for t in tables:
    cols={c['name']:c for c in t['columns']}
    check(t['name']+': tenant-primary',t['primaryKey']==['tenant_id','id'])
    check(t['name']+': unique-columns',len(cols)==len(t['columns']))
    for keys in [t['primaryKey'],*t['unique'],*t['indexes']]:check(t['name']+': index/'+','.join(keys),set(keys)<=set(cols))
    for c in t['columns']:
        check(t['name']+'/'+c['name']+': typed',bool(c['type']) and bool(c['meaning']) and isinstance(c['nullable'],bool))
        if 'schemaRef' in c:
            f,pointer=c['schemaRef'].split('#',1)
            try:
                target=read(C/f)
                for part in pointer.strip('/').split('/'):target=target[part]
                check(t['name']+'/'+c['name']+': schema-ref',isinstance(target,dict))
            except (KeyError,FileNotFoundError):check(t['name']+'/'+c['name']+': schema-ref',False,c['schemaRef'])
    for fk in t['foreignKeys']:
        target=table_map[fk['target']]
        check(t['name']+': tenant-fk/'+fk['target'],fk['columns'][0]=='tenant_id' and fk['targetColumns'][0]=='tenant_id')
        check(t['name']+': fk-unique-target/'+fk['target'],fk['targetColumns'] in [target['primaryKey'],*target['unique']])
        targetcols={c['name']:c for c in target['columns']}
        check(t['name']+': fk-types/'+fk['target'],all(cols[a]['type']==targetcols[b]['type'] for a,b in zip(fk['columns'],fk['targetColumns'])))
check('unique-delivery', ['tenant_id','work_id','responsibility_epoch'] in table_map['oa_delivery']['unique'])
check('work-no-second-assignee',not any('assignee' in c['name'] for c in table_map['oa_work_item']['columns']))
reuse=read(C/'storage-reuse-plan.json')
check('no-create-all',reuse['createAllCandidateTables'] is False and all(i['newTableAuthorized'] is False for i in reuse['items']))
check('reuse-covers-every-table',{i['candidateTable'] for i in reuse['items']}==set(table_map))

original=read(ROOT/'docs/设计包/30-产品设计追踪数据.json')
rows=read(C/'implementation-map.json');original_rows=original['requirements']+original['aiEnhancements']+original['workspaceRefinements']
ids={r['id'] for r in original_rows};old_by_id={r['id']:r for r in original_rows}
check('173-preserved',len(rows['requirements'])==173 and {r['requirementId'] for r in rows['requirements']}==ids)
check('trace-current-hash',rows['sourceSha256']==hashlib.sha256((ROOT/rows['source']).read_bytes()).hexdigest())
op_ids={o['id'] for o in ops}
for r in rows['requirements']:
    old=old_by_id[r['requirementId']]
    check(r['requirementId']+': operations',bool(r['operationIds']) and set(r['operationIds'])<=op_ids)
    check(r['requirementId']+': tables',bool(r['dataTables']) and set(r['dataTables'])<=set(table_map))
    check(r['requirementId']+': original-cases',r['originalCaseIds']==old.get('caseIds',[]))
    check(r['requirementId']+': original-pages',r['pageIds']==old['pageIds'])
    check(r['requirementId']+': not-implemented',r['implementationStatus']=='NOT_IMPLEMENTED')
pages=read(C/'ui-pages.json')['pages']
check('22-pages-preserved',{p['id'] for p in pages}=={p['id'] for p in original['pages']} and len(pages)==22)
for p in pages:check(p['id']+': typed-actions',set(p['operationIds'])<=op_ids and bool(p['operationIds']))
for case in read(C/'fixtures/ai-evals.json')['cases']:
    check(case['id']+': declared-only',case['status']=='NOT_RUN' and case['evidence']==[])
    check(case['id']+': requirement-ids',set(case['requirementIds'])<=ids)
check('72-AC-not-promoted',len(original['acceptanceCases'])==72 and all(c['status']=='NOT_RUN' for c in original['acceptanceCases']))
commercial=read(C/'commercial-component-register.json')
check('commercial-not-cleared',commercial['commercialReleaseCleared'] is False and commercial['finalStackSelected'] is False)
check('commercial-candidates-not-shipped',all(c['shipped'] is False and c['closureStatus']=='NOT_DONE' for c in commercial['components']))

docs=[]
for n in range(46,55):
    matches=list((ROOT/'docs/设计包').glob(str(n)+'-*.md'))
    check('doc/'+str(n),len(matches)==1)
    if matches:docs.extend(matches)
navigation=[ROOT/'README.md',ROOT/'CONTEXT.md',ROOT/'docs/设计包/45-AI编程文档就绪审查与补齐清单.md']
for p in docs+[C/'command-reference.md',C/'data-dictionary.md']+navigation:
    text=p.read_text()
    check(p.name+': substantive',len(text)>2500 and text.count('\n## ')>=2 if p in docs else len(text)>500)
    for target in re.findall(r'\]\(<?([^\s)>]+)>?\)',text):
        if target.startswith(('http:','https:','mailto:','#')):continue
        f=unquote(target.split('#')[0]); dest=(p.parent/f).resolve()
        # Report is written at end; declared link is valid if it is this report.
        check(p.name+': link/'+f,dest.exists() or dest==ROOT/'validation/implementation-contract-check.json',target)
    if p.name.startswith('47-'):
        check('21-domain-anchors',len(re.findall(r'<a id="sl-[a-z]+"></a>',text))==21)
    if p.name.startswith('52-'):check('22-page-rows',len(re.findall(r'^\| P[0-9]{2} ',text,re.M))==22)
task=read(ROOT/'validation/development-task-implementation-docs-20260911.json')
for f in ['docs/设计包/30-产品设计追踪数据.json','docs/设计包/31-完整产品交互原型.html']:
    check('protected-baseline/'+f,hashlib.sha256((ROOT/f).read_bytes()).hexdigest()==task['baseline'][f])

# Known validator boundaries are executable sanity probes.
check('validator-rejects-bool-integer',not valid(True,{'type':'integer'},{}))
check('validator-rejects-bool-const',not valid(True,{'const':1},{}))
check('validator-rejects-ambiguous-oneOf',not valid(1,{'oneOf':[{'type':'integer'},{'type':'number'}]},{}))
check('validator-rejects-invalid-date',not valid('2026-02-30',{'type':'string','format':'date'},{}))
check('validator-rejects-duplicate-items',not valid([1,1],{'type':'array','items':{'type':'integer'},'uniqueItems':True},{}))

paths=sorted([p for p in C.rglob('*') if p.is_file()]+docs+navigation+[Path(__file__)]+list((ROOT/'validation').glob('build_implementation_*.py')))
report={'status':'PASS' if not FAILURES else 'FAIL','scope':'DOCUMENT_AND_SUPPORTED_SCHEMA_SUBSET_STATIC_CHECKS_WITH_REFERENCE_FIXTURES',
 'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':'python3 validation/check_implementation_contracts.py','cwd':str(ROOT),
 'summary':{'checks':len(CHECKS),'passed':sum(c['passed'] for c in CHECKS),'failed':len(FAILURES),'documents':len(docs),'commandGroups':31,'actions':len(ops),'paths':len(api['paths']),
            'schemas':len(api['components']['schemas']),'candidateTables':len(tables),'columns':sum(len(t['columns']) for t in tables),'requestFixtures':len(fixtures),'permissionFixtures':len(perms),'requirements':len(rows['requirements']),'pages':len(pages)},
 'failures':FAILURES,'checks':CHECKS,'inputHashes':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},
 'productReady':False,'databaseExecuted':False,'realModelExecuted':False,'commercialReleaseCleared':False,
 'limitations':['仅验证本包使用的JSON Schema子集和OpenAPI显式结构，不是通用认证器','SQL仅字典/引用/索引静态检查，未交数据库解析或执行','权限/状态夹具为参考规则一致性，不是实际授权服务','真实底座、生产构建、全依赖SBOM及AI评测均未执行']}
(ROOT/'validation/implementation-contract-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['status','scope','summary','failures','productReady','databaseExecuted','realModelExecuted','commercialReleaseCleared']},ensure_ascii=False))
sys.exit(1 if FAILURES else 0)
