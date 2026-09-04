# Final Report

Use this compact structure. Omit empty optional rows, but never omit blockers or unverified work.

```markdown
## Result

- Integration: <integrated | already integrated | partially integrated | blocked>
- Verification: <code verified | runtime verified | end-to-end verified | partially verified | not verified>
- Service: <Yespo | eSputnik | not established>
- Platform and scope: <native iOS target / native Android module and variant>
- Reteno SDK: <package manager and installed/resolved version>
- Starting state: <absent | dependency-only | initialized | push-partial | complete-but-unverified | conflicting>

## Changes

| File | Change |
| --- | --- |
| `<path>` | <concise reason> |

Configuration source: <mechanism/path only; never include values>

## Automated Checks

| Check or command | Status | Notes |
| --- | --- | --- |
| `<command>` | <passed | failed | not run> | <relevant result or reason> |

## Runtime and Service Validation

MCP connection: <yespo | esputnik | not used>

| Layer | Status | Evidence or limitation |
| --- | --- | --- |
| Local launch | <passed | failed | manual | not run> | <environment and result> |
| Permission/token | <passed | failed | manual | not run> | <redacted result> |
| Selected service contact/token | <passed | failed | not run> | <MCP/manual limitation> |
| Delivery/click | <passed | failed | not run> | <authorized test result> |

## Manual Steps

- [ ] <Apple/Google/Firebase/Yespo/eSputnik console or device action>

## Risks or Questions

- <remaining blocker, ambiguity, behavior risk, or `None`>
```

If no files changed because the integration was already present, say so and list the evidence inspected. If a command was unavailable or not run, give the reason rather than silently omitting it.

Do not include SDK access keys, full APNs or FCM tokens, OAuth data, signing secrets, service-account material, or private signed URLs. Mention branch or working-copy state only when useful, and distinguish pre-existing user changes from skill changes.
