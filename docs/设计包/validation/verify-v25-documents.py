from pathlib import Path
import json,hashlib,re,subprocess,sys
root=Path(__file__).resolve().parent.parent;repo=Path('/Users/mac/Documents/ChatGPT/ZKER- staff');checks=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def verify(name,ok,detail=None):checks.append(dict(name=name,passed=bool(ok),detail=detail))
html=root/'08-人员数字员工协作交互原型.html';roles=json.loads((root/'16-角色视角与权限演示数据.json').read_text());trace=json.loads((root/'21-OA需求细化与验收追踪.json').read_text());req=json.loads((root/'10-需求追踪数据.json').read_text());fixtures=json.loads((root/'19-OA多实例演示数据.json').read_text());schema=json.loads((root/'20-OA统一待办候选.schema.json').read_text());old=json.loads(Path('/private/tmp/zker-oa-baseline-evidence-v24.json').read_text())
reports=[json.loads((root/'validation'/f).read_text()) for f in ['v25-role-regression.json','v25-market-regression.json','v25-oa-validation.json']];schemaResult=json.loads((root/'validation/v25-oa-schema-validation.json').read_text());canonical=json.loads((repo/'contracts/authz/platform-roles.yaml').read_text())['roles'];human={x['roleKey'] for x in canonical if x['assignableTo']=='HUMAN_USER'};used={k for p in roles['profiles'] for k in p['canonicalRoles']}
verify('41 role profiles still map exactly to 44 human keys',len(roles['profiles'])==41 and human==used and len(human)==44)
verify('Seven canonical fixtures unchanged',all(next(x for x in roles['profiles'] if x['id']==k)['canonicalRoles']==v for k,v in roles['canonicalFixtures'].items()) and len(roles['canonicalFixtures'])==7)
verify('Embedded role catalog unchanged',json.loads(re.search(r'var roleCatalog=(.*?);\nvar roleProfiles=',html.read_text(),re.S)[1])==roles)
verify('Original 153 requirements and 22 pages preserved',len(req['requirements'])==153 and len(req['pages'])==22)
protected=['09-协作扩展候选.schema.json','10-需求追踪数据.json','11-存量合同字段字典.md','12-员工市场复制与使用设计.md','13-市场采用候选.schema.json','16-角色视角与权限演示数据.json','17-角色需求与验收追踪.json','ZKER-staff-完整优化清单-v2-人员数字员工与上下文对齐.md'];lookup={Path(x['path']).name:x['sha256'] for x in old['artifacts']};verify('Protected original requirement, schema and role artifacts retain baseline digests',all(sha(root/p)==lookup[p] for p in protected))
ids={x['id'] for x in req['requirements']};roleids={x['id'] for x in roles['profiles']};pages={x[0] for x in req['pages']}
verify('28 OA refinements trace to actual requirement IDs and role/page groups',len(trace['refinements'])==28 and len({x['id'] for x in trace['refinements']})==28 and all(set(x['requirementIds'])<=ids and set(x['roleProfiles'])<=roleids and set(x['pageGroups'])<=pages and x['given'] and x['when'] and x['then'] and x['negative'] for x in trace['refinements']))
verify('Demonstrated versus design-only scope explicit',sum(x['prototypeScope']=='LOCAL_REPRESENTATIVE_SCENARIO' for x in trace['refinements'])==19 and sum(x['prototypeScope']=='DESIGN_ONLY_NOT_DEMONSTRATED' for x in trace['refinements'])==9)
verify('Three browser suites passed all actual cases',all(r['passed'] and all(c['passed'] for c in r['checks']) for r in reports))
verify('Role and OA browser suites match current HTML digest',all(r['htmlSha256']==sha(html) for r in [reports[0],reports[2]]))
verify('OA layouts cover all roles, five queues and task detail at three widths',len([c for c in reports[2]['checks'] if c['type']=='layout'])==738 and all({(c['width'],c['view']) for c in reports[2]['checks'] if c['type']=='layout' and c['role']==r}=={(w,v) for w in [1440,1024,390] for v in ['todo','done','started','cc','claim','task-detail']} for r in roleids))
verify('No browser errors or external requests',all(not r['pageErrors'] and not r.get('networkRequests',[]) for r in reports))
verify('OA Schema has tested valid and invalid examples',schemaResult['passed'] and schemaResult['validExamples']==3 and schemaResult['invalidExamples']==9 and len(schema['x-examples']['valid'])==3 and len(schema['x-examples']['invalid'])==9)
inst=fixtures['instances'];tasks=fixtures['items'];verify('Seven initial instances have unique IDs and business numbers',len(inst)==7 and len({x['id'] for x in inst})==7 and len({x['number'] for x in inst})==7)
verify('Same published process runs three times on same date',len([i for i in inst if i['type']=='purchase' and i['startedAt'].startswith('2026-09-11')])==3)
verify('Each profile has distinct task references across processes and two nodes in same instance',all(len([t for t in tasks if t['owner']==r and t['instanceId']=='pi-002'])==2 and len({next(i['type'] for i in inst if i['id']==t['instanceId']) for t in tasks if t['owner']==r and t['status']=='TODO'})>=3 for r in roleids))
verify('Task IDs and work item references are unique in fixture',len({x['id'] for x in tasks})==len(tasks) and len({x['workItemId'] for x in tasks})==len(tasks) and all(x['humanTaskId'] and x['instanceId'] in {i['id'] for i in inst} for x in tasks))
verify('Fixture has at most one named initiator per instance',all(len(x['initiators'])<=1 for x in inst))
verify('Current UI version visible', '交互设计原型 v2.5' in html.read_text() and 'OA 多事务' in html.read_text())
links=[];bad=[]
for f in root.glob('*.md'):
 for a,b in re.findall(r'\]\((?:<([^>]+)>|([^\s)]+))\)',f.read_text()):
  t=a or b
  if not t.startswith('/'):continue
  links.append(t);m=re.match(r'^(.*?)(?::(\d+))?$',t);p=Path(m.group(1))
  if not p.exists():bad.append((f.name,t,'missing'))
  elif m.group(2) and p.is_file() and int(m.group(2))>len(p.read_text(errors='replace').splitlines()):bad.append((f.name,t,'line'))
verify('All local links and anchors resolve',not bad,dict(count=len(links),failures=bad))
coverage=dict(roleProfiles=41,humanRoleKeys=44,requirements=153,oaRefinements=28,initialInstances=len(inst),initialFixtureTasks=len(tasks),layoutChecks=sum(r['layoutChecks'] for r in reports),interactionChecks=sum(r['interactionChecks'] for r in reports),screenshots=sum(len(r['screenshots']) for r in reports))
screens=[p for r in reports for p in r['screenshots']];verify('All current screenshots exist and are unique',len(screens)==len(set(screens)) and all(Path(p).stat().st_size>1000 for p in screens),len(screens))
sources=['docs/ui/information-architecture.md','docs/ui/ui-interaction-spec.md','apps/web/src/pages/work/MyWorkPage.tsx','apps/web/src/list-human-tasks-api.ts','contracts/jsonschema/work-execution-history-item.schema.json','contracts/authz/platform-roles.yaml'];sourceHashes={n:sha(repo/n) for n in sources};verify('Canonical role source remains current',sourceHashes['contracts/authz/platform-roles.yaml']==roles['sourceSha256'])
result=dict(revision='v2.5',passed=all(c['passed'] for c in checks),checks=checks,coverage=coverage,localLinks=len(links),htmlSha256=sha(html),sourceHead=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),sourceHashes=sourceHashes,limitations=['Local fictional prototype, schema and documentation only; no production database, real-role authentication, cross-browser concurrency, calendar engine or actual Agent runtime verification.'])
(root/'validation/v25-document-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(dict(passed=result['passed'],checks=len(checks),coverage=coverage,localLinks=len(links),failures=[x for x in checks if not x['passed']]),ensure_ascii=False));sys.exit(0 if result['passed'] else 1)
