"""Deterministic technical-document checks, not backend/product acceptance."""
from pathlib import Path
import hashlib,json,re,sys,datetime,zipfile
from urllib.parse import unquote,urlsplit
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'docs/设计包'; checks=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def check(name,condition):checks.append({'name':name,'pass':bool(condition)})
def read(p):return json.loads(p.read_text())
md=[next(BASE.glob(f'{n}-*.md')) for n in range(36,44)]
html=BASE/'44-技术架构交互图.html';spec=BASE/'44-技术架构图.architecture.json'
trace=read(BASE/'30-产品设计追踪数据.json');mapping=read(ROOT/'validation/technical-design-map.json');state=read(ROOT/'validation/product-design-task-state.json')
for p in md:
 s=p.read_text();check(p.name+' nonempty UTF8',len(s)>1500);check(p.name+' balanced code fences',len(re.findall(r'^```',s,re.M))%2==0)
 check(p.name+' no unfinished template',not re.search(r'\bTODO\b|\bTBD\b|\{\{.*?\}\}|<!-- (?:DOMAIN|PAGE|COMMAND)_MAPPING -->',s))
 refs=dict(re.findall(r'^\[([^\]]+)\]:\s*(\S+)',s,re.M))
 for label in re.findall(r'\[[^\]]+\]\[([^\]]+)\]',s):check(p.name+' reference '+label,label in refs)
 targets=re.findall(r'\[[^\]]+\]\(([^)]+)\)',s)+list(refs.values())
 for link in targets:
  link=link.strip('<>');url=urlsplit(link)
  if url.scheme or not url.path:continue
  path=Path(unquote(url.path));path=(path if path.is_absolute() else p.parent/path).resolve()
  # The check report is written by this command after checking its dependencies.
  check(p.name+' local link '+link,path.is_file() or path==ROOT/'validation/technical-design-check.json')
 for raw in re.findall(r'```json\s*\n(.*?)\n```',s,re.S):
  try:json.loads(raw);ok=True
  except ValueError:ok=False
  check(p.name+' parse JSON example',ok)
check('source projection SHA',mapping['sourceSha256']==sha(BASE/'30-产品设计追踪数据.json'))
check('173 requirement entries',len(mapping['requirements'])==173)
expected={r['id']:(kind,r) for kind in ['requirements','aiEnhancements','workspaceRefinements'] for r in trace[kind]}
check('all original IDs once',len({r['id'] for r in mapping['requirements']})==173 and {r['id'] for r in mapping['requirements']}==set(expected))
page_ids={r['id'] for r in mapping['pages']};command_ids={r['id'] for r in mapping['commands']}
check('21 domains identical',{r['id'] for r in mapping['domains']}=={r['id'] for r in trace['domains']} and len(mapping['domains'])==21)
check('22 pages identical',page_ids=={r['id'] for r in trace['pages']} and len(mapping['pages'])==22)
check('31 commands complete',command_ids=={f'C{i:02}' for i in range(1,32)} and len(mapping['commands'])==31)
for r in mapping['requirements']:
 kind,old=expected[r['id']]
 check(r['id']+' associations preserved',r['sourceCollection']==kind and all(r[k]==old.get(k,[]) for k in ['pageIds','commandIds','caseIds']))
 check(r['id']+' references resolve',set(r['pageIds'])<=page_ids and set(r['commandIds'])<=command_ids and all((ROOT/p).is_file() for p in r['technicalRefs']))
 check(r['id']+' no invented completion',r['implementationStatus']=='NOT_IMPLEMENTED_IN_THIS_PROJECT' and r['productEvidence']==[])
for p in mapping['pages']:
 required={c for _,r in expected.values() if p['id'] in r['pageIds'] for c in r['commandIds']}
 check(p['id']+' full command association',required<=set(p['commandIds'])<=command_ids and set(p['primaryCommandIds'])<=set(p['commandIds']))
 check(p['id']+' primary table row',f"| {p['id']} / {p['label']} | {p['route']} / {p['component']} | {', '.join(p['primaryCommandIds'])} |" in md[2].read_text())
for c in mapping['commands']:
 check(c['id']+' API table matches',f"| {c['id']} {c['actions']} | {c['method']} `{c['path'].removeprefix('/oa-api/v1')}` |" in md[4].read_text())
 check(c['id']+' proposed only',c['status']=='PROPOSED_NOT_IMPLEMENTED')
check('72 product cases remain unrun',len(trace['acceptanceCases'])==72 and all(r['status']=='NOT_RUN' and not r['evidence'] for r in trace['acceptanceCases']))
check('product implementation boundary',trace['productStatus']=='DESIGN_ONLY_NOT_IMPLEMENTED' and mapping['productTestsRun'] is False)
for name,digest in state['sourceHashes'].items():check('preserved source '+name,(ROOT/name).is_file() and sha(ROOT/name)==digest)
with zipfile.ZipFile(ROOT/'validation/technical-design-before-20260911.zip') as z:
 for name in z.namelist():
  if name.startswith('docs/设计包/'):
   check('pre-change product design preserved '+name,(ROOT/name).is_file() and hashlib.sha256(z.read(name)).hexdigest()==sha(ROOT/name))
old={r['path']:r['sha256'] for r in state['artifacts']}
check('1.3 HTML unchanged',old.get('docs/设计包/31-完整产品交互原型.html')==sha(BASE/'31-完整产品交互原型.html'))
delivery=read(ROOT/'validation/technical-architecture-delivery.json');browser=read(ROOT/'validation/technical-architecture-browser.json');visual=read(ROOT/'validation/technical-architecture-review.json');ui=read(ROOT/'validation/technical-architecture-interaction.json')
check('diagram artifact identity',delivery['artifact']=={'sha256':sha(html),'bytes':html.stat().st_size} and delivery['specification']=={'sha256':sha(spec),'bytes':spec.stat().st_size})
check('diagram deterministic pass',delivery['ok'] and delivery['validation']['checksPassed']==9 and delivery['validation']['errors']==0 and delivery['validation']['warnings']==0)
check('browser bound to artifact',browser['artifact']['sha256']==sha(html) and browser['artifact']['bytes']==html.stat().st_size)
check('automated browser independently passes',browser['status']=='pass' and browser['visualReview']=='pending')
check('four exact desktop sizes',{(v['width'],v['height']) for v in browser['containment']['viewports']}=={(1440,900),(1600,1000),(1920,1080),(2048,1320)} and all(v['ok'] for v in browser['containment']['viewports']))
check('four theme captures',len(browser['captures']['screenshots'])==4 and all((BASE/v['file']).is_file() and v['ok'] for v in browser['captures']['screenshots']))
check('actual image review separately bound',visual['artifactSha256']==sha(html) and visual['visual_review']=='passed')
for img in visual['inspectedImages']:check('reviewed image hash '+img['path'],sha(ROOT/img['path'])==img['sha256'])
check('diagram interaction checks current',ui['status']=='PASS' and ui['artifactSha256']==sha(html) and len(ui['checks'])==9 and all(c['pass'] for c in ui['checks']) and not ui['productTestsRun'])
for e in ui['exports']:check('export current '+e['path'],sha(ROOT/e['path'])==e['sha256'] and (ROOT/e['path']).stat().st_size==e['bytes'])
graph=read(spec);edgepairs={(e['from'],e['to']) for e in graph['connections']}
check('essential architecture relations',{('web','application'),('application','database'),('application','worker'),('worker','models'),('worker','tools'),('application','identity')}<=edgepairs)
source=read(ROOT/'validation/technical-source-check.json');check('independent primary reread',source['status']=='PASS' and len(source['sources'])==9 and all(s['httpStatus']==200 and len(s['sha256'])==64 for s in source['sources']))
new_nodes={r['id']:r for r in state['nodes'] if r['id'] in ['T1','T2','T3']}
check('technical task graph complete',set(new_nodes)=={'T1','T2','T3'})
for n in new_nodes.values():check(n['id']+' bounded node contract',all(n.get(k) for k in ['objective','preconditions','action','tool_or_skill','expected_output','validation','success_condition','failure_path','rollback_or_compensation']))
check('technical graph dependency order',all(new_nodes[n]['dependsOn']==[parent] for n,parent in [('T1','A13-3'),('T2','T1'),('T3','T2')]))
review=state['iterations'][-1].get('reviewChecklist',[]);check('technical design review checklist',len(review)>=30 and all(r['status']=='REVIEWED_DESIGN_ONLY' and (ROOT/r['reference']).is_file() for r in review))
report={'scope':'TECHNICAL_DESIGN_DELIVERY_ONLY','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS' if all(c['pass'] for c in checks) else 'FAIL','checksPassed':sum(c['pass'] for c in checks),'checkCount':len(checks),'failures':[c['name'] for c in checks if not c['pass']],'counts':{'markdownDocuments':len(md),'interactiveDiagrams':1,'requirements':173,'domains':21,'pages':22,'commandGroups':31,'productAcceptanceCases':72,'productAcceptanceCasesRun':0},'artifacts':[{'path':str(p.relative_to(ROOT)),'sha256':sha(p),'bytes':p.stat().st_size} for p in md+[html,spec,ROOT/'validation/technical-design-map.json']],'checks':checks,'limitations':['No candidate build, database initialization, real model, runtime permission or production validation.','Mermaid code blocks are structurally checked; no claim that every Mermaid source was rendered.','Referenced public source declarations are evidence for the pinned snapshot, not dependency resolution or distribution approval.']}
(ROOT/'validation/technical-design-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:report[k] for k in ['status','checksPassed','checkCount','failures','counts']},ensure_ascii=False,indent=2));sys.exit(0 if report['status']=='PASS' else 1)
