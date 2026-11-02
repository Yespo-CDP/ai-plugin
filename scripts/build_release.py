#!/usr/bin/env python3
"""Assemble or verify the public plugin using only reviewed local files."""

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil


# Public-owned files only. Vendored files come from the existing provenance lists.
PUBLIC_FILES = (
    ".agents/plugins/marketplace.json",
    ".claude-plugin/marketplace.json",
    ".claude-plugin/plugin.json",
    ".codex-plugin/plugin.json",
    ".mcp.json",
    "README.md",
    "assets/icon.png",
    "assets/logo.png",
    "assets/logo.svg",
    "packages/segment-designer-sdk/README.md",
    "packages/segment-designer-sdk/package.json",
    "packages/segment-designer-sdk/provenance.json",
    "skills/email-deliverability/SKILL.md",
    "skills/email-deliverability/agents/openai.yaml",
    "skills/email-deliverability/scripts/audit_technical_setup.py",
    "skills/segment-designer/OPERATING_MANUAL.md",
    "skills/segment-designer/SKILL.md",
    "skills/segment-designer/scripts/run_sdk.mjs",
    "skills/workflow-designer/OPERATING_MANUAL.md",
    "skills/workflow-designer/SKILL.md",
    "skills/workflow-designer/agents/openai.yaml",
    "skills/workflow-designer/references/CATALOG_INDEX.md",
    "skills/workflow-designer/references/provenance.json",
    "skills/workflow-designer/scripts/prepare_update.py",
    "skills/yespo-analytics/SKILL.md",
    "skills/yespo-analytics/agents/openai.yaml",
    "skills/yespo-analytics/references/metric-definitions.md",
)
PROVENANCE = (
    ("skills/workflow-designer/references/provenance.json", "skills/workflow-designer/"),
    ("packages/segment-designer-sdk/provenance.json", ""),
)


def require(condition, message):
    if not condition:
        raise ValueError(message)


def relative_path(value):
    require(isinstance(value, str) and value and "\\" not in value and "\0" not in value,
            f"Invalid relative path: {value!r}")
    path = PurePosixPath(value)
    require(not path.is_absolute() and path.as_posix() == value
            and all(part not in (".", "..") for part in path.parts),
            f"Invalid relative path: {value!r}")
    return path


def check_root(root):
    require(not any(path.is_symlink() for path in (root, *root.parents)),
            f"Symlink in directory path: {root}")


def file_at(root, name):
    path = root
    require(not root.is_symlink(), f"Symlink not allowed: {root}")
    for part in relative_path(name).parts:
        path = path / part
        require(not path.is_symlink(), f"Symlink not allowed: {path}")
    require(path.is_file(), f"Missing regular file: {path}")
    return path


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def read_json(root, name):
    return json.loads(file_at(root, name).read_text(), object_pairs_hook=unique_object)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inventory(root):
    expected = {}
    for name in PUBLIC_FILES:
        require(name not in expected, f"Duplicate public file: {name}")
        expected[name] = digest(file_at(root, name))
    for provenance_name, prefix in PROVENANCE:
        records = read_json(root, provenance_name)["files"]
        require(isinstance(records, list) and records, f"Empty provenance: {provenance_name}")
        for record in records:
            name = prefix + str(relative_path(record["path"]))
            require(name not in expected, f"Duplicate payload file: {name}")
            checksum = record["sha256"]
            require(isinstance(checksum, str) and re.fullmatch(r"[0-9a-f]{64}", checksum),
                    f"Invalid provenance checksum: {name}")
            require(digest(file_at(root, name)) == checksum, f"Provenance mismatch: {name}")
            expected[name] = checksum
    return dict(sorted(expected.items()))


def check_layout(root, files):
    claude = read_json(root, ".claude-plugin/plugin.json")
    codex = read_json(root, ".codex-plugin/plugin.json")
    claude_market = read_json(root, ".claude-plugin/marketplace.json")
    codex_market = read_json(root, ".agents/plugins/marketplace.json")
    version = claude["version"]
    require(isinstance(version, str) and version.strip(), "Missing plugin version")
    require(claude["name"] == codex["name"] == "yespo", "Plugin name mismatch")
    require(len(claude_market["plugins"]) == len(codex_market["plugins"]) == 1,
            "Each marketplace must contain one plugin")
    claude_entry, codex_entry = claude_market["plugins"][0], codex_market["plugins"][0]
    require(claude_entry["name"] == codex_entry["name"] == "yespo", "Marketplace plugin mismatch")
    require(codex["version"] == claude_market["metadata"]["version"] == claude_entry["version"] == version,
            "Plugin/marketplace version mismatch")
    require(claude_entry["source"] == "./" and codex_entry["source"] == {"source": "local", "path": "./"},
            "Marketplaces must point to the plugin root")
    require(codex["skills"] == "./skills/" and codex["mcpServers"] == "./.mcp.json",
            "Codex manifest must use root skills and MCP paths")
    for key in ("composerIcon", "logo"):
        name = codex["interface"][key]
        require(name.startswith("./") and name[2:] in files, f"Unpackaged manifest asset: {name}")
    skills = {name.split("/")[1] for name in files if re.fullmatch(r"skills/[^/]+/SKILL\.md", name)}
    require(skills == {"email-deliverability", "yespo-analytics", "segment-designer", "workflow-designer"},
            "Release must contain exactly four skills")

    # Keep the existing runner/SDK root relationship. Detailed runtime tests live in tests/.
    sdk_main = read_json(root, "packages/segment-designer-sdk/package.json")["main"]
    require(sdk_main == "./dist/index.js", "Unexpected segment SDK entry point")
    require("packages/segment-designer-sdk/dist/index.js" in files
            and "skills/segment-designer/references/schema/segment-output.schema.json" in files,
            "Segment SDK or schema missing from payload")
    runner = file_at(root, "skills/segment-designer/scripts/run_sdk.mjs").read_text()
    require("from '../../../packages/segment-designer-sdk/dist/index.js'" in runner,
            "Segment runner root dependency changed; review packaging")
    for target in re.findall(r"\]\(([^)]+)\)", file_at(root, "README.md").read_text()):
        if not re.match(r"[a-zA-Z][a-zA-Z0-9+.-]*:", target) and not target.startswith("#"):
            require(target.split("#", 1)[0].removeprefix("./") in files,
                    f"README links to an unpackaged file: {target}")
    return version


def verify(root):
    root = Path(root).absolute()
    check_root(root)
    release = read_json(root, "release.json")
    require(set(release) == {"schemaVersion", "version", "files"} and release["schemaVersion"] == 1,
            "Invalid release manifest")
    require(isinstance(release["files"], dict), "Invalid release file inventory")
    for name in release["files"]:
        relative_path(name)
    expected = inventory(root)
    require(set(release["files"]) == set(expected), "Release inventory membership mismatch")
    require(release["files"] == expected, "Release checksum mismatch")
    actual = set()
    for directory, dirs, names in os.walk(root, followlinks=False):
        for name in dirs + names:
            path = Path(directory) / name
            require(not path.is_symlink(), f"Symlink not allowed: {path}")
        for name in names:
            path = Path(directory) / name
            require(path.is_file(), f"Non-regular release file: {path}")
            actual.add(path.relative_to(root).as_posix())
    require(actual == set(expected) | {"release.json"}, "Release contains missing or unexpected files")
    version = check_layout(root, expected)
    require(release["version"] == version, "Release version mismatch")
    return release


def build(source, output):
    source, output = Path(source).absolute(), Path(output).absolute()
    check_root(source)
    check_root(output)
    require(not output.exists() and not output.is_symlink(), f"Output already exists: {output}")
    require(output.parent.is_dir(), f"Output parent directory must exist: {output.parent}")
    require(not output.resolve().is_relative_to(source.resolve()), "Output must be outside the source directory")
    expected = inventory(source)
    version = check_layout(source, expected)
    output.mkdir()
    for name in expected:
        destination = output / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file_at(source, name), destination)
    (output / "release.json").write_text(json.dumps({
        "schemaVersion": 1, "version": version, "files": expected,
    }, indent=2) + "\n")
    return verify(output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    assemble = commands.add_parser("build", help="Copy the reviewed payload to a new directory")
    assemble.add_argument("output", type=Path)
    assemble.add_argument("--source", type=Path, default=Path(__file__).resolve().parents[1])
    check = commands.add_parser("verify", help="Verify an assembled release without changing it")
    check.add_argument("directory", type=Path)
    args = parser.parse_args()
    try:
        release = build(args.source, args.output) if args.command == "build" else verify(args.directory)
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f"Packaging failed: {error}\n")
    print(f"Verified Yespo {release['version']}: {len(release['files'])} payload files")


if __name__ == "__main__":
    main()
