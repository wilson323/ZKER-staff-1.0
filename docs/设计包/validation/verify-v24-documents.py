from pathlib import Path
import hashlib,json,re,sys,subprocess
root=Path(__file__).resolve().parent.parent;repo=Path('/Users/mac/Documents/ChatGPT/ZKER- staff');checks=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def verify(name,ok,detail=None):checks.append(dict(name=name,passed=bool(ok),detail=detail))
profiles=json.loads((root/'16-角色视角与权限演示数据.json').read_text());mapping=json.loads((root/'17-角色需求与验收追踪.json').read_text());req=json.loads((root/'10-需求追踪数据.json').read_text());canonical=json.loads((repo/'contracts/authz/platform-roles.yaml').read_text())['roles'];human={x['roleKey'] for x in canonical if x['assignableTo']=='HUMAN_USER'};used={k for p in profiles['profiles'] for k in p['canonicalRoles']};html=(root/'08-人员数字员工协作交互原型.html').read_text();embedded=json.loads(re.search(r'var roleCatalog=(.*?);\nvar roleProfiles=',html,re.S)[1])
verify('All 44 human role keys covered by 41 explicit views',len(human)==44 and used==human and len(profiles['profiles'])==41,dict(humanKeys=len(human),profiles=len(profiles['profiles']),missing=sorted(human-used),extra=sorted(used-human)))
verify('Embedded role catalog matches delivered JSON',embedded==profiles)
verify('Canonical seven fixtures preserve exact membership',all(next(x for x in profiles['profiles'] if x['id']==k)['canonicalRoles']==v for k,v in profiles['canonicalFixtures'].items()) and len(profiles['canonicalFixtures'])==7)
verify('Service role cannot be selected as a human',profiles['nonHumanRoles'][0]['roleKey']=='PROVISIONING_SERVICE' and not profiles['nonHumanRoles'][0]['humanNavigation'] and 'PROVISIONING_SERVICE' not in used)
verify('Current platform role source hash matches fixture',sha(repo/'contracts/authz/platform-roles.yaml')==profiles['sourceSha256'])
verify('All 153 original requirements mapped without extra IDs',{x['requirementId'] for x in mapping['requirements']}=={x['id'] for x in req['requirements']} and len(mapping['requirements'])==153)
verify('Original requirements digest unchanged',mapping['sourceRequirementSha256']==sha(root/'10-需求追踪数据.json'))
known={p['id'] for p in profiles['profiles']};pages={p[0] for p in req['pages']}
verify('Every role has a journey, negative case and valid page mapping',len(mapping['profiles'])==41 and {p['profileId'] for p in mapping['profiles']}==known and all(p['journey'] and p['negative'] and p['pageGroups'] and set(p['pageGroups'])<=pages for p in mapping['profiles']))
verify('Every requirement has valid roles and original acceptance',all(x['roleProfiles'] and set(x['roleProfiles'])<=known and set(x['pageGroups'])<=pages and x['acceptance']==next(r['acceptance'] for r in req['requirements'] if r['id']==x['requirementId']) for x in mapping['requirements']))
verify('41 role-specific Given When Then stories present',len(mapping['roleStories'])==41 and all(x['given'] and x['when'] and x['then'] for x in mapping['roleStories']))
verify('21 domains and 22 page groups preserved',len(req['domains'])==21 and len(req['pages'])==22)
# v2.3 artifact digest inventory was captured before this update; no reading of third-party product source.
old=json.loads(Path('/private/tmp/zker-role-baseline-evidence.json').read_text());allowed={'00-开发设计包导读.md','01-产品需求与业务规则.md','05-UI与交互设计.md','07-开发分解与验收方案.md','08-人员数字员工协作交互原型.html','14-QoderWake界面参考与原型设计.md','ZKER-staff-v2-evidence.json'}
preserved=[];bad=[]
for a in old['artifacts']:
 p=Path(a['path'])
 if p.parent==root and p.name not in allowed:
  preserved.append(p.name)
  if not p.exists() or sha(p)!=a['sha256']:bad.append(p.name)
verify('Unchanged business models, schemas, requirement map and checklist preserve v2.3 digests',not bad,dict(checked=preserved,drift=bad))
a=json.loads((root/'validation/v24-role-validation.json').read_text());b=json.loads((root/'validation/v24-market-validation.json').read_text());verify('Both browser suites pass all recorded cases',a['passed'] and b['passed'] and all(c['passed'] for c in a['checks']+b['checks']))
verify('Browser result refers to current HTML digest',a['htmlSha256']==sha(root/'08-人员数字员工协作交互原型.html'))
verify('All role views checked on all three widths',{c['role'] for c in a['checks'] if c['type']=='layout'}==known and all({c['width'] for c in a['checks'] if c['type']=='layout' and c['role']==p}=={1440,1024,390} for p in known))
verify('No browser errors or external requests',not a['pageErrors'] and not b['pageErrors'] and not a['networkRequests'])
screens=a['screenshots']+b['screenshots'];verify('All 85 screenshots exist and are nonempty',len(screens)==85 and len(set(screens))==85 and all(Path(p).stat().st_size>1000 for p in screens))
layouts=a['layoutChecks']+b['layoutChecks'];interactions=a['interactionChecks']+b['interactionChecks'];verify('Actual case counts match recorded totals',sum(c['type']=='layout' for c in a['checks']+b['checks'])==layouts and sum(c['type']=='interaction' for c in a['checks']+b['checks'])==interactions,dict(layouts=layouts,interactions=interactions))
verify('Toolbar reports current role count','41 个角色视角' in html and '31 个角色视角' not in html)
for name in ['00-开发设计包导读.md','05-UI与交互设计.md','07-开发分解与验收方案.md','15-全角色界面与操作覆盖矩阵.md']:
 s=(root/name).read_text();verify(name+' agrees with actual coverage',all(str(n) in s for n in [41,44,layouts,interactions,85]))
links=[];badlinks=[]
for f in root.glob('*.md'):
 for target in re.findall(r'\]\((?:<([^>]+)>|([^\s)]+))\)',f.read_text()):
  t=target[0] or target[1]
  if not t.startswith('/'):continue
  links.append(t);m=re.match(r'^(.*?)(?::(\d+))?$',t);p=Path(m.group(1))
  if not p.exists():badlinks.append(dict(document=f.name,target=t,reason='missing'))
  elif m.group(2) and p.is_file() and int(m.group(2))>len(p.read_text(errors='replace').splitlines()):badlinks.append(dict(document=f.name,target=t,reason='line_out_of_range'))
verify('All local Markdown links and line anchors resolve',not badlinks,dict(count=len(links),errors=badlinks))
sources=['contracts/authz/platform-roles.yaml','contracts/authz/actions.yaml','docs/security/business-role-ui-projection-matrix.md','docs/ui/information-architecture.md','docs/ui/prototype-screenshot-acceptance-matrix.md'];sourcehashes={s:sha(repo/s) for s in sources};doc=(root/'15-全角色界面与操作覆盖矩阵.md').read_text();verify('Role source hashes match current source files',all(v in doc for v in sourcehashes.values()))
result=dict(revision='v2.4',passed=all(c['passed'] for c in checks),checks=checks,localLinks=len(links),sourceHead=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),sourceHashes=sourcehashes,coverage=dict(profiles=41,humanRoleKeys=44,serviceRoleKeys=1,requirements=153,domains=21,pageGroups=22,layoutChecks=layouts,interactionChecks=interactions,screenshots=85),htmlSha256=sha(root/'08-人员数字员工协作交互原型.html'),limitations=['Local prototype and documentation validation; no production permission verification, real role login, model/runtime execution or deployment.'])
(root/'validation/v24-document-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(dict(passed=result['passed'],checks=len(checks),coverage=result['coverage'],localLinks=len(links),failures=[c for c in checks if not c['passed']]),ensure_ascii=False));sys.exit(0 if result['passed'] else 1)
