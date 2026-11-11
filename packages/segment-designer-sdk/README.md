# Packaged segment SDK

The `dist` runtime and declarations are the exact distribution from the immutable reteno-agent commit listed in `provenance.json`. Keep all runtime chunks and timezone modules together; source maps are omitted. It contains its runtime dependencies; no node_modules, publisher proxy, credentials, transport, or agent repository is needed. The minimal package.json is local packaging metadata. The upstream bundle and supporting schema/reference/catalog files are byte-for-byte pinned with SHA-256 checksums.

Use the customer local runner in `skills/segment-designer/scripts/run_sdk.mjs`. It preserves upstream SDK validation and backend hydration and leaves OAuth MCP calls to the host. Do not replace this bundle with an unreviewed build from a dirty upstream checkout. Refresh by reading immutable Git objects, recording a new exact commit and hashes, and rerunning the local contract tests.
