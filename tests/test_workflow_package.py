"""Offline packaging and argument-contract checks; no live MCP or SDK execution."""
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import shutil
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1] / "skills" / "workflow-designer"
spec = importlib.util.spec_from_file_location("workflow_prepare", ROOT / "scripts" / "prepare_update.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class WorkflowPackageTests(unittest.TestCase):
    def test_update_uses_original_export_and_exact_mcp_fields(self):
        original = {"workflowId": 47, "modelHash": "opaque-original-hash", "paused": True,
                    "artifacts": [{"url": "https://example.invalid/signed"}]}
        code = "sdk.finish();"
        self.assertEqual(module.prepare_update(original, code), {
            "workflow_id": 47, "expected_model_hash": "opaque-original-hash", "code": code})
        self.assertEqual(original["modelHash"], "opaque-original-hash")

    def test_invalid_identity_hash_and_code_rejected(self):
        for identity in (None, True, 0, -1, "47"):
            with self.subTest(identity=identity), self.assertRaises(ValueError):
                module.prepare_update({"workflowId": identity, "modelHash": "h"}, "sdk.finish();")
        for model_hash in (None, "", " ", 123):
            with self.subTest(model_hash=model_hash), self.assertRaises(ValueError):
                module.prepare_update({"workflowId": 1, "modelHash": model_hash}, "sdk.finish();")
        for code in (None, "", " ", "x" * 100001):
            with self.assertRaises(ValueError):
                module.prepare_update({"workflowId": 1, "modelHash": "h"}, code)

    def test_pinned_catalog_bytes_and_json_schemas(self):
        provenance = json.loads((ROOT / "references/provenance.json").read_text())
        self.assertGreater(len(provenance["files"]), 80)
        schemas = 0
        for record in provenance["files"]:
            data = (ROOT / record["path"]).read_bytes()
            self.assertEqual(hashlib.sha256(data).hexdigest(), record["sha256"], record["path"])
            for schema in re.findall(r"<schema>\s*(.*?)\s*</schema>", data.decode(), re.S):
                self.assertIsInstance(json.loads(schema), dict)
                schemas += 1
        self.assertGreater(schemas, 40)

    def test_document_links_resolve(self):
        for path in (ROOT / "SKILL.md", ROOT / "OPERATING_MANUAL.md", ROOT / "references/CATALOG_INDEX.md"):
            for target in re.findall(r"\]\(([^)]+)\)", path.read_text()):
                if "://" not in target:
                    self.assertTrue((path.parent / target).is_file(), (path, target))

    @unittest.skipUnless(shutil.which("node"), "Node unavailable: skip JS syntax only")
    def test_catalog_javascript_examples_parse(self):
        count = 0
        for path in (ROOT / "references/client").rglob("*.md"):
            for code in re.findall(r"```(?:js|javascript)\s*\n(.*?)```", path.read_text(), re.S):
                source = "(" + code + ");" if code.lstrip().startswith("{") else "async function check() {\n" + code + "\n}"
                result = subprocess.run(["node", "--check"], input=source, text=True, capture_output=True)
                self.assertEqual(result.returncode, 0, f"{path}: {result.stderr}")
                count += 1
        self.assertGreater(count, 0)


if __name__ == "__main__":
    unittest.main()
