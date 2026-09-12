"""Validate saved public evidence and design integrity, not runtime performance."""
from pathlib import Path
from urllib.parse import urlsplit, unquote
from datetime import datetime, timezone
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'validation/agent-runtime'
checks, sources, fetch_failures = [], [], []


def load(p):
    return json.loads(p.read_text())


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def check(name, ok):
    checks.append({'name': name, 'pass': bool(ok)})


def canonical(url):
    return url.replace('https://raw.githubusercontent.com/', 'https://github.com/').replace('/blob/', '/')


manifests = ['source-manifest.json', 'git-source-manifest.json', 'staffdeck-source-manifest.json',
             'codex-source-manifest.json', 'dsh-pi-sources/manifest.json']
for manifest in manifests:
    for row in load(BASE / manifest):
        if row.get('exit', 0) != 0:
            fetch_failures.append({'url': row['url'], 'exit': row['exit'], 'error': row.get('error', '')})
            check('failed fetch not credited: ' + row['url'], not row.get('sha256'))
            continue
        rel = row.get('file', row.get('path'))
        p = ROOT / rel
        ok = p.is_file() and row.get('sha256') == sha(p)
        check('source SHA: ' + rel, ok)
        if row.get('commit'):
            check('source commit: ' + rel, bool(re.fullmatch('[0-9a-f]{40}', row['commit']))
                  and row['commit'] in row['url'])
        if ok:
            sources.append({'path': rel, 'url': row['url'], 'sha256': row['sha256']})

source_urls = {canonical(s['url']) for s in sources}
task = load(ROOT / 'validation/development-task-agent-runtime-research-20260911.json')
for rel, before in task['baseline'].items():
    if Path(rel).name.startswith(('30-', '31-')):
        check('original artifact unchanged: ' + rel, sha(ROOT / rel) == before)
trace = load(ROOT / 'docs/设计包/30-产品设计追踪数据.json')
check('173 requirements preserved', sum(len(trace[k]) for k in
      ['requirements', 'aiEnhancements', 'workspaceRefinements']) == 173)
check('22 pages preserved', len(trace['pages']) == 22)
check('72 original cases unrun', len(trace['acceptanceCases']) == 72 and
      all(c['status'] == 'NOT_RUN' and not c['evidence'] for c in trace['acceptanceCases']))
product = load(ROOT / 'validation/development-workflow.json')['product']
check('product not configured', product['status'] == 'NOT_CONFIGURED' and product['stackDecision'] is None)

documents = [ROOT / s for s in task['scope']['allowed'] if s.endswith('.md')]
documents += [BASE / 'dsh-pi-research.md']
texts = {}
for p in documents:
    text = p.read_text()
    texts[p.name] = text
    check('balanced fences: ' + p.name, len(re.findall(r'^```', text, re.M)) % 2 == 0)
    refs = dict(re.findall(r'^\[([^\]]+)\]:\s*(\S+)', text, re.M))
    for ref in re.findall(r'\[[^\]]+\]\[([^\]]+)\]', text):
        check('defined reference: ' + p.name + ':' + ref, ref in refs)
    targets = re.findall(r'\[[^\]]+\]\(([^)]+)\)', text) + list(refs.values())
    for target in targets:
        target = target.strip('<>')
        url = urlsplit(target)
        if not url.scheme and url.path:
            check('local target: ' + p.name + ':' + target, (p.parent / unquote(url.path)).resolve().exists())
        # Require primary fixed source links in new research to be backed by
        # captured bytes. Historical references in older docs keep their scope.
        if p.name.startswith(('57-', '58-', 'dsh-pi-')) and re.search(r'github.com/[^/]+/[^/]+/blob/[0-9a-f]{40}/', target):
            check('fixed citation captured: ' + target, canonical(target) in source_urls)

research = texts['57-Agent运行框架最新源码研究.md']
design = texts['58-Agent技术架构与性能实施设计.md']
cases = re.findall(r'^\| (AR-P\d{2}) \|', design, re.M)
check('30 distinct runtime POC cases', len(cases) == 30 and set(cases) == {f'AR-P{i:02}' for i in range(1, 31)})
check('runtime cases explicitly unrun', '状态全部`NOT_RUN`' in design)
check('two architecture and sequence diagrams', design.count('```mermaid') == 2)
for term in ['DSH', 'pi', 'Codex', 'QoderWake', 'StaffDeck', 'LangChain4j']:
    check('comparison topic: ' + term, term in research)
for term in ['logical_action_id', 'fence', 'RESULT_UNKNOWN', 'policyRevision', 'model_request_count',
             '审批Promise', '锁已释放', '父Attempt', 'viewRevision', '预算', 'Little', 'C09—C12']:
    check('design topic (not behavior proof): ' + term, term in design)
for p in documents:
    if p.name.startswith(('57-', '58-')):
        check('implementation boundary: ' + p.name, 'NOT_IMPLEMENTED' in p.read_text()
              and 'RELEASE_NOT_CLEARED' in p.read_text())
check('performance explicitly not measured', 'BENCHMARK_NOT_RUN' in design)
check('DSH release channels separated', 'npm latest仍0.1.5-rc.1' in research and 'Git标签0.1.5-rc.2' in research)
check('DSH local lock not distributed lease', '跨主机共享文件系统' in research and 'TTL' in research)
check('pi npm prefix corrected', '@mariozechner' in research and '@badlogic包' not in research)
check('StaffDeck actual AGPL', 'GNU AFFERO GENERAL PUBLIC LICENSE' in (BASE / 'staffdeck-source/LICENSE').read_text())
check('StaffDeck license disclosed', 'AGPLv3' in research and '整库' in research)
check('Codex actual Apache license', 'Apache License' in (BASE / 'codex-source/LICENSE').read_text())
check('Codex daemon isolation caveat captured', 'per-client environment isolation is not provided' in
      (BASE / 'codex-source/codex-rs/app-server-daemon/README.md').read_text())
check('Codex remote caveat disclosed', '实验性' in research and '非loopback' in research)

failures = [c['name'] for c in checks if not c['pass']]
report = {
    'scope': 'AGENT_RUNTIME_RESEARCH_AND_DESIGN_ONLY',
    'checkedAt': datetime.now(timezone.utc).isoformat(),
    'status': 'FAIL' if failures else 'PASS', 'checksPassed': len(checks) - len(failures),
    'checkCount': len(checks), 'failures': failures, 'checks': checks,
    'sourceRecordsVerified': len(sources), 'sources': sources, 'failedFetches': fetch_failures,
    'documents': [{'path': str(p.relative_to(ROOT)), 'sha256': sha(p)} for p in documents],
    'runtimeCases': [{'id': c, 'status': 'NOT_RUN'} for c in cases],
    'productTestsRun': False, 'benchmarkRun': False, 'commercialReleaseCleared': False,
    'limitations': [
        'Saved source integrity and document structure only; no candidate execution or model calls.',
        'Semantic conclusions were reviewed against source separately; keyword checks are not safety proof.',
        'New Mermaid source blocks were structurally checked, not browser-rendered.',
        'Performance formula and targets are design assumptions, not measurements.',
        'Public source archives are research evidence and are not approved product distribution contents.'
    ]
}
(BASE / 'research-check.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: report[k] for k in ['status', 'scope', 'checksPassed', 'checkCount',
                 'sourceRecordsVerified', 'failures']}, ensure_ascii=False, indent=2))
sys.exit(bool(failures))
