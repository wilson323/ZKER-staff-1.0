"""Local, stack-neutral workflow checks. No installs, network, Git writes or deploys."""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
CONFIG = 'validation/development-workflow.json'
REPORT = 'validation/development-system-check.json'
OUTPUTS = {REPORT, 'validation/product-design-document-check.json',
           'validation/development-product-check.json'}
IGNORED_DIRS = {'.git', 'node_modules', '.venv', 'venv', '__pycache__',
                'dist', 'build', 'coverage', '.next', '.cache'}


def config(root):
    value = read(root / CONFIG)
    if value.get('projectId') != 'oa-digital-employee-collaboration':
        raise ValueError('project identity mismatch; do not apply this workflow to another project')
    return value


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def save(path, value):
    """Replace only a known local output, never follow a symlink destination."""
    if path.is_symlink():
        raise ValueError(f'symlink output refused: {path.name}')
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent,
                                     delete=False, prefix='.development-') as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
        f.write('\n')
    os.replace(f.name, path)


def local(root, relative):
    if not isinstance(relative, str) or not relative or Path(relative).is_absolute():
        raise ValueError('relative project path required')
    p = (root / relative).resolve()
    if not p.is_relative_to(root.resolve()):
        raise ValueError(f'path escapes project: {relative}')
    return p


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def shared_skill_snapshot(root):
    """Hash explicitly adopted skill files; discovery symlinks alone miss target changes."""
    result = {}
    manifest = root / CONFIG
    skills = read(manifest).get('sharedSkills', []) if manifest.is_file() else []
    names = set()
    for skill in skills:
        name = skill.get('name', '')
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', name) or name in names:
            raise ValueError('invalid or duplicate shared skill name')
        names.add(name)
        base = Path(skill['root']).expanduser()
        if not base.is_absolute() or not base.is_dir():
            raise ValueError('shared skill needs an existing absolute root')
        base = base.resolve()
        files = skill.get('files', [])
        if not files or 'SKILL.md' not in files or len(set(files)) != len(files):
            raise ValueError('shared skill needs unique explicit files including SKILL.md')
        for relative in files:
            path = local(base, relative)
            parts = Path(relative).parts
            if any(base.joinpath(*parts[:i]).is_symlink() for i in range(1, len(parts) + 1)):
                raise ValueError('shared skill internal symlink refused')
            if path.suffix not in {'.md', '.json', '.py', '.yaml'} or not path.is_file():
                raise ValueError('missing or unsupported shared skill file')
            if path.stat().st_size > 524288:
                raise ValueError('shared skill file exceeds bounded input size')
            result[f'@skill/{name}/{relative}'] = digest(path)
    return result


def snapshot(root):
    """Current project inputs, excluding generated receipts and dependency/build trees."""
    result = {}
    for folder, dirs, files in os.walk(root, followlinks=False):
        dirs[:] = sorted(d for d in dirs if d not in IGNORED_DIRS and
                         not (Path(folder) / d).is_symlink())
        for name in sorted(files):
            p = Path(folder) / name
            rel = p.relative_to(root).as_posix()
            if rel in OUTPUTS or name.startswith('.development-') or name.endswith('.pyc'):
                continue
            # Do not read local secrets. Their runtime configuration needs separate evidence.
            if name == '.env' or name.startswith('.env.') and name != '.env.example':
                continue
            result[rel] = ('symlink:' + os.readlink(p)) if p.is_symlink() else digest(p)
    result.update(shared_skill_snapshot(root))
    return result


def freshness(root, report):
    return (report.get('status') == 'PASS' and report.get('scope') == 'LOCAL_DEVELOPMENT_SYSTEM_ONLY'
            and report.get('projectId') == config(root)['projectId']
            and report.get('inputHashes') == snapshot(root))


def task_errors(task, root, trace):
    errors = []
    required = ['id', 'goal', 'scope', 'acceptance_criteria', 'current_node', 'completed_nodes',
                'failed_nodes', 'artifacts', 'evidence', 'risks', 'approvals', 'status', 'nodes',
                'intent', 'spec', 'plan', 'requirementIds', 'caseIds']
    errors += [f'missing task field: {k}' for k in required if k not in task]
    if errors:
        return errors
    if not task['goal'].strip() or not task['acceptance_criteria'] or not task['scope'].get('allowed'):
        errors.append('goal, acceptance and allowed scope must be concrete')
    for part in ('intent', 'spec', 'plan'):
        if not isinstance(task[part], dict) or not any(task[part].values()):
            errors.append(f'{part} needs actual context or a source reference')
    states = {'PENDING', 'RUNNING', 'VERIFIED', 'PARTIAL', 'BLOCKED', 'FAILED'}
    if task['status'] not in states:
        errors.append('invalid task status')
    reqs = {x['id'] for key in ('requirements', 'aiEnhancements', 'workspaceRefinements') for x in trace[key]}
    cases = {x['id'] for x in trace['acceptanceCases']}
    if not set(task['requirementIds']) <= reqs or not set(task['caseIds']) <= cases:
        errors.append('unknown requirement or acceptance ID')
    nodes = task['nodes']
    ids = [n.get('id') for n in nodes]
    if not nodes or None in ids or len(set(ids)) != len(ids):
        return errors + ['empty or duplicate node IDs']
    by_id = {n['id']: n for n in nodes}
    fields = ['objective', 'preconditions', 'action', 'tool_or_skill', 'expected_output',
              'validation', 'success_condition', 'failure_path', 'rollback_or_compensation']
    for n in nodes:
        if any(not n.get(k) for k in fields) or n.get('status') not in states:
            errors.append(f'incomplete node: {n["id"]}')
        for dep in n.get('dependsOn', []):
            if dep not in by_id:
                errors.append(f'unknown dependency: {dep}')
            elif n.get('status') == 'VERIFIED' and by_id[dep].get('status') != 'VERIFIED':
                errors.append(f'node verified before dependency: {n["id"]}')
    seen, visiting = set(), set()

    def visit(ident):
        if ident in visiting:
            raise ValueError('task graph cycle')
        if ident in seen or ident not in by_id:
            return
        visiting.add(ident)
        for dep in by_id[ident].get('dependsOn', []):
            visit(dep)
        visiting.remove(ident)
        seen.add(ident)

    try:
        for ident in ids:
            visit(ident)
    except ValueError as e:
        errors.append(str(e))
    final = task.get('final_node', ids[-1])
    ancestors = set()

    def collect(ident):
        if ident in ancestors or ident not in by_id:
            return
        ancestors.add(ident)
        for dep in by_id[ident].get('dependsOn', []):
            collect(dep)

    collect(final)
    if ancestors != set(ids):
        errors.append('every node must reach final acceptance')
    if task['current_node'] not in ids:
        errors.append('unknown current node')
    if set(task['completed_nodes']) != {n['id'] for n in nodes if n.get('status') == 'VERIFIED'}:
        errors.append('completed_nodes disagree with nodes')
    if set(task['failed_nodes']) != {n['id'] for n in nodes if n.get('status') == 'FAILED'}:
        errors.append('failed_nodes disagree with nodes')
    for artifact in task['artifacts'] + task['evidence']:
        try:
            p = local(root, artifact if isinstance(artifact, str) else artifact['path'])
            if not p.is_file():
                errors.append(f'missing artifact: {p.name}')
        except (KeyError, ValueError, TypeError) as e:
            errors.append(f'invalid artifact: {e}')
    if task['status'] == 'VERIFIED' and (task['failed_nodes'] or len(task['completed_nodes']) != len(nodes)
                                       or not task['evidence']):
        errors.append('verified task lacks final evidence or has unfinished nodes')
    return errors


def entry(root):
    cfg = config(root)
    task = read(local(root, cfg['currentTask']))
    return {'projectId': cfg['projectId'], 'actualRoot': str(root),
            'git': 'PRESENT' if (root / '.git').exists() else 'NOT_INITIALIZED',
            'currentTask': cfg['currentTask'], 'taskStatus': task['status'],
            'currentNode': task['current_node'], 'product': cfg['product']['status'],
            'readNext': ['AGENTS.md', '.agents/skills/oa-development-system/SKILL.md',
                         'docs/开发体系.md', cfg['currentTask']],
            'next': '以本次用户目标接续。复杂新任务用 new 建立记录；完成前 make verify。'}


def run(argv, root, timeout=120):
    try:
        p = subprocess.run(argv, cwd=root, capture_output=True, text=True, timeout=timeout)
        return {'command': argv, 'cwd': str(root), 'exitCode': p.returncode,
                'stdout': p.stdout, 'stderr': p.stderr}
    except subprocess.TimeoutExpired:
        return {'command': argv, 'cwd': str(root), 'exitCode': 124, 'stderr': 'TIMEOUT'}
    except OSError as e:
        return {'command': argv, 'cwd': str(root), 'exitCode': 127, 'stderr': str(e)}


def product_errors(cfg, root):
    product = cfg.get('product', {})
    errors = []
    if product.get('status') != 'CONFIGURED' or not product.get('stackDecision'):
        errors.append('M0: selected stack and reviewed decision are not configured')
    elif not local(root, product['stackDecision']).is_file():
        errors.append('stack decision file missing')
    commands = product.get('commands', [])
    needed = {'static', 'build', 'integration', 'business', 'recovery'}
    if {x.get('layer') for x in commands} != needed:
        errors.append('product requires static/build/integration/business/recovery checks')
    for command in commands:
        if not isinstance(command.get('argv'), list) or not command['argv'] or any(
                not isinstance(x, str) or not x for x in command['argv']):
            errors.append('invalid product argv')
        if not command.get('evidence'):
            errors.append('product command requires a structured evidence path')
        else:
            local(root, command['evidence'])
    return errors


def verify(root, product=False):
    started = datetime.now(timezone.utc).isoformat()
    cfg = config(root)
    before = snapshot(root)
    task = read(local(root, cfg['currentTask']))
    trace = read(local(root, cfg['designTrace']))
    errors = task_errors(task, root, trace)
    results = []
    if product:
        errors += product_errors(cfg, root)
        # No command execution while M0 or mandatory evidence configuration is missing.
        if not errors:
            for check in cfg['product']['commands']:
                evidence = local(root, check['evidence'])
                previous = digest(evidence) if evidence.is_file() else None
                result = run(check['argv'], root, check.get('timeoutSeconds', 120))
                results.append(result)
                if result['exitCode'] != 0:
                    errors.append(f'product command failed: {check["layer"]}')
                    break
                receipt = read(evidence) if evidence.is_file() else {}
                if (not receipt or digest(evidence) == previous or receipt.get('status') != 'PASS'
                        or receipt.get('layer') != check['layer'] or not receipt.get('checks')
                        or not all(isinstance(x, dict) and x.get('pass') is True for x in receipt.get('checks', []))
                        or receipt.get('projectId') != cfg['projectId']
                        or not receipt.get('runtimeProvenance') or receipt.get('simulated') is not False):
                    errors.append(f'fresh real product evidence missing: {check["layer"]}')
                    break
    else:
        for argv in ([sys.executable, str(local(root, cfg['designValidator']))],
                     [sys.executable, '-m', 'unittest', 'discover', '-s', 'validation',
                      '-p', 'test_development_workflow.py', '-v']):
            result = run(argv, root)
            results.append(result)
            if result['exitCode'] != 0:
                errors.append('required command failed: ' + ' '.join(argv))
            if 'unittest' in argv and not re.search(r'Ran [1-9]\d* tests?\b', result.get('stderr', '')):
                errors.append('regression discovery ran no tests')
        doc = read(root / 'validation/product-design-document-check.json')
        if (doc.get('status') != 'PASS' or not doc.get('checks') or doc.get('productTestsRun') is not False
                or not all(isinstance(x, dict) and x.get('pass') is True for x in doc.get('checks', []))):
            errors.append('design validator lacks passing scoped checks')
    after = snapshot(root)
    if not product and before != after:
        errors.append('inputs changed during verification; inspect concurrent writes and retry')
    report = {'schemaVersion': 1, 'projectId': cfg['projectId'], 'startedAt': started,
              'checkedAt': datetime.now(timezone.utc).isoformat(),
              'status': 'FAIL' if errors else 'PASS',
              'scope': 'PRODUCT_CONFIGURED_CHECKS_ONLY' if product else 'LOCAL_DEVELOPMENT_SYSTEM_ONLY',
              'productReady': False, 'currentTask': cfg['currentTask'], 'errors': errors,
              'commands': results, 'inputHashes': after,
              'limits': ['No production approval, deployment or complete product acceptance implied.',
                         'Deterministic regressions do not substitute for live agent evaluations.']}
    save(root / ('validation/development-product-check.json' if product else REPORT), report)
    print(json.dumps({k: report[k] for k in ('status', 'scope', 'errors', 'productReady')}, ensure_ascii=False))
    return bool(errors)


def new_task(root, ident, goal):
    root = root.resolve()
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,63}', ident) or not goal or not goal.strip():
        raise ValueError('supply a lowercase task id and concrete goal')
    cfg = config(root)
    old = read(local(root, cfg['currentTask']))
    if old['status'] in {'RUNNING', 'PENDING', 'PARTIAL'}:
        raise ValueError('resume the current unfinished task before starting another')
    path = local(root, 'validation/development-task-' + ident + '.json')
    if path.exists():
        raise ValueError('task already exists; refusing overwrite')
    template = read(root / '.agents/skills/oa-development-system/assets/task-template.json')
    template.update(id=ident, goal=goal.strip(), projectRoot=str(root),
                    createdAt=datetime.now(timezone.utc).isoformat())
    save(path, template)
    cfg['currentTask'] = path.relative_to(root).as_posix()
    save(root / CONFIG, cfg)
    print(cfg['currentTask'] + ': DRAFT; fill scope, intent/spec/plan and acceptance before execution')


def hook(root, event, payload):
    if Path(payload.get('cwd', '/')).resolve() != root.resolve():
        return {'decision': 'block', 'reason': '项目目录不匹配，请核对实际cwd。'} if event == 'Stop' else {}
    if event == 'SessionStart':
        return {'hookSpecificOutput': {'hookEventName': event,
                'additionalContext': json.dumps(entry(root), ensure_ascii=False)}}
    report = read(root / REPORT) if (root / REPORT).is_file() else {}
    if freshness(root, report):
        return {}
    if payload.get('stop_hook_active'):
        # Do not force an endless completion loop. Failure stays visible; no success receipt is made.
        return {'systemMessage': '检查仍未通过或证据过期。结束时报告PARTIAL/BLOCKED及原因，不能声称已验证。'}
    return {'decision': 'block', 'reason': '本项目缺少当前文件版本的通过证据。运行 make verify；无法修复时如实报告阻塞。'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['entry', 'verify', 'product', 'new', 'hook-start', 'hook-stop'])
    parser.add_argument('--id')
    parser.add_argument('--goal')
    args = parser.parse_args()
    try:
        if args.action.startswith('hook-'):
            payload = json.load(sys.stdin)
            event = 'SessionStart' if args.action == 'hook-start' else 'Stop'
            print(json.dumps(hook(ROOT, event, payload), ensure_ascii=False))
        else:
            if Path.cwd().resolve() != ROOT:
                raise ValueError('wrong cwd: run from project root (or use make -C)')
            if args.action == 'entry':
                print(json.dumps(entry(ROOT), ensure_ascii=False, indent=2))
            elif args.action == 'new':
                new_task(ROOT, args.id or '', args.goal or '')
            else:
                return verify(ROOT, product=args.action == 'product')
    except (ValueError, KeyError, TypeError, OSError) as e:
        print(f'WORKFLOW_ERROR: {e}', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
