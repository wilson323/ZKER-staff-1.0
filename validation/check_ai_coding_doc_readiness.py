"""Verify this document audit's facts and links, never product readiness."""
from pathlib import Path
import json,hashlib,re,datetime,sys,zipfile
from urllib.parse import urlsplit,unquote
ROOT=Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
checks=[]
def check(name,ok):checks.append({'name':name,'pass':bool(ok)})
paths=[ROOT/'README.md',ROOT/'CONTEXT.md',ROOT/'docs/设计包/45-AI编程文档就绪审查与补齐清单.md']
for p in paths:
 s=p.read_text();check(p.name+' UTF8 readable',len(s)>100)
 for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)',s):
  u=urlsplit(target.strip('<>'))
  if u.scheme or not u.path:continue
  dest=(p.parent/unquote(u.path)).resolve()
  check(p.name+' local reference '+target,dest.is_file() or dest==ROOT/'validation/ai-coding-doc-readiness-check.json')
m=json.loads((ROOT/'validation/technical-design-map.json').read_text());trace=json.loads((ROOT/'docs/设计包/30-产品设计追踪数据.json').read_text())
check('173 preserved technical records',len(m['requirements'])==173)
check('one common seven-document reference set',len({tuple(r['technicalRefs']) for r in m['requirements']})==1 and len(m['requirements'][0]['technicalRefs'])==7)
check('20 cross-domain records',sum(r['module']=='cross-domain' for r in m['requirements'])==20)
check('source trace bytes unchanged',m['sourceSha256']==sha(ROOT/'docs/设计包/30-产品设计追踪数据.json'))
check('72 product cases are unrun',len(trace['acceptanceCases'])==72 and all(x['status']=='NOT_RUN' and not x['evidence'] for x in trace['acceptanceCases']))
old=json.loads((ROOT/'validation/product-design-task-state.json').read_text())
for name in ['docs/设计包/26-完整产品设计文档.md','docs/设计包/27-逻辑数据模型与接口契约.md','docs/设计包/31-完整产品交互原型.html']:
 expected=next(x['sha256'] for x in old['artifacts'] if x['path']==name);check('protected product file '+name,sha(ROOT/name)==expected)
source_files=[]
for p in ROOT.rglob('*'):
 if not p.is_file():continue
 rel=p.relative_to(ROOT)
 if any(x in {'archive','history','validation','.git','node_modules','__pycache__'} for x in rel.parts):continue
 if p.suffix=='.sql' or p.name.lower() in {'openapi.yaml','openapi.yml','openapi.json','swagger.yaml','swagger.json','pom.xml','package.json'}:source_files.append(str(rel))
check('no product SQL OpenAPI or build manifests in current implementation scope',not source_files)
config=json.loads((ROOT/'validation/development-workflow.json').read_text())
check('product configuration not ready',config['product']['status']=='NOT_CONFIGURED' and config['product']['stackDecision'] is None and config['product']['commands']==[])
check('latest task correctly routed',config['currentTask']=='validation/development-task-ai-coding-doc-readiness-20260911.json')
s=paths[2].read_text();check('eight scoped document categories',set(re.findall(r'\| (D\d\d) ',s))=={f'D{i:02}' for i in range(1,9)})
check('audit status does not claim implementation readiness','AUDIT_COMPLETE / IMPLEMENTATION_SPEC_NOT_READY' in s)
check('no invented missing contracts','没有生成或冻结上述OpenAPI' in s)
for p in paths[:2]:
 text=p.read_text();check(p.name+' points to current technical and readiness documents','37-技术架构总设计与决策.md' in text and '45-AI编程文档就绪审查与补齐清单.md' in text)
check('context old ranking corrected','先验证RuoYi-AI合格社区子集' in paths[1].read_text() and '优先验证芋道前后端' not in paths[1].read_text())
with zipfile.ZipFile(ROOT/'validation/ai-coding-doc-readiness-before-20260911.zip') as z:
 check('navigation defect captured before repair','优先验证芋道前后端' in z.read('CONTEXT.md').decode() and '37-技术架构总设计与决策.md' not in z.read('README.md').decode())
task=json.loads((ROOT/config['currentTask']).read_text())
for sk in task['skillsRead']:
 check('applied skill bytes still match '+sk['path'],sha(ROOT/sk['path'])==sk['sha256'])
report={'scope':'DOCUMENT_READINESS_AUDIT_CHECK_ONLY','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'auditCheckStatus':'PASS' if all(c['pass'] for c in checks) else 'FAIL','implementationSpecStatus':'NOT_READY','productReady':False,'productTestsRun':False,'checks':checks,'failures':[c['name'] for c in checks if not c['pass']],'artifactHashes':{str(p.relative_to(ROOT)):sha(p) for p in paths},'observedFacts':{'requirementRecords':173,'distinctTechnicalRefSets':1,'crossDomainRecords':20,'productAcceptanceCasesRun':0,'productSchemaOrBuildFilesFound':source_files},'limits':['This is an audit of document sufficiency, not completion of the eight missing contract categories.','No product code, build, data initialization, model evaluation or deployment was executed.','Missing-file conclusion covers current project implementation scope, excluding history, archives and validation fixtures.']}
(ROOT/'validation/ai-coding-doc-readiness-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':report['auditCheckStatus'],'failures':report['failures'],'implementationSpecStatus':'NOT_READY','productReady':False},ensure_ascii=False));sys.exit(0 if not report['failures'] else 1)
