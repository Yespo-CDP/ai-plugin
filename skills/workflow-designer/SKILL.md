---
name: workflow-designer
description: Inspect, create inactive drafts, and edit Yespo or eSputnik workflows through available authenticated MCP tools and the guarded remote Workflow SDK. Detect account capability restrictions before writing.
---

# Workflow designer

Use the installed client's selected Yespo/Reteno MCP connection. Authentication and organization binding belong to that connection. Never ask for API keys, copy credentials, switch product endpoints, or invoke publisher infrastructure. No local browser, external designer agent, or service URL is required.

## Capability check

Discover the actual tools and their current input schemas before any mutation. Require `get_workflow_export` for reads, `create_workflow` for creation, and `update_workflow` accepting `workflow_id`, `expected_model_hash`, and `code` for SDK writes. Tool presence alone does not establish account permission or remote-editor readiness. Current Yespo/eSputnik MCP exposes workflow creation, updates, and upload preparation through customer OAuth, subject to organization permissions and feature availability. Historical restrictions at the reference pin are not the current access policy. Use discovered authorized operations; report actual missing or denied capabilities without acquiring an agent token or bypassing restrictions. If the deployed contract lacks SDK code, stop at a reviewable design rather than using an older upload-only contract or inventing fields.

## Read and plan

1. Confirm the selected organization and request scope from current context. For edits, export the exact existing workflow with `get_workflow_export(workflow_id=...)`. Retain its `modelHash`, identity, name, tags, `paused`, `startConfig`, and `stopConfig`.
2. The graph is in returned signed artifacts, not inline. Download only the exact returned artifact URL using the client's supported file retrieval, without forwarding OAuth headers to another origin or printing signed URLs. Read the original graph and configurations; if retrieval is unavailable, report that limitation rather than inferring structure.
3. Read [OPERATING_MANUAL.md](OPERATING_MANUAL.md), then the [SDK API reference](references/client/SDK_API_REFERENCE.md) and exact catalog entries needed from [the catalog index](references/CATALOG_INDEX.md). These pinned files supply SDK schemas, not proof that a live account supports every block.
4. Resolve messages, segments, event types, fields, and other references through available organization-scoped reads. Never invent IDs. Ask only for missing decisions that materially affect the requested result. A deliberately incomplete draft must be labeled incomplete, with missing assets named.

A fully specified edit to one existing relative Timer can skip the full manual and read only the SDK reference and [Clock catalog](references/client/catalogs/blocks/Clock.md). Match the live node ID and branch. Check a connection with `sdk.findConnections({sourceId: knownSourceId, targetId: knownTargetId})` and its returned `id`; use `sourcePort.name` or `targetPort.name` only when a port check is needed. Returned connections have no `sourceId`/`targetId` fields, and raw `getSource()`/`getTarget()` return ports, not node IDs, despite the pinned interface declarations. Do not compare a port object with a string. Assert `waitTime === true`, `waitUntilDate === false`, and the expected existing duration/unit in code before changing only the requested fields with `sdk.updateShape`. Durations are positive integer strings; units are `Minutes`, `Hours`, `Days`, `Months`. Finish with `sdk.finish()`.

## Apply through client MCP tools

For a new workflow, first check live workflow inventory for the intended identity and any earlier partial creation from this task. Create exactly one shell with `create_workflow(name=..., tags=...)`. Record its returned `workflowId` immediately. Export that shell, confirm `paused: true`, and retain its hash. Apply the planned SDK code via `update_workflow(workflow_id=..., expected_model_hash=..., code=...)`. Shell creation alone is not a completed workflow. Read back the same ID after updating.

For an existing workflow, call `update_workflow` with the ID and hash from the export actually used to author the code. Send only one of `code` or `uploadSessionId`; this skill uses `code`. Do not pass helper-style `mode`, `createWorkflow`, camelCase `workflowId`, an idempotency key, revision, or other invented concurrency fields. The optional local `scripts/prepare_update.py` writes only this MCP argument object; it neither executes nor validates the SDK.

SDK code must preserve untouched graph, start/stop configuration, name, tags, and paused status. Use SDK mutations rather than hand-generating raw graph JSON. The remote service loads current state, executes and validates SDK code, and MCP checks the hash and verifies persistence. End code with `sdk.finish()`; local JavaScript syntax checks alone cannot establish SDK validity.

Creating/editing is separate from activation or sending. New shells are paused. Updating preserves the existing paused status, so editing an active workflow may immediately affect running behavior: disclose this consequence and require explicit authorization for an active-workflow edit. A request to create a draft does not authorize editing an active source. No activation or send operation is part of this skill. For a requested inactive copy, use only a discovered, documented copy/import capability that preserves source graph and configurations; otherwise report that copying is unavailable. Do not rebuild an unchanged source by hand.

## Verification and recovery

Claim a saved update only when `updated: true` and `verification.verified: true`. Then export the same workflow and compare requested changes, graph nodes/connections by ID, references, start/stop configurations, metadata, and paused state. The returned `modelHash` should match the verified update result. If later state differs, report the discrepancy and reconcile; do not claim success from SDK execution alone.

Saved-definition verification (`verification.scope: "saved_definition"`) is separate from native save/deployment outcome. Inspect `saveOutcome` on create and update: `draft_only` can mean an invalid drawing was saved without replacing the deployed definition; `deployment_triggered` reports a native acknowledgement, not runtime execution. `runtimeVerified` remains false. Missing, lost, mismatched or contradictory native receipts leave the outcome unavailable even when graph readback confirms `updated: true`. Never infer validity or deployment from paused state, a matching graph, or `commitStatus: "committed"`; report the saved-definition and native outcome separately. Older responses without these fields provide no native-outcome evidence.

For narrow edits, only documented absent-to-false SDK defaults may be treated as equivalent: `sendInTimeRange: false` on SendEmail and `useContactsTimeZone: false` on a non-date Clock. Preserve all existing values and other fields.

- `workflow_conflict`: re-read and reconcile the intended edit. Never merely replace the hash and replay old code.
- `commitStatus: "unknown"`, lost responses, or unavailable read-back: retain the known ID and inspect live graph/configuration before any further mutation. Never recreate a known shell. If create's outcome is unknown without an ID, inspect live inventory and reconcile the same name/tags/task identity before another create; ambiguous matches require clarification.
- `workflow_editor_at_capacity`: only when explicitly classified as no execution/save, wait the returned `error.retryAfterSeconds` and retry the same arguments and original hash. Do not generalize this to arbitrary errors.
- Other editor failures: inspect diagnostics; do not claim a save. A failure of update never proves an earlier create failed.

The backend has no atomic conditional write and graph/config saves are separate. Hash checks reduce races; they do not guarantee transactional concurrency or rollback. Report the actual saved/draft/blocked status, workflow identity, inactive/active status, and unresolved prerequisites concisely.
