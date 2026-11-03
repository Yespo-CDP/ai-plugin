---
name: email-deliverability
description: Audit Yespo email deliverability technical setup by combining get_email_deliverability_setup MCP data with MXToolbox-like public DNS, host, and TLS checks. Use for SPF, DKIM, DMARC, sender setup, domain verification, tracking domain, short-link SSL, or technical setup audit requests.
metadata:
  version: "0.1.1"
---

# Email Deliverability

## Overview

Use this skill for read-only technical setup audits of Yespo email deliverability. It combines Yespo MCP configuration with public DNS and HTTPS/TLS checks similar to the core checks a user would run in MXToolbox.

Do not use MXToolbox as a third-party service in this version. Do not call Yespo mutation tools.

## Account Selection

Despite the `Yespo` naming used throughout this skill (generic wording like "Yespo MCP" or "Yespo email deliverability"), this workflow applies identically to eSputnik. Yespo and eSputnik are the same underlying platform serving different markets; which brand/account a given audit targets depends solely on which MCP server is used for the tool calls, not on this skill's naming.

This repo declares two independent MCP servers: `yespo` (`https://mcp.yespo.io`) and `esputnik` (`https://mcp.esputnik.com`). They are separate OAuth-authenticated accounts, not interchangeable. If it is not clear which account the user means, ask before calling any tool rather than guessing or mixing data from both.

## Requirements

The audit helper needs the `dnspython` package for DNS checks. If it exits with a `dnspython is required` error, install it first (for example `pip3 install dnspython`) and re-run the helper.

## Workflow

1. Call Yespo MCP `get_email_deliverability_setup` for the selected organization.
2. Save the MCP response under `output/email-deliverability/`, for example `setup_<orgId>_<UTC_TIMESTAMP>.json`.
3. Resolve `scripts/audit_technical_setup.py` relative to this loaded `SKILL.md` file. Run that absolute path from the task workspace; do not assume the plugin root is the working directory or write output into its installed cache:

```bash
python3 "/absolute/path/to/email-deliverability/scripts/audit_technical_setup.py" \
  --input <setup-json-path> \
  --output-dir output/email-deliverability
```

4. Read the generated Markdown and JSON artifacts before answering.
5. Answer with a concise summary focused on failing and warning checks first.
6. Share the generated artifact paths only when the user explicitly asks for files.

## Expected MCP Shape

The audit helper expects `get_email_deliverability_setup` to return:

```json
{
  "orgId": 1234,
  "generatedAt": "2026-05-17T00:00:00Z",
  "domains": [
    {
      "id": 123,
      "domain": "example.com",
      "status": {"status": "IN_PROGRESS", "dnsRecordVerificationResults": [], "configurationIssues": []},
      "verificationHistory": {},
      "warmupInfo": {},
      "errors": []
    }
  ],
  "sender": {
    "mailingConfiguration": {},
    "sendingDomains": [],
    "publicInterface": {"items": [{"status": "AVAILABLE"}]}
  },
  "shortLinks": {
    "sslDomains": [],
    "destinationDomains": [],
    "settings": {}
  },
  "oneClickUnsubscribe": {
    "enabled": true
  }
}
```

The `oneClickUnsubscribe` field is retained for MCP compatibility only. Do not turn it into a technical setup finding or recommendation.

The helper also accepts the older `domain.configuration` shape and a direct sender object/list. Optional BIMI, MTA-STS and TLS-RPT checks identify version-matching TXT records only; they do not validate the full policy, fetch policy files or verify certificates.

## Audit Coverage

MCP-derived checks:
- Domain configuration status, verification history, warmup info, and MCP errors.
- Sender interface availability and sender-domain alignment.
- Mailing configuration and sending domains.
- Short-link SSL domain status.

Public checks:
- SPF TXT existence, duplicate SPF records, basic termination, and estimated DNS lookup budget.
- DMARC TXT existence, policy and enforcement percentage.
- DKIM selector checks for a nonempty public-key field in the terminal TXT record, following DNS aliases. This is not cryptographic key or message-signature validation. Check only selectors exposed by MCP; otherwise mark DKIM skipped.
- MX records for sender and reply domains.
- CNAME/A/AAAA resolution for technical domains and short-link domains.
- HTTPS/TLS certificate check for short-link domains.
- BIMI, MTA-STS, and TLS-RPT as informational optional checks.

## Output

The helper writes:
- `output/email-deliverability/technical_setup_<orgId>_<timestamp>.json`
- `output/email-deliverability/technical_setup_<orgId>_<timestamp>.md`

Use the Markdown for the human-facing answer and the JSON for detailed evidence.

## Constraints

- Read-only only.
- Stay within the selected organization.
- Never call Yespo create, update, delete, activate, deactivate, or verification-refresh endpoints.
- Treat missing DKIM selector data as skipped, not as failed.
- DNS/TLS transport errors are inconclusive, not evidence of missing records or invalid certificates. Include unresolved checks in the answer; an audit with inconclusive checks is not an all-clear.
