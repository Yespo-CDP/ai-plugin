"""Regression checks for the release boundary; never use live services."""

import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("build_release", ROOT / "scripts/build_release.py")
packaging = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packaging)


class PackagingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()

    def source_copy(self):
        source = self.root / "source"
        for name in packaging.inventory(ROOT):
            destination = source / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / name, destination)
        return source

    def test_build_is_deterministic_and_excludes_development_files(self):
        first, second = self.root / "first", self.root / "second"
        release = packaging.build(ROOT, first)
        packaging.build(ROOT, second)
        self.assertEqual((first / "release.json").read_bytes(), (second / "release.json").read_bytes())
        self.assertNotIn("release.json", release["files"])
        self.assertFalse(any(name.startswith(("docs/", "tests/", "scripts/")) or "__pycache__" in name
                             for name in release["files"]))
        for name in release["files"]:
            self.assertEqual((ROOT / name).read_bytes(), (first / name).read_bytes(), name)

    def test_existing_output_is_never_modified(self):
        output = self.root / "existing"
        output.mkdir()
        marker = output / "keep"
        marker.write_text("unchanged")
        with self.assertRaisesRegex(ValueError, "Output already exists"):
            packaging.build(ROOT, output)
        self.assertEqual(list(output.iterdir()), [marker])
        self.assertEqual(marker.read_text(), "unchanged")

    def test_output_must_be_outside_source_and_without_symlink_parents(self):
        source = self.source_copy()
        with self.assertRaisesRegex(ValueError, "outside the source"):
            packaging.build(source, source / "release")
        self.assertFalse((source / "release").exists())
        (self.root / "alias").symlink_to(self.root, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "Symlink"):
            packaging.build(source, self.root / "alias" / "release")

    def test_bad_provenance_fails_before_output_is_created(self):
        source = self.source_copy()
        name = source / packaging.PROVENANCE[0][0]
        original = json.loads(name.read_text())
        for kind in ("duplicate", "traversal", "absolute", "checksum", "missing"):
            with self.subTest(kind=kind):
                data = json.loads(json.dumps(original))
                record = data["files"][0]
                if kind == "duplicate":
                    data["files"].append(record)
                elif kind == "traversal":
                    record["path"] = "../escape"
                elif kind == "absolute":
                    record["path"] = "/escape"
                elif kind == "checksum":
                    record["sha256"] = "0" * 64
                else:
                    record["path"] = "references/missing.md"
                name.write_text(json.dumps(data))
                output = self.root / kind
                with self.assertRaises(ValueError):
                    packaging.build(source, output)
                self.assertFalse(output.exists())

    def test_symlinked_file_and_directory_are_rejected(self):
        source = self.source_copy()
        readme = source / "README.md"
        readme.unlink()
        readme.symlink_to(ROOT / "README.md")
        with self.assertRaisesRegex(ValueError, "Symlink"):
            packaging.build(source, self.root / "file-link")
        readme.unlink()
        shutil.copy2(ROOT / "README.md", readme)
        assets = source / "assets"
        assets.rename(source / "real-assets")
        assets.symlink_to(source / "real-assets", target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "Symlink"):
            packaging.build(source, self.root / "directory-link")

    def test_verifier_rejects_missing_extra_and_changed_files(self):
        for kind in ("missing", "extra", "changed", "symlink"):
            with self.subTest(kind=kind):
                output = self.root / kind
                packaging.build(ROOT, output)
                if kind == "missing":
                    (output / "README.md").unlink()
                elif kind == "extra":
                    (output / "notes.txt").write_text("not public")
                elif kind == "changed":
                    (output / "README.md").write_text("changed")
                else:
                    (output / "link").symlink_to(ROOT / "README.md")
                with self.assertRaises(ValueError):
                    packaging.verify(output)

    def test_versions_marketplace_paths_and_readme_links_must_match(self):
        source = self.source_copy()
        cases = (
            (".codex-plugin/plugin.json", lambda data: data.update(version="wrong")),
            (".claude-plugin/marketplace.json", lambda data: data["plugins"][0].update(source="./other")),
            (".agents/plugins/marketplace.json", lambda data: data["plugins"][0]["source"].update(path="./other")),
        )
        for index, (name, change) in enumerate(cases):
            with self.subTest(name=name):
                path = source / name
                original = path.read_text()
                data = json.loads(original)
                change(data)
                path.write_text(json.dumps(data))
                with self.assertRaises(ValueError):
                    packaging.build(source, self.root / f"bad-layout-{index}")
                path.write_text(original)
        with (source / "README.md").open("a") as handle:
            handle.write("\n[Internal notes](docs/omitted.md)\n")
        with self.assertRaisesRegex(ValueError, "unpackaged file"):
            packaging.build(source, self.root / "bad-link")

    def test_release_manifest_cannot_hide_changes_or_duplicate_keys(self):
        output = self.root / "release"
        packaging.build(ROOT, output)
        manifest = output / "release.json"
        data = json.loads(manifest.read_text())
        data["files"].pop("README.md")
        manifest.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, "membership"):
            packaging.verify(output)
        manifest.write_text('{"schemaVersion":1,"schemaVersion":1}')
        with self.assertRaisesRegex(ValueError, "Duplicate JSON key"):
            packaging.verify(output)


if __name__ == "__main__":
    unittest.main()
