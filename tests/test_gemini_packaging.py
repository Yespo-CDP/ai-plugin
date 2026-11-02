"""Offline Gemini artifact checks; no tenant, credentials or shared MCP writes."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import build_gemini_skills as gemini
from build_release import build as release_build, verify as release_verify


class GeminiPackagingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.temp.cleanup)
        cls.root = Path(cls.temp.name).resolve()
        cls.source = cls.root / 'release'
        cls.original = release_build(ROOT, cls.source)

    def test_deterministic_kits_and_source_preservation(self):
        for target in ('apps', 'enterprise'):
            with self.subTest(target=target):
                one, two = self.root / f'{target}-one', self.root / f'{target}-two'
                report = gemini.build(self.source, one, target)
                gemini.build(self.source, two, target)
                self.assertEqual((one / 'manifest.json').read_bytes(), (two / 'manifest.json').read_bytes())
                self.assertEqual(set(report['skills']), set(gemini.SKILLS))
                self.assertEqual(report['target'], target)
                for skill, record in report['skills'].items():
                    self.assertEqual((one / record['archive']).read_bytes(), (two / record['archive']).read_bytes())
                    with zipfile.ZipFile(one / record['archive']) as archive:
                        expected = {f'{skill}/{name}' for name in record['files']}
                        self.assertEqual(set(archive.namelist()), expected)
                        self.assertEqual(len(archive.namelist()), len(expected))
                        self.assertLessEqual(len(expected), 100)
                        self.assertEqual(sum(Path(n).name == 'SKILL.md' for n in expected), 1)
                        for name, item in record['files'].items():
                            data = archive.read(f'{skill}/{name}')
                            self.assertEqual(data, (one / skill / name).read_bytes())
                            self.assertEqual(gemini.sha(data), item['sha256'])
                            if 'origin' in item:
                                original = (self.source / item['origin']['source']).read_bytes()
                                self.assertEqual(gemini.sha(original), item['origin']['sha256'])
                                if name not in ('SKILL.md', 'OPERATING_MANUAL.md', 'scripts/run_sdk.js'):
                                    self.assertEqual(data, original)
                gemini.build(self.source, one, target, verify_only=True)
        self.assertEqual(release_verify(self.source), self.original)

    def test_verify_detects_modified_missing_extra_or_linked_output(self):
        for change in ('modified', 'missing', 'extra', 'symlink'):
            with self.subTest(change=change):
                dest = self.root / change
                gemini.build(self.source, dest, 'enterprise')
                path = dest / 'actions.json'
                if change == 'modified':
                    path.write_text('{}')
                elif change == 'missing':
                    path.unlink()
                elif change == 'extra':
                    (dest / 'secret.txt').write_text('not in kit')
                else:
                    path.unlink()
                    path.symlink_to(ROOT / 'docs/gemini-enterprise/actions.json')
                with self.assertRaises(ValueError):
                    gemini.build(self.source, dest, 'enterprise', verify_only=True)

    def test_bad_source_or_existing_destination_is_not_modified(self):
        dest = self.root / 'existing'
        dest.mkdir()
        (dest / 'keep').write_text('unchanged')
        with self.assertRaisesRegex(ValueError, 'already exists'):
            gemini.build(self.source, dest)
        self.assertEqual([p.name for p in dest.iterdir()], ['keep'])
        bad = self.root / 'bad-source'
        shutil.copytree(self.source, bad)
        (bad / 'skills/segment-designer/SKILL.md').write_text('changed')
        with self.assertRaises(ValueError):
            gemini.build(bad, self.root / 'must-not-exist')
        self.assertFalse((self.root / 'must-not-exist').exists())
        with self.assertRaisesRegex(ValueError, 'outside'):
            gemini.build(self.source, self.source / 'nested')
        (self.root / 'spare').mkdir()
        with self.assertRaisesRegex(ValueError, 'outside'):
            gemini.build(self.source, self.root / 'spare' / '..' / 'release' / 'nested')
        alias = self.root / 'alias'
        alias.symlink_to(self.root, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'Symlink'):
            gemini.build(self.source, alias / 'linked-output')

    def test_archive_constraints_fail_closed(self):
        good = {'SKILL.md': b'---\nname: test-skill\ndescription: Test\n---\nBody'}
        gemini.validate_payload('test-skill', good)
        cases = [
            {**good, **{f'{n}.md': b'x' for n in range(100)}},
            {**good, 'nested/SKILL.md': good['SKILL.md']},
            {**good, '../escape.md': b'x'},
            {**good, '/absolute.md': b'x'},
            {**good, '/'.join(['deep'] * 11) + '/file.md': b'x'},
            {**good, 'unsupported.bin': b'x'},
            {'SKILL.md': good['SKILL.md'].replace(b'description: Test', b'description: ' + b'x' * 1025)},
            {'SKILL.md': good['SKILL.md'] + b'x' * 500001},
        ]
        for payload in cases:
            with self.subTest(paths=list(payload)[:2]), self.assertRaises(ValueError):
                gemini.validate_payload('test-skill', payload)

    def test_enterprise_scope_and_local_runner_are_consistent(self):
        dest = self.root / 'runner'
        gemini.build(self.source, dest, 'enterprise')
        actions = json.loads((dest / 'actions.json').read_text())
        tools = [tool for group in actions['groups'] for tool in group['tools']]
        self.assertEqual(len(tools), len(set(tools)))
        self.assertLessEqual(len(tools), 100)
        writes = {tool for group in actions['groups'] if group['effect'] == 'write' for tool in group['tools']}
        self.assertEqual(writes, {'create_workflow', 'update_workflow'})
        self.assertTrue(set(actions['notSelected']['segmentPreparation']).isdisjoint(tools))
        with zipfile.ZipFile(dest / 'segment-designer.zip') as archive:
            instructions = archive.read('segment-designer/SKILL.md').decode()
            self.assertIn('inspection and explanation only', instructions)
            self.assertIn('Do not execute Node via Bash', instructions)
            self.assertFalse(any(n.endswith(('.js', '.mjs')) or '/packages/' in n for n in archive.namelist()))
        # Consumer relocation still works locally; Enterprise deliberately omits this runtime.
        apps = self.root / 'runner-apps'
        gemini.build(self.source, apps, 'apps')
        runner = (apps / 'segment-designer/scripts/run_sdk.js').as_uri()
        result = subprocess.run(['node', '--input-type=module', '-e',
            f'import {{completedCount, verifyBaseline}} from {json.dumps(runner)}; '
            'if (completedCount({totalCount:0}).totalCount !== 0) throw Error("count"); '
            'try {verifyBaseline("stale", {}); throw Error("accepted")} catch(e) {if(e.message==="accepted") throw e;}'],
            capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    unittest.main()
