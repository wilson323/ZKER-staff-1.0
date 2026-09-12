"""Check saved research evidence and document scope; never claims runtime acceptance."""
from pathlib import Path
from urllib.parse import unquote, urlsplit
from datetime import datetime, timezone
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'validation/article-review'
checks = []
verified_sources = []


def read(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check(name, ok):
    checks.append({'name': name, 'pass': bool(ok)})


def verify_file(label, path, expected):
    ok = path.is_file() and sha(path) == expected
    check(label, ok)
    if ok:
        verified_sources.append({'path': str(path), 'sha256': expected})


task = read(ROOT / 'validation/development-task-article-architecture-review-20260911.json')
inventory = read(BASE / 'local-inventory.json')
selected = read(BASE / 'selected-articles.json')
counts = inventory['counts']
check('census counts internally consistent', counts['metadata'] == len(inventory['articles']) == 1362
      and counts['groups'] == len(inventory['groups']) == 1211
      and counts['candidateRows'] == 269 and counts['candidateGroups'] == 210)
check('metadata parse errors absent', not inventory['errors'])
check('32 distinct selected article IDs', len(selected) == len({r['id'] for r in selected}) == 32)
full = [r for r in selected if r['reviewStatus'] == 'ALL_EXTRACTED_TEXT_READ']
partial = [r for r in selected if r['reviewStatus'] == 'SELECTED_PASSAGES_READ']
check('reading declarations: 25 full and 7 partial', len(full) == 25 and len(partial) == 7)
for row in selected:
    for key, digest in [('bodyPath', 'bodySha256'), ('metadataPath', 'metadataSha256'),
                        ('extractedTextPath', 'textSha256')]:
        verify_file(row['id'] + ' ' + key, ROOT / row[key], row[digest])
    check(row['id'] + ' report exists', (BASE / row['evidenceReport']).resolve().is_file())

# Only check recorded bytes against the manifests. Fetch success is not body access.
public = read(BASE / 'public/manifest.json')
primary = read(BASE / 'primary-sources/manifest.json')['records']
runtime = read(BASE / 'runtime-sources/manifest.json')
for group, rows in [('public', public), ('primary', primary), ('runtime', runtime)]:
    for row in rows:
        ident = row.get('id', row.get('name', 'source'))
        if row.get('exitCode', 0) != 0:
            check(group + ' failed fetch not credited: ' + ident, not row.get('sha256'))
            continue
        path = ROOT / row['path'] if row.get('path') else BASE / 'runtime-sources' / row['name']
        verify_file(group + ' source SHA: ' + ident, path, row['sha256'])
        if row.get('textPath'):
            verify_file(group + ' extracted SHA: ' + ident, ROOT / row['textPath'], row['textSha256'])
for file, pathkey in [('git-manifest.json', 'path'), ('extracted-manifest.json', 'localPath')]:
    for row in read(BASE / 'runtime-sources' / file):
        if row.get('exitCode', 0) != 0:
            check('failed git fetch excluded', not row.get('sha256'))
        else:
            verify_file('runtime ' + file + ':' + row[pathkey], ROOT / row[pathkey], row['sha256'])

kbs = read(BASE / 'ima/knowledge-bases.json')
searches = read(BASE / 'ima/article-searches.json')
ima_selected = read(BASE / 'ima/selected.json')
check('IMA inventory: 125 visible libraries', len(kbs) == 125)
check('IMA search scope: 14 queries / 10 libraries / 406 rows / 402 IDs',
      len(searches) == 14 and len({r['knowledgeBase'] for r in searches}) == 10
      and sum(len(r['entries']) for r in searches) == 406
      and len({e['media_id'] for r in searches for e in r['entries']}) == 402)
check('IMA query pagination caveat preserved', sum(r['stopReason'] == 'END' for r in searches) == 2
      and sum('NO_PAGINATION_FIELDS' in r['stopReason'] for r in searches) == 12)
check('IMA metadata not treated as body', len(ima_selected) == 12
      and all(r['reviewStatus'] == 'METADATA_ONLY_NOT_BODY_REVIEWED' for r in ima_selected)
      and sum(r['relevant'] for r in ima_selected) == 11
      and sum(r['bodyStatus'] == 'SUBSCRIPTION_BODY_PERMISSION_DENIED' for r in ima_selected) == 10
      and sum(r['bodyStatus'] == 'ORIGINAL_WECHAT_CHALLENGE_PAGE' for r in ima_selected) == 2)
check('HTTP success semantic boundaries preserved', all(
    r['semanticStatus'] == ('CHALLENGE_NOT_ARTICLE' if r['id'].startswith('IMA-')
                            else 'MOVED_NOTICE_NOT_CURRENT_SPEC')
    for r in public if r['id'].startswith('IMA-') or r['id'] in ['otel-genai', 'otel-genai-events']))

install = read(BASE / 'ima-install/installation-check.json')
pkg = read(BASE / 'ima-install/package-check.json')
auth = read(BASE / 'ima-install/auth-check.json')
verify_file('IMA official ZIP SHA', BASE / 'ima-install/ima-skills-1.1.9.zip', pkg['archiveSha256'])
check('IMA installed 1.1.9 and local fix preserved', install['version'] == '1.1.9'
      and not install['skillFilesChanged'] and pkg['fileCount'] == 12
      and pkg['identical'] == 11 and pkg['missing'] == 0)
check('IMA read-only authenticated', auth['businessCode'] == 0
      and auth['readOnlyAuthentication'] and auth['credentialValuesLogged'] is False)
config_dir = Path.home() / '.config/ima'
check('credential filesystem modes', config_dir.stat().st_mode & 0o777 == 0o700
      and all((config_dir / n).stat().st_mode & 0o777 == 0o600 for n in ['api_key', 'client_id']))

for rel, expected in task['baseline'].items():
    if Path(rel).name.startswith(('30-', '31-')):
        check('original unchanged: ' + rel, sha(ROOT / rel) == expected)
trace = read(ROOT / 'docs/设计包/30-产品设计追踪数据.json')
check('173 requirements / 22 pages / 72 original cases preserved',
      sum(len(trace[k]) for k in ['requirements', 'aiEnhancements', 'workspaceRefinements']) == 173
      and len(trace['pages']) == 22 and len(trace['acceptanceCases']) == 72)
check('original product cases NOT_RUN', all(c['status'] == 'NOT_RUN' and not c['evidence']
                                          for c in trace['acceptanceCases']))
product = read(ROOT / 'validation/development-workflow.json')['product']
check('product remains unconfigured', product['status'] == 'NOT_CONFIGURED' and product['stackDecision'] is None)

documents = [ROOT / s for s in task['scope']['allowed'] if s.endswith('.md')]
documents += [BASE / 'article-catalog.md', BASE / 'primary-simplification-review.md',
              BASE / 'runtime-article-review.md']
texts = {}
for p in documents:
    body = p.read_text()
    texts[p.name] = body
    check('balanced code fences: ' + p.name, len(re.findall(r'^```', body, re.M)) % 2 == 0)
    refs = dict(re.findall(r'^\[([^\]]+)\]:\s*(\S+)', body, re.M))
    for name in re.findall(r'\[[^\]]+\]\[([^\]]+)\]', body):
        check('reference defined: ' + p.name + ':' + name, name in refs)
    for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)', body) + list(refs.values()):
        target = target.strip('<>')
        parsed = urlsplit(target)
        if not parsed.scheme and parsed.path:
            # The output report is created at the end of this very check.
            dest = (p.parent / unquote(parsed.path)).resolve()
            check('local link exists: ' + p.name + ':' + target,
                  dest.exists() or dest == BASE / 'review-check.json')
for p in documents:
    if p.name.startswith(('59-', '60-')):
        check('new design discloses unrun boundaries: ' + p.name,
              all(x in texts[p.name] for x in ['NOT_IMPLEMENTED', 'BENCHMARK_NOT_RUN', 'RELEASE_NOT_CLEARED']))
design = texts['60-最小技术方案与验证决策.md']
for term in ['仍有效且当前获准', '明确表达的个人偏好', '估算/待核', '基线不合格',
             '不能默认1.0', 'dry-run', '一个挑战者', 'policyRevision']:
    check('review correction represented (text only): ' + term, term in design or any(term in t for t in texts.values()))
for name, prefix in [('56-知识记忆技术栈与实施决策.md', 'KM-P'), ('58-Agent技术架构与性能实施设计.md', 'AR-P')]:
    cases = re.findall(r'^\| (' + prefix + r'\d{2}) \|', texts[name], re.M)
    check('existing 30 distinct cases retained: ' + prefix, len(cases) == len(set(cases)) == 30)

# Secret comparison happens in memory; neither values nor hashes are included in output.
secrets = [(config_dir / n).read_bytes().strip() for n in ['api_key', 'client_id']]
paths = set(documents) | set(BASE.rglob('*.json')) | set(BASE.rglob('*.py')) | set(BASE.rglob('*.md'))
paths.add(ROOT / 'validation/check_article_review.py')
leaks = [str(p.relative_to(ROOT)) for p in paths if p.is_file()
         and any(s and s in p.read_bytes() for s in secrets)]
check('provided credentials absent from generated research text', not leaks)

errors = [r['name'] for r in checks if not r['pass']]
report = {'status': 'FAIL' if errors else 'PASS', 'scope': 'RESEARCH_EVIDENCE_AND_DOCUMENT_INTEGRITY_ONLY',
          'checkedAt': datetime.now(timezone.utc).isoformat(), 'checks': checks, 'errors': errors,
          'uniqueEvidenceFiles': len({r['path'] for r in verified_sources}),
          'documents': [{'path': str(p.relative_to(ROOT)), 'sha256': sha(p)} for p in documents],
          'localReading': {'selected': 32, 'fullExtractedText': 25, 'partialText': 7, 'imagesVerified': False},
          'imaBodiesRead': 0, 'imaAuthenticationPassed': auth['businessCode'] == 0,
          'productTestsRun': False, 'benchmarksRun': False, 'productReady': False,
          'boundary': 'SHA and text checks do not prove article claims, runtime behavior, or commercial release clearance'}
(BASE / 'review-check.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: report[k] for k in ['status', 'scope', 'uniqueEvidenceFiles', 'errors', 'productReady']}, ensure_ascii=False))
sys.exit(bool(errors))
