"""Deterministic regressions in temporary projects; no live model calls."""
from pathlib import Path
import contextlib
import copy
import importlib.util
import io
import json
import re
import subprocess
import sys
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('workflow', Path(__file__).with_name('development_workflow.py'))
w = importlib.util.module_from_spec(spec)
spec.loader.exec_module(w)


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='oa-workflow-test-')
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'validation').mkdir()
        self.cfg = {'projectId': 'oa-digital-employee-collaboration', 'currentTask': 'validation/task.json',
                    'designTrace': 'validation/trace.json',
                    'product': {'status': 'NOT_CONFIGURED', 'commands': []}}
        self.trace = {'requirements': [{'id': 'WD-01'}], 'aiEnhancements': [{'id': 'AI-01'}],
                      'workspaceRefinements': [{'id': 'EW-01'}], 'acceptanceCases': [{'id': 'AC-01'}]}
        self.task = w.read(w.ROOT / '.agents/skills/oa-development-system/assets/task-template.json')
        self.task.update(id='fixture', goal='Test a bounded local change', acceptance_criteria=['observed result'],
                         scope={'allowed': ['source.txt']}, requirementIds=['WD-01'], caseIds=['AC-01'],
                         intent={'source': 'current test request'}, spec={'behavior': 'preserve fixture'},
                         plan={'checks': ['observed output']})
        self.task['nodes'][0].update(objective='write source', preconditions=['local fixture'], action='edit source',
            tool_or_skill='local file tool', expected_output='source file', validation='inspect source',
            success_condition='content correct', failure_path='report failure', rollback_or_compensation='restore fixture')
        w.save(self.root / w.CONFIG, self.cfg)
        w.save(self.root / 'validation/task.json', self.task)
        w.save(self.root / 'validation/trace.json', self.trace)
        (self.root / 'source.txt').write_text('v1')

    def errors(self):
        return w.task_errors(self.task, self.root, self.trace)

    def good_report(self):
        return {'projectId': self.cfg['projectId'], 'status': 'PASS',
                'scope': 'LOCAL_DEVELOPMENT_SYSTEM_ONLY', 'inputHashes': w.snapshot(self.root)}

    def test_valid_dependency_safe_task(self):
        self.assertEqual(self.errors(), [])

    def test_missing_intent_rejected(self):
        del self.task['intent']
        self.assertTrue(self.errors())

    def test_empty_intent_rejected(self):
        self.task['intent'] = {'source': ''}
        self.assertTrue(self.errors())

    def test_different_project_manifest_rejected(self):
        self.cfg['projectId'] = 'another-project'
        w.save(self.root / w.CONFIG, self.cfg)
        with self.assertRaises(ValueError):
            w.entry(self.root)

    def test_empty_acceptance_rejected(self):
        self.task['acceptance_criteria'] = []
        self.assertTrue(self.errors())

    def test_cycle_rejected(self):
        self.task['nodes'][0]['dependsOn'] = ['N2']
        self.assertIn('task graph cycle', self.errors())

    def test_missing_dependency_rejected(self):
        self.task['nodes'][1]['dependsOn'] = ['absent']
        self.assertTrue(self.errors())

    def test_node_outside_final_path_rejected(self):
        self.task['nodes'][1]['dependsOn'] = []
        self.assertIn('every node must reach final acceptance', self.errors())

    def test_premature_node_verification_rejected(self):
        self.task['nodes'][1]['status'] = 'VERIFIED'
        self.task['completed_nodes'] = ['N2']
        self.assertTrue(self.errors())

    def test_completed_projection_must_match(self):
        self.task['completed_nodes'] = ['N1']
        self.assertTrue(self.errors())

    def test_false_final_success_rejected(self):
        self.task['status'] = 'VERIFIED'
        self.assertTrue(self.errors())

    def test_unknown_requirement_rejected(self):
        self.task['requirementIds'] = ['OLD-REPO-999']
        self.assertTrue(self.errors())

    def test_missing_evidence_rejected(self):
        self.task['evidence'] = ['validation/never-written.json']
        self.assertTrue(self.errors())

    def test_artifact_escape_rejected(self):
        self.task['evidence'] = ['../other-project.txt']
        self.assertTrue(self.errors())

    def test_absolute_path_rejected(self):
        with self.assertRaises(ValueError):
            w.local(self.root, str(self.root / 'source.txt'))

    def test_symlink_escape_rejected(self):
        (self.root / 'outside').symlink_to(self.root.parent, target_is_directory=True)
        with self.assertRaises(ValueError):
            w.local(self.root, 'outside/other-project.txt')

    def test_symlink_output_is_not_overwritten(self):
        target = self.root / 'source.txt'
        link = self.root / 'report.json'
        link.symlink_to(target)
        with self.assertRaises(ValueError):
            w.save(link, {'status': 'PASS'})
        self.assertEqual(target.read_text(), 'v1')

    def test_current_report_is_fresh(self):
        self.assertTrue(w.freshness(self.root, self.good_report()))

    def test_changed_file_invalidates_report(self):
        report = self.good_report()
        (self.root / 'source.txt').write_text('v2')
        self.assertFalse(w.freshness(self.root, report))

    def test_added_file_invalidates_report(self):
        report = self.good_report()
        (self.root / 'new.txt').write_text('new')
        self.assertFalse(w.freshness(self.root, report))

    def test_removed_file_invalidates_report(self):
        report = self.good_report()
        (self.root / 'source.txt').unlink()
        self.assertFalse(w.freshness(self.root, report))

    def test_failed_or_wrong_scope_report_rejected(self):
        for key, val in [('status', 'FAIL'), ('scope', 'PRODUCT_READY'), ('projectId', 'other')]:
            with self.subTest(key=key):
                report = self.good_report()
                report[key] = val
                self.assertFalse(w.freshness(self.root, report))

    def test_receipt_write_does_not_self_invalidate(self):
        report = self.good_report()
        w.save(self.root / w.REPORT, report)
        self.assertTrue(w.freshness(self.root, report))

    def test_start_hook_returns_shared_entry(self):
        out = w.hook(self.root, 'SessionStart', {'cwd': str(self.root)})
        ctx = json.loads(out['hookSpecificOutput']['additionalContext'])
        self.assertEqual(ctx['currentTask'], self.cfg['currentTask'])
        self.assertIn('.agents/skills/oa-development-system/SKILL.md', ctx['readNext'])

    def test_stop_hook_blocks_missing_receipt(self):
        self.assertEqual(w.hook(self.root, 'Stop', {'cwd': str(self.root)})['decision'], 'block')

    def test_stop_hook_allows_current_receipt(self):
        w.save(self.root / w.REPORT, self.good_report())
        self.assertEqual(w.hook(self.root, 'Stop', {'cwd': str(self.root)}), {})

    def test_stop_hook_has_bounded_failure_path(self):
        out = w.hook(self.root, 'Stop', {'cwd': str(self.root), 'stop_hook_active': True})
        self.assertNotIn('decision', out)
        self.assertIn('PARTIAL/BLOCKED', out['systemMessage'])

    def test_hook_rejects_different_project_cwd(self):
        out = w.hook(self.root, 'Stop', {'cwd': str(self.root.parent)})
        self.assertEqual(out['decision'], 'block')

    def test_empty_product_profile_cannot_pass(self):
        self.assertTrue(w.product_errors(self.cfg, self.root))

    def test_command_failure_and_timeout_preserved(self):
        failed = w.run([sys.executable, '-c', 'raise SystemExit(7)'], self.root)
        timed = w.run([sys.executable, '-c', 'import time; time.sleep(1)'], self.root, timeout=0.02)
        self.assertEqual(failed['exitCode'], 7)
        self.assertEqual(timed['exitCode'], 124)

    def test_executable_missing_not_success(self):
        self.assertEqual(w.run([str(self.root / 'missing')], self.root)['exitCode'], 127)

    def test_product_zero_exit_without_evidence_rejected(self):
        (self.root / 'decision.md').write_text('test-only fixture decision')
        self.cfg['product'] = {'status': 'CONFIGURED', 'stackDecision': 'decision.md', 'commands': [
            {'layer': layer, 'argv': [sys.executable, '-c', 'pass'], 'evidence': f'validation/{layer}.json'}
            for layer in ['static', 'build', 'integration', 'business', 'recovery']]}
        w.save(self.root / w.CONFIG, self.cfg)
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertTrue(w.verify(self.root, product=True))
        report = w.read(self.root / 'validation/development-product-check.json')
        self.assertEqual(report['status'], 'FAIL')

    def test_new_task_does_not_overwrite_unfinished_task(self):
        with self.assertRaises(ValueError):
            w.new_task(self.root, 'new-task', 'real goal')
        self.assertEqual(w.read(self.root / w.CONFIG)['currentTask'], 'validation/task.json')

    def test_new_task_rejects_path_injection(self):
        with self.assertRaises(ValueError):
            w.new_task(self.root, '../outside', 'goal')

    def test_wrong_cwd_fails_real_cli(self):
        result = w.run([sys.executable, str(w.ROOT / 'validation/development_workflow.py'), 'entry'], self.root)
        self.assertEqual(result['exitCode'], 2)
        self.assertIn('wrong cwd', result['stderr'])

    def test_successful_new_task_uses_canonical_template(self):
        self.task['status'] = 'VERIFIED'
        w.save(self.root / 'validation/task.json', self.task)
        target = self.root / '.agents/skills/oa-development-system/assets/task-template.json'
        target.parent.mkdir(parents=True)
        target.write_bytes((w.ROOT / target.relative_to(self.root)).read_bytes())
        with contextlib.redirect_stdout(io.StringIO()):
            w.new_task(self.root, 'new-task', 'next goal')
        new = w.read(self.root / 'validation/development-task-new-task.json')
        self.assertEqual(new['goal'], 'next goal')
        self.assertEqual(new['status'], 'PENDING')
        self.assertTrue(w.task_errors(new, self.root, self.trace))  # draft cannot certify itself


class SharedSkillTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='shared-skill-test-')
        self.addCleanup(self.tmp.cleanup)
        base = Path(self.tmp.name).resolve()
        self.root = base / 'project'
        (self.root / 'validation').mkdir(parents=True)
        self.skill = base / 'test-skill'
        self.skill.mkdir()
        (self.skill / 'SKILL.md').write_text('v1')
        self.spec = {'name': 'test-skill', 'root': str(self.skill), 'files': ['SKILL.md']}
        self.save()

    def save(self):
        w.save(self.root / w.CONFIG, {'sharedSkills': [self.spec]})

    def test_external_change_invalidates_snapshot(self):
        before = w.snapshot(self.root)
        (self.skill / 'SKILL.md').write_text('v2')
        self.assertNotEqual(before, w.snapshot(self.root))

    def test_missing_file_fails(self):
        self.spec['files'].append('missing.md')
        self.save()
        with self.assertRaises(ValueError):
            w.snapshot(self.root)

    def test_escape_fails(self):
        self.spec['files'].append('../outside.md')
        self.save()
        with self.assertRaises(ValueError):
            w.snapshot(self.root)

    def test_internal_symlink_fails(self):
        (self.skill / 'other.md').symlink_to(self.skill / 'SKILL.md')
        self.spec['files'].append('other.md')
        self.save()
        with self.assertRaises(ValueError):
            w.snapshot(self.root)

    def test_empty_files_fail(self):
        self.spec['files'] = []
        self.save()
        with self.assertRaises(ValueError):
            w.snapshot(self.root)

    def test_secret_extension_fails(self):
        (self.skill / '.env').write_text('fixture-only')
        self.spec['files'].append('.env')
        self.save()
        with self.assertRaises(ValueError):
            w.snapshot(self.root)

    def test_duplicate_names_fail(self):
        w.save(self.root / w.CONFIG, {'sharedSkills': [self.spec, self.spec]})
        with self.assertRaises(ValueError):
            w.snapshot(self.root)


class IntegrationFilesTests(unittest.TestCase):
    def test_skill_links_resolve_within_project(self):
        skill = w.ROOT / '.agents/skills/oa-development-system/SKILL.md'
        for link in re.findall(r'\]\(([^)]+)\)', skill.read_text()):
            path = (skill.parent / link.split('#')[0]).resolve()
            self.assertTrue(path.is_relative_to(w.ROOT), link)
            self.assertTrue(path.is_file(), link)

    def test_skill_frontmatter_complete(self):
        text = (w.ROOT / '.agents/skills/oa-development-system/SKILL.md').read_text()
        self.assertTrue(text.startswith('---\nname: oa-development-system\n'))
        self.assertNotIn('[TODO:', text)

    def test_claude_commands_reference_shared_script(self):
        config = w.read(w.ROOT / '.claude/settings.json')
        self.assertEqual(set(config['hooks']), {'SessionStart', 'Stop'})
        for event in config['hooks'].values():
            command = event[0]['hooks'][0]['command']
            self.assertIn('validation/development_workflow.py', command)
            self.assertIn('"$CLAUDE_PROJECT_DIR/', command)

    def test_behavior_evals_do_not_claim_unrun_success(self):
        data = w.read(w.ROOT / 'validation/development-agent-evals.json')
        self.assertEqual(len(data['cases']), len({x['id'] for x in data['cases']}))
        for case in data['cases']:
            if case['status'] == 'PASS':
                self.assertTrue(case['evidence'])


if __name__ == '__main__':
    unittest.main()
