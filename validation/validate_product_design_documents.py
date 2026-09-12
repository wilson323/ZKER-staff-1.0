"""Independent source-preservation and reference checks, not product acceptance."""
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import unquote, urlsplit
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'docs/设计包'
OUT = ROOT / 'validation/product-design-document-check.json'
checks = []
def read(p):
    return json.loads(p.read_text())
def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
def check(name, passed, detail=None):
    checks.append({'name': name, 'pass': bool(passed), 'detail': detail})
def unique(rows, key='id'):
    return len(rows) == len({x[key] for x in rows})

OUT.write_text(json.dumps({'status': 'RUNNING', 'scope': 'DESIGN_DOCUMENTS_ONLY'}))
source = read(BASE / '10-需求追踪数据.json')
roles = read(BASE / '17-角色需求与验收追踪.json')
fixtures = read(BASE / '16-角色视角与权限演示数据.json')
oa = read(BASE / '21-OA需求细化与验收追踪.json')
forms = read(BASE / '24-业务模板字段候选.json')
trace = read(BASE / '30-产品设计追踪数据.json')
state = read(ROOT / 'validation/product-design-task-state.json')
documents = sorted(p for p in BASE.glob('*.md') if re.match(r'(26|27|28|29|32|33|34|35)-', p.name))
texts = {p.name: p.read_text() for p in documents}
case_text = texts['28-开发分期与验收用例.md']
contract_text = texts['27-逻辑数据模型与接口契约.md']
case_ids = set(re.findall(r'^\| (AC-\d+)\b', case_text, re.M))
command_ids = set(re.findall(r'^\| (C\d+)\b', contract_text, re.M))
req_ids = {x['id'] for x in source['requirements']}
page_ids = {x[0] for x in source['pages']}
role_ids = {x['profileId'] for x in roles['profiles']}
check('153 original requirements preserved in order and bytes-equivalent JSON values',
      [x['sourceRecord'] for x in trace['requirements']] == source['requirements'])
check('153 original requirement IDs and priorities unchanged',
      [(x['id'], x['priority']) for x in trace['requirements']] == [(x['id'], x['priority']) for x in source['requirements']])
check('21 domain records preserved', [x['sourceRecord'] for x in trace['domains']] == source['domains'])
check('22 page records preserved', [x['sourceRecord'] for x in trace['pages']] == source['pages'])
check('10 market refinements preserved', [x['sourceRecord'] for x in trace['marketRefinements']] == source['marketRefinements'])
check('28 OA refinements preserved', [x['sourceRecord'] for x in trace['oaRefinements']] == oa['refinements'])
check('business template source preserved', trace['businessFormSource'] == forms)
check('41 role profiles and stories preserved',
      all(all(new[k] == old[k] for k in old) for old, new in zip(roles['profiles'], trace['roleProfiles']))
      and [x['sourceStory'] for x in trace['roleProfiles']] == roles['roleStories'])
keys = sorted({k for x in roles['profiles'] for k in x['canonicalRoles']})
check('44 human role keys and service identity boundaries preserved', keys == trace['historicalHumanRoleKeys']
      and fixtures['canonicalFixtures'] == trace['historicalCanonicalFixtures']
      and fixtures['nonHumanRoles'] == trace['nonHumanRoles'])
actual_counts = {'requirements': len(trace['requirements']), 'aiEnhancements': len(trace['aiEnhancements']),
 'domains': len(trace['domains']), 'pageGroups': len(trace['pages']), 'roleProfiles': len(trace['roleProfiles']),
 'historicalHumanRoleKeys': len(keys), 'marketRefinements': len(trace['marketRefinements']),
 'oaRefinements': len(trace['oaRefinements']), 'formTemplates': len(forms['templates']),
 'sampleFormFields': sum(len(x) for x in forms['templates'].values()), 'crossDomainAcceptanceCases': len(case_ids),
 'workspaceRefinements':len(trace['workspaceRefinements'])}
check('reported counts computed from sources and actual definitions', trace['counts'] == actual_counts, actual_counts)
check('72 acceptance definitions unique and complete', case_ids == {f'AC-{i:02}' for i in range(1,73)}
      and len(re.findall(r'^\| AC-\d+\b', case_text, re.M)) == 72)
check('31 logical command groups defined', command_ids == {f'C{i:02}' for i in range(1,32)}, sorted(command_ids))
check('12 separate AI requirements', {x['id'] for x in trace['aiEnhancements']} == {f'AI-{i:02}' for i in range(1,13)})
role_by_req = {x['requirementId']: x for x in roles['requirements']}
for r in trace['requirements']:
    check(r['id'] + ' story and linkage', bool(r['userStory'] and r['sourceGiven'] and r['sourceAcceptance'] and r['sourceNegative'])
          and set(r['pageIds']) <= page_ids and r['roleProfiles'] == role_by_req[r['id']]['roleProfiles']
          and set(r['commandIds']) <= command_ids and set(r['caseIds']) <= case_ids
          and len(r['designRefs']) >= 3)
    check(r['id'] + ' no product acceptance promotion', r['productEvidence'] == [] and r['implementationRefs'] == []
          and r['implementationStatus'] == 'NOT_IMPLEMENTED_IN_THIS_PROJECT')
for collection in ['requirements','domains','pages','marketRefinements','oaRefinements','aiEnhancements','acceptanceCases']:
    check(collection + ' IDs unique', unique(trace[collection]))
for r in trace['aiEnhancements']:
    check(r['id'] + ' full scenario and references', all(r.get(k) for k in ['userStory','given','when','then','negative','source','designRefs'])
          and set(r['pageIds']) <= page_ids and set(r['caseIds']) <= case_ids and set(r['commandIds']) <= command_ids
          and not r['productEvidence'])
check('8 workspace refinements unique and complete', {x['id'] for x in trace['workspaceRefinements']} == {f'EW-{i:02}' for i in range(1,9)}
      and unique(trace['workspaceRefinements']))
for r in trace['workspaceRefinements']:
    check(r['id']+' story, permissions and original requirement links', all(r.get(k) for k in ['userStory','given','when','then','negative','source','clarificationSource','designRefs'])
          and set(r['requirementIds']) <= req_ids and set(r['pageIds']) <= page_ids and set(r['commandIds']) <= command_ids
          and not r['productEvidence'] and r['validationStatus']=='PRODUCT_TESTS_NOT_RUN')
check('8 workspace scenario definitions in design', set(re.findall(r'^\| (EW-\d+)\b',texts['34-任务执行工作台与权限分层设计.md'],re.M)) == {f'EW-{i:02}' for i in range(1,9)})
for collection in ['marketRefinements','oaRefinements']:
    for r in trace[collection]:
        check(r['id'] + ' original requirement and acceptance references', set(r['requirementIds']) <= req_ids and set(r['caseIds']) <= case_ids)
check('all 72 product tests remain NOT_RUN', len(trace['acceptanceCases']) == 72
      and all(x['status'] == 'NOT_RUN' and not x['evidence'] for x in trace['acceptanceCases']))
for rel, expected in state['sourceHashes'].items():
    check('preserved baseline ' + rel, sha(ROOT / rel) == expected)
for rel, expected in trace['sourceHashes'].items():
    p = BASE / rel
    if not p.exists():
        p = ROOT / rel
    check('trace source digest ' + rel, p.exists() and sha(p) == expected)

local_links = []
def validate_link(origin, target):
    target = unquote(target.strip('<>'))
    if target.startswith(('http:', 'https:', 'mailto:', 'app:', 'codex:')):
        return
    path, _, anchor = target.partition('#')
    path = re.sub(r':\d+$', '', path.split('?')[0])
    p = (origin.parent / path).resolve() if path else origin
    ok = p.exists()
    if ok and anchor:
        txt = p.read_text()
        explicit = set(re.findall(r'\bid=["\']([^"\']+)["\']', txt))
        headings = re.findall(r'^#{1,6}\s+(.+)$', txt, re.M)
        slugs = {re.sub(r'[^\w\-\s]', '', h.lower()).replace(' ', '-') for h in headings}
        ok = anchor in explicit | slugs
    local_links.append({'from': str(origin.relative_to(ROOT)), 'target': target, 'pass': ok})
for p in documents + [ROOT/'README.md', ROOT/'CONTEXT.md', ROOT/'项目接续提示词.md', BASE/'00-开发设计包导读.md', ROOT/'history/本轮产品设计需求补充-2026-09-11.md']:
    txt = p.read_text()
    # The migrated part of 00 is intentionally historical. Check the new navigation block.
    if p.name.startswith('00-'):
        txt = txt.split('## 历史导读：')[0]
    no_fences = re.sub(r'```.*?```', '', txt, flags=re.S)
    for match in re.finditer(r'!?\[[^\]\n]*\]\((<[^>]+>|[^)\s]+)\)', no_fences):
        validate_link(p, match.group(1))
def walk(value, key=''):
    if isinstance(value, dict):
        for k,v in value.items():
            walk(v,k)
    elif isinstance(value, list):
        for v in value:
            walk(v,key)
    elif isinstance(value,str) and key in ('designRefs','designRef','ref','source','clarificationSource') and '.md' in value:
        validate_link(BASE/'30-产品设计追踪数据.json',value)
walk(trace)
check('all new-document and trace local links/anchors valid', all(x['pass'] for x in local_links),
      {'checked': len(local_links), 'broken': [x for x in local_links if not x['pass']]})
diagrams = []
for p in documents:
    txt = p.read_text()
    check('balanced Markdown fences ' + p.name, len(re.findall(r'^```',txt,re.M)) % 2 == 0)
    for i, block in enumerate(re.findall(r'```mermaid\s*\n(.*?)```',txt,re.S),1):
        diagrams.append({'file': p.name, 'index': i, 'type': block.splitlines()[0], 'validation': 'source fence and header; no Mermaid renderer executed'})
        check('diagram source ' + p.name + ':' + str(i), block.startswith(('flowchart ','sequenceDiagram','erDiagram','stateDiagram-v2')) and len(block.splitlines()) > 3)
check('24 distinct breakpoint rows', set(re.findall(r'^\| (BP-\d+)\b',texts['32-业务流程图原型图与断点闭环审查.md'],re.M)) == {f'BP-{i:02}' for i in range(1,25)})
html = (BASE/'31-完整产品交互原型.html').read_text()
embedded = json.loads(re.search(r'<script id="design-data" type="application/json">(.*?)</script>',html,re.S).group(1))
check('prototype includes all 22 pages and 41 role views', {x['id'] for x in embedded['pages']} == page_ids
      and {x['profileId'] for x in embedded['roles']} == role_ids)
browser = read(ROOT/'validation/product-design-prototype-check.json')
check('current prototype hash matches successful browser evidence', browser['status'] == 'PASS'
      and browser['prototypeSha256'] == sha(BASE/'31-完整产品交互原型.html') and not browser['productTestsRun'])
check('browser evidence all screenshots exist and no failed checks', all((ROOT/x['path']).is_file() for x in browser['screenshots'])
      and all(x['pass'] for x in browser['checks']) and not browser['pageErrors'])
research = read(ROOT/'validation/ai-ux-research-sources.json')
check('research IDs unique and explicit evidence limitations present', unique(research['sources']) and bool(research['limitations']))
workspace = read(ROOT/'validation/execution-workspace-check.json')
check('workspace browser evidence current and passed', workspace['status']=='PASS' and not workspace['productTestsRun']
      and workspace['prototypeSha256']==sha(BASE/'31-完整产品交互原型.html') and all(x['pass'] for x in workspace['checks']) and not workspace['pageErrors'])
check('workspace screenshot evidence exists', all((ROOT/x['path']).is_file() for x in workspace['screenshots']))
experience = read(ROOT/'validation/ai-experience-check.json')
check('AI experience browser evidence current and passed', experience['status']=='PASS' and not experience['productTestsRun']
      and experience['prototypeSha256']==sha(BASE/'31-完整产品交互原型.html') and all(x['pass'] for x in experience['checks']) and not experience['pageErrors'])
check('AI experience screenshot evidence exists', all((ROOT/x['path']).is_file() for x in experience['screenshots']))
check('all 22 pages have explicit prototype depth without product promotion', {x['pageId'] for x in trace['aiExperienceRevision']['pages']}==page_ids
      and all(x['productStatus']=='NOT_IMPLEMENTED_IN_THIS_PROJECT' for x in trace['aiExperienceRevision']['pages']))
check('six core state flows distinguished from contextual drafts', sum(x['prototypeScope']=='CORE_FICTIONAL_STATE_FLOW' for x in trace['aiExperienceRevision']['pages'])==6)
check('source fragments exactly inlined', all((ROOT/('validation/ai-experience.'+suffix)).read_text() in html for suffix in ['js','css']))
failures = [x for x in checks if not x['pass']]
report = {'schemaVersion': '1.0','checkedAt': datetime.now(timezone.utc).isoformat(), 'status': 'PASS' if not failures else 'FAIL',
 'scope': 'NEW_PRODUCT_DESIGN_DOCUMENTS_AND_LOCAL_PROTOTYPE_REFERENCES_ONLY', 'productTestsRun': False,
 'counts': actual_counts, 'checks': checks, 'failures': failures, 'localLinks': local_links, 'mermaidSources': diagrams,
 'artifactHashes': {str(p.relative_to(ROOT)): sha(p) for p in documents + [BASE/'30-产品设计追踪数据.json', BASE/'31-完整产品交互原型.html']},
 'limitations': ['No real backend, database, model, connector, authorization or production acceptance was run.',
 'Mermaid source structure checked; diagrams not rendered by an independent Mermaid engine.',
 'Browser checks use fictional in-memory scenarios; usability targets require representative users.',
 'Research source facts describe their capture time; local and public StaffDeck versions are not equated.']}
OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':report['status'],'checks':len(checks),'localLinks':len(local_links),'diagrams':len(diagrams),'failures':failures},ensure_ascii=False))
raise SystemExit(bool(failures))
