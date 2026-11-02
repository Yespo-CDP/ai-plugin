# Yespo/eSputnik 0.5.0-dev.6 — draft release QA

This is the current release checklist. The PR is for review and testing; it does not authorize merge, marketplace publication or production rollout. Test the assembled artifact, not an unrestricted workspace copy. Gemini is excluded from this release. Exactly four skills are included: workflow-designer, segment-designer, yespo-analytics and email-deliverability. Email creation/editing and unrelated management skills are excluded; shared MCP behavior is unchanged.

## Build and identify the candidate

Use Python 3.9+ and Node.js (the existing SDK was tested with Node 24.12.0). Choose new physical output directories outside the checkout; their parents must exist. On macOS use `/private/tmp` rather than its `/tmp` symlink.

```sh
python3 scripts/build_release.py build /private/tmp/yespo-qa-dev6
python3 scripts/build_release.py verify /private/tmp/yespo-qa-dev6
```

Record the PR commit and SHA-256 of the resulting `release.json` with every test run. The reviewed dev.6 source produces 151 payload files plus `release.json`; its expected manifest SHA-256 is `8c191344db4b469fd775b2b99881eff1e328f055ba981ebb7123c174841d120c`. If it differs, investigate the changed payload and establish a new candidate identity before carrying forward acceptance.

Install that directory using the [public README](../README.md). Test with only the public candidate enabled, an ordinary authorized customer OAuth connection, and an explicitly disposable organization. Verify the actual organization identity before mutations. Do not copy credentials from private clients. No campaign sends, workflow activation, automation-triggering events or new production data are needed.

## Automated checks

Use an existing Python test environment with `dnspython` (the deliverability helper's existing dependency), or create a dedicated environment for it. The packaging builders use only the standard library.

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
node --test tests/segment_local.test.mjs
```

Current local result: **23 Python + 9 Node tests passed**. Coverage includes segment mutation semantics and stale baselines, SDK provenance, deliverability behavior, workflow contracts, deterministic packaging, release boundaries and artifact tamper detection. These checks do not certify client conversations or API data accuracy.

## Evidence already available

| Client / capability | Observed evidence | Limit |
| --- | --- | --- |
| Codex dev.6 | Exact assembled/installed inventory; four-skill discovery; four fresh conversational selection checks; live contact-summary retrieval and hash verification | New workflow/segment writes and external DNS probes were not repeated under dev.6 |
| Earlier Codex candidates | Inactive workflow create/edit/read-back and restoration; segment create/edit/count and restoration; analytics pagination and native comparisons; deliverability probes | Applies to the versions/scenarios tested. Dev.6 skill/runtime bytes are unchanged from dev.5; do not describe old runs as new tests |
| Forms new-contact reports | Both reports passed after deployed date-format fix #190, with verified exports | Empty/zero results do not certify populated metrics |
| Revenue/order report ratios | Implemented and reviewed, with explicit message-start versus primary-order-date definitions | Exact same-order-period/custom-BI parity is not claimed |
| Claude Code | Package/test path provided | Conversational acceptance was deferred; no verified compatibility claim |

Maintainers retain detailed sanitized acceptance records separately. This PR intentionally excludes local paths, customer report exports, conversation logs, historical investigation dumps and security reproductions from those records.

## QA checklist

Record what succeeded, what failed, what could not be tested and why, together with exact candidate/client versions, date, observed tool receipts and approved exceptions. Empty results and unavailable operations must remain distinguishable from zero or success.

- [ ] Install the assembled candidate; verify version, hash inventory and exactly four skills. Confirm no private plugin is supplying tools or instructions.
- [ ] Verify customer OAuth, account identity and reconnect; use the selected brand/account consistently.
- [ ] Test natural-language selection for workflows, segments, analytics and deliverability without naming a skill.
- [ ] On an explicitly disposable inactive workflow, create/export/update/export and verify intended and untouched graph/config fields. Keep it inactive; reconcile uncertain outcomes before retry.
- [ ] On a disposable dynamic segment, exercise create/edit/unsaved count with SDK validation, read-back and preserved metadata. Explicitly recalculate in the native editor before comparing saved membership after a rule change. Restore the fixture.
- [ ] Check contact overview, Forms and Widget campaign reports separately, event/messaging reports, all-account order pagination and disclosed native ratios. Inspect downloaded rows and completeness, not just manifests.
- [ ] For populated true In-App and WEB/MOBILE recommendation data, compare the same account/date/filter with native reports. If fixtures are unavailable, record and explicitly accept the coverage gap.
- [ ] Retest historical seen/unseen inputs after the reported upstream channel-data issue is resolved; confirm the requested calculation/window semantics before claiming support. Otherwise explicitly defer that metric.
- [ ] Exercise deliverability configuration and permitted DNS/TLS checks. Missing selectors, transport errors and unavailable checks must not become false failures or an all-clear.
- [ ] Complete Claude Code acceptance before advertising it as verified, or explicitly retain the compatibility limitation.
- [ ] Record accepted limitations and approve the release scope/version before merge or publication.

## Open release decisions

1. **Core plugin:** QA must approve this exact candidate and accepted evidence gaps. Populated In-App/recommendation coverage and historical conversion remain incomplete. The former saved-segment count mismatch was resolved by native recalculation; it is not an outstanding API bug. Forms valid-request failures are resolved. The independently handled Timer issue remains nonblocking.
2. **Publication:** dev.6 is a development candidate, not a final release tag. After scope/QA approval, update release metadata consistently, rebuild, and verify/test the final artifact. No shared MCP deployment is needed merely to publish the existing Codex package.

## Review scope

The large new payload is predominantly pinned workflow references and the bundled segment SDK, with existing provenance manifests. Review those as vendored dependencies, then review the thin client wrappers, retained deliverability fixes, packaging scripts and test changes separately. No new shared service, authentication model or upstream API implementation is introduced by this PR.
