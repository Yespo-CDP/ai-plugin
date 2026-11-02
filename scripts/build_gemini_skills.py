#!/usr/bin/env python3
"""Build or verify Gemini skill ZIPs from a verified public release (offline)."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import zipfile
from build_release import check_root, relative_path, require, verify

SKILLS = ('email-deliverability', 'yespo-analytics', 'segment-designer', 'workflow-designer')
ROOT = Path(__file__).resolve().parents[1]
KIT_FILES = ('README.md', 'actions.json', 'ACCEPTANCE.md')
COMMON = '''## Gemini host requirements

Use the user's connected Yespo/eSputnik app for authenticated tools. These uploaded instructions do not themselves connect MCP or grant access. If the live tool is absent, report it as unavailable; do not invent a result, ask for API keys, or use direct API requests as a substitute.

Gemini skill scripts cannot access the internet. Retrieve signed report/catalog/graph artifacts only through an available host file-retrieval capability. If that capability is unavailable, report the dependent operation blocked; do not execute curl or Python HTTP downloads. Local runtime execution is a separate capability: verify it before claiming preparation or validation succeeded.
'''
EXTRA = {
    'email-deliverability': '''For this Gemini installation, perform the MCP configuration inspection when available. The bundled Python helper's live DNS/TLS probes require network access and cannot run in Gemini's restricted script environment. Mark those checks unavailable, not passed or failed. Do not try to install dependencies from the internet or substitute invented DNS/TLS evidence. The full helper remains bundled as a reference for an approved external runtime. This host limitation takes precedence over the generic execution instructions below.\n''',
    'segment-designer': '''The SDK is bundled inside this skill at `packages/segment-designer-sdk/`. The Gemini runner is `scripts/run_sdk.js`; invoke it from the extracted skill root with `node scripts/run_sdk.js prepare request.json prepared.json`. Confirm a Node.js runtime is actually available. If it is not, stop at inspection/planning and do not hand-build JSON as a substitute for SDK validation.\n''',
}
ENTERPRISE = '''## Gemini Enterprise requirements

Use the selected Yespo/eSputnik OAuth MCP connector in the Enterprise assistant. These files do not configure authentication or grant permissions. Missing or denied tools are unavailable: do not ask for API keys, switch organizations, or substitute direct authenticated API requests.

Enterprise skills support Python and Bash execution only. Verify actual file retrieval and runtime capabilities before using the procedures below. Retrieve only exact signed artifact URLs returned by MCP, without forwarding OAuth headers; if retrieval is unavailable, stop the dependent operation. Do not install a runtime, add a proxy, or evade tenant network restrictions. Never report a plan, local result, missing dataset or blocked operation as a successful live operation.

These Enterprise requirements take precedence over host-generic instructions and references below. Use this skill in the Enterprise assistant, not inside a custom agent.
'''
ENTERPRISE_EXTRA = {
    'segment-designer': '''This Enterprise edition supports saved-segment inspection and explanation only. The JavaScript SDK and runner are deliberately omitted because Enterprise does not support their runtime. Host-generic reference procedures below describe other clients and do not enable mutations here. Do not execute Node via Bash or install it. Do not call create_dynamic_segment, update_dynamic_segment or count_segment_contacts from this skill; SDK-validated preparation is unavailable. Do not hand-build or patch JSON instead. Read saved rules and available definitions, distinguish saved count freshness from rule changes, and describe unsupported edits/counts as blocked.\n''',
    'email-deliverability': '''First inspect configuration with get_email_deliverability_setup. Live DNS/TLS checks are unverified in Enterprise: run the bundled helper only if the tenant provides Python, dnspython and permitted DNS/HTTPS egress. If any prerequisite is unavailable, report configuration findings separately and mark external checks unavailable; do not install packages or bypass restrictions. A configuration-only inspection is not a full deliverability audit.\n''',
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def validate_payload(skill, payload):
    require(0 < len(payload) <= 100, f'{skill}: maximum 100 files')
    require(sum(map(len, payload.values())) <= 100 * 1024 * 1024, f'{skill}: uncompressed size limit')
    require([p for p in payload if Path(p).name == 'SKILL.md'] == ['SKILL.md'], f'{skill}: exactly one root SKILL.md required')
    for name in payload:
        path = relative_path(name)
        require(len(path.parts) - 1 <= 10, f'{skill}: directory depth limit')
        require(path.suffix in {'.md', '.json', '.yaml', '.yml', '.py', '.js'}, f'{skill}: unsupported file {name}')
    front, body = payload['SKILL.md'].decode().split('\n---\n', 1)
    # Our source wrappers use single-line name/description values; fail if that contract changes.
    name = re.search(r'^name: (.+)$', front, re.M)
    description = re.search(r'^description: (.+)$', front, re.M)
    require(front.startswith('---\n') and name and name[1] == skill
            and re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', skill) and len(skill) <= 64,
            f'{skill}: invalid name/frontmatter')
    require(description and 0 < len(description[1]) <= 1024 and description[1] not in ('|', '>'),
            f'{skill}: invalid single-line description')
    require(len(body) <= 500000, f'{skill}: instruction length limit')


def artifacts(source, target):
    require(target in ('apps', 'enterprise'), 'Unknown Gemini target')
    release = verify(source)
    output = {}
    report = {'schemaVersion': 1, 'target': target, 'sourceVersion': release['version'],
              'sourceReleaseSha256': sha((source / 'release.json').read_bytes()),
              'builderSha256': sha(Path(__file__).read_bytes()), 'skills': {}, 'supportFiles': {}}
    for skill in SKILLS:
        prefix = f'skills/{skill}/'
        payload, origins = {}, {}
        for name, checksum in release['files'].items():
            if name.startswith(prefix) and '/agents/' not in name:
                relative = name[len(prefix):]
                if target == 'enterprise' and skill == 'segment-designer' and relative.startswith('scripts/'):
                    continue
                payload[relative] = (source / name).read_bytes()
                origins[relative] = {'source': name, 'sha256': checksum}
        if skill == 'segment-designer' and target == 'apps':
            for name, checksum in release['files'].items():
                if name.startswith('packages/segment-designer-sdk/') and (name.endswith('.js') or name.endswith('/package.json')):
                    payload[name] = (source / name).read_bytes()
                    origins[name] = {'source': name, 'sha256': checksum}
            runner = payload.pop('scripts/run_sdk.mjs').decode()
            old = '../../../packages/segment-designer-sdk/dist/index.js'
            require(runner.count(old) == 1, 'Segment runner dependency changed')
            payload['scripts/run_sdk.js'] = runner.replace(old, '../packages/segment-designer-sdk/dist/index.js').encode()
            origins['scripts/run_sdk.js'] = origins.pop('scripts/run_sdk.mjs')
            payload['scripts/extract_condition_operator_rows.js'] = payload.pop('scripts/extract_condition_operator_rows.mjs')
            origins['scripts/extract_condition_operator_rows.js'] = origins.pop('scripts/extract_condition_operator_rows.mjs')
            payload['package.json'] = b'{"type":"module","private":true}\n'
            manual = payload['OPERATING_MANUAL.md'].decode()
            payload['OPERATING_MANUAL.md'] = manual.replace('node skills/segment-designer/scripts/run_sdk.mjs', 'node scripts/run_sdk.js').replace('run_sdk.mjs', 'run_sdk.js').replace('extract_condition_operator_rows.mjs', 'extract_condition_operator_rows.js').encode()
        front, body = payload['SKILL.md'].decode().split('\n---\n', 1)
        common, extra = (COMMON, EXTRA) if target == 'apps' else (ENTERPRISE, ENTERPRISE_EXTRA)
        if target == 'enterprise' and skill == 'segment-designer':
            front = re.sub(r'^description: .+$', 'description: Inspect and explain saved Yespo/eSputnik segment rules, available conditions and saved audience counts. SDK-based segment editing and unsaved counts are unavailable in the Enterprise skill runtime.', front, flags=re.M)
        payload['SKILL.md'] = (front + '\n---\n\n' + common + '\n' + extra.get(skill, '') + '\n' + body.lstrip()).encode()
        validate_payload(skill, payload)
        archive = io.BytesIO()
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as zipped:
            for name, data in sorted(payload.items()):
                output[f'{skill}/{name}'] = data
                info = zipfile.ZipInfo(f'{skill}/{name}', date_time=(2026, 11, 2, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                zipped.writestr(info, data)
        blob = archive.getvalue()
        require(len(blob) <= 100 * 1024 * 1024, f'{skill}: compressed size limit')
        output[f'{skill}.zip'] = blob
        report['skills'][skill] = {'archive': f'{skill}.zip', 'sha256': sha(blob), 'files': {
            name: {'sha256': sha(data), **({'origin': origins[name]} if name in origins else {})}
            for name, data in sorted(payload.items())}}
    if target == 'enterprise':
        for name in KIT_FILES:
            data = (ROOT / 'docs/gemini-enterprise' / name).read_bytes()
            output[name] = data
            report['supportFiles'][name] = sha(data)
        groups = json.loads(output['actions.json'])['groups']
        names = [tool for group in groups for tool in group['tools']]
        require(len(names) == len(set(names)) and 0 < len(names) <= 100, 'Duplicate actions or more than 100 actions')
    output['manifest.json'] = (json.dumps(report, indent=2) + '\n').encode()
    return output, report


def build(source, destination, target='apps', verify_only=False):
    source, destination = Path(source).absolute(), Path(destination).absolute()
    check_root(destination)
    require(not destination.resolve().is_relative_to(source.resolve())
            and not destination.resolve().is_relative_to(ROOT.resolve()),
            'Output must be outside source and maintainer checkout')
    expected, report = artifacts(source, target)
    if verify_only:
        require(destination.is_dir(), 'Output directory missing')
        actual = {}
        for path in destination.rglob('*'):
            require(not path.is_symlink(), f'Symlink in output: {path}')
            if path.is_file():
                actual[path.relative_to(destination).as_posix()] = path.read_bytes()
        require(actual == expected, 'Kit differs from source, builder or supporting documents')
    else:
        require(not destination.exists(), f'Output already exists: {destination}')
        destination.mkdir()
        for name, data in expected.items():
            path = destination / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('release', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--target', choices=('apps', 'enterprise'), default='apps')
    parser.add_argument('--verify', action='store_true', help='Compare an existing kit without modifying it')
    args = parser.parse_args()
    try:
        report = build(args.release, args.output, args.target, args.verify)
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f'Gemini packaging failed: {error}\n')
    print(f"{'Verified' if args.verify else 'Built'} Gemini {args.target} kit from Yespo {report['sourceVersion']}: {len(report['skills'])} skills")


if __name__ == '__main__':
    main()
