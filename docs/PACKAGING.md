# Build and maintain the public plugin

The repository is the maintainer source. Distribute an assembled directory, not an unrestricted copy of the checkout. The assembler preserves the root layout used by both marketplaces: manifests, MCP configuration, assets, `skills/`, `packages/` and the public README.

## Build and verify

Use Python 3.9+; no build dependency installation or service access is required. Choose a new physical output directory outside the checkout whose parent exists:

```sh
python3 scripts/build_release.py build /private/tmp/yespo-release-dev6
python3 scripts/build_release.py verify /private/tmp/yespo-release-dev6
```

Existing destinations and symlink paths are rejected. The builder never cleans a directory or edits source. If an I/O failure leaves an incomplete destination, inspect it and choose a fresh path. `release.json` contains the source version and SHA-256 of every payload file, excluding itself. Verification checks exact membership, hashes, provenance, marketplace/version agreement, four skills, local README links and segment SDK dependencies. Hashes establish integrity, not trusted origin or live acceptance.

The payload uses 27 explicitly listed public-owned files and 124 paths from the existing provenance manifests. Build scripts, tests, QA/maintainer documents and unrelated workspace files are excluded. Add to the public file list only when distribution requires it.

## Ownership and upstream updates

Public maintainers own manifests, MCP declarations, skill wrappers/manuals and local helpers. The host owns OAuth reads/writes; the segment runner prepares validated local payloads; workflow SDK execution remains remote. Do not replace these wrappers with publisher-runtime orchestration.

Vendored workflow references and segment runtime bytes are pinned in:

- `skills/workflow-designer/references/provenance.json` (paths relative to the workflow skill).
- `packages/segment-designer-sdk/provenance.json` (paths relative to the plugin root).

Select immutable upstream commits, inspect scoped changes and copy the required committed files with their existing provenance hashes. Do not automatically follow main or import an upstream dirty workspace. Keep every runtime dependency; segment source maps are intentionally excluded. Update all plugin/marketplace version fields together, build a new directory, verify it and run the tests and installed-client checks. This small assembler follows the existing release-manifest shape; it does not claim to reuse an unavailable upstream generator.

See [RELEASE_QA.md](RELEASE_QA.md) for current candidate identity, test commands, evidence and release gates. For testing the assembled payload, use a separate scratch copy and overlay the maintainer tests/build script there; keep the original artifact untouched so exact membership verification remains meaningful.

## Gemini targets

Generate from the verified release rather than keeping another skill source:

```sh
python3 scripts/build_gemini_skills.py /private/tmp/yespo-release-dev6 /private/tmp/yespo-gemini-apps
python3 scripts/build_gemini_skills.py /private/tmp/yespo-release-dev6 /private/tmp/yespo-gemini-enterprise --target enterprise
python3 scripts/build_gemini_skills.py /private/tmp/yespo-release-dev6 /private/tmp/yespo-gemini-enterprise --target enterprise --verify
```

Use new physical directories outside both release and maintainer checkout. One ZIP contains one skill; expanded folders are review copies. Codex UI metadata is omitted. The consumer target relocates the segment SDK inside its skill and adjusts runner imports. Enterprise omits that unsupported JavaScript runtime and supplies inspection-only instructions. It adds the [administrator guide](gemini-enterprise/README.md), [action selection](gemini-enterprise/actions.json) and [acceptance checklist](gemini-enterprise/ACCEPTANCE.md).

The Gemini manifest records target, source version/release hash, builder hash, archive and file hashes, origins and supporting-document hashes. Record the manifest's own SHA-256 with each handoff. Verification reconstructs bytes from the same release, builder and support documents, so retain the exact maintainer revision. Neither a valid ZIP nor a matching hash certifies host execution. The kits do not configure OAuth or grant permissions.

## Publication boundary

Keep local customer exports, credentials, signed URLs, investigation logs and security reproductions outside the public PR and artifacts. A draft QA PR is not publication approval. Review and test the final source/version before merging or distributing an official release.
