# Yespo/eSputnik for Gemini Enterprise — pilot installation kit

**Unpublished candidate, not certified Enterprise support.** This kit targets the Gemini Enterprise Standard/Plus **assistant**. It contains four separately imported skills and instructions for the existing MCP connector; it is not a one-click plugin or a hosted agent. Business Edition, Gemini CLI and consumer Gemini need their own acceptance evidence.

## Before installation

Two known constraints narrow this pilot:

1. **One operator and one linked account only.** Shared-client account isolation has not been approved for multi-user deployment. Keep the pilot client dedicated to one operator/account, without reusing another client registration or sharing it across users. Resolve the authentication compatibility review and test deployed isolation before enabling team rollout.
2. **Segments are inspection-only.** Enterprise skill execution supports Python/Bash, while our segment SDK requires Node.js. The JavaScript runtime and runner are omitted; the schema and explanatory references remain. Segment create/edit and unsaved counts remain unavailable; installing Node through Bash or rewriting the validator is not part of this kit.

An Enterprise administrator must enable skills and arrange the connector configuration. Only after the OAuth owner confirms a dedicated, isolated pilot client should the operator connect an authorized test organization. The kit supplies no credentials and grants no permissions. A successful consumer Gemini installation is not Enterprise acceptance.

## Contents and version

- `email-deliverability.zip`, `yespo-analytics.zip`, `segment-designer.zip`, `workflow-designer.zip`: one skill per ZIP. Same-name folders contain the exact expanded bytes for inspection.
- `manifest.json`: source release version/hash, builder hash, archive hashes, file hashes and source origins. The source version is provenance, not a certification or automatic update channel. Identify this kit by its manifest SHA-256 as well as the source version.
- [actions.json](actions.json): manual action-selection inventory and enablement stages; not a Google import format.
- [ACCEPTANCE.md](ACCEPTANCE.md): test procedure, evidence requirements and upgrade/rollback instructions.

All four skills derive from a verified public release. Enterprise-specific instructions are generated during packaging; they do not alter the canonical Codex/Claude skills. No email editing/creation skill is included.

## Connection settings

Configure a **Custom MCP Server** in the selected Enterprise app's Connected Data Stores. Select one brand matching the pilot account:

| Setting | Yespo | eSputnik |
| --- | --- | --- |
| MCP server URL | `https://mcp.yespo.io` | `https://mcp.esputnik.com` |
| Public OAuth discovery | `https://mcp.yespo.io/.well-known/oauth-authorization-server` | `https://mcp.esputnik.com/.well-known/oauth-authorization-server` |
| Authorization URL | `https://mcp.yespo.io/authorize` | `https://mcp.esputnik.com/authorize` |
| Token URL | `https://mcp.yespo.io/token` | `https://mcp.esputnik.com/token` |
| Scope | `yespo.api` | `esputnik.api` |

These are public metadata observations from 2 November 2026; refresh discovery before installation. Keep each brand/account separate. Use Streamable HTTP at the published URL; do not append `/mcp` based on Google's example.

Have the OAuth owner provision the dedicated pilot client with callback `https://vertexaisearch.cloud.google.com/oauth-redirect` and authentication method `client_secret_post`. Public discovery advertises `/register`, but this kit does not register clients or supply a provisioning service. Supply the resulting MCP client ID/secret directly in the administrator UI, never in this kit or chat; upstream partner credentials are not the MCP client credentials. Enable PKCE (S256). Use credentials in the token request body: **turn off Google's “Use HTTP Basic Authentication” checkbox**. Although discovery advertises Basic too, interoperability with Google's Basic mode is not verified; use the documented body-credential pilot setting. Both public discovery documents advertise authorization-code and refresh-token grants. Request only the brand scope above; do not add `offline_access`, which these discovery documents do not advertise. Verify actual refresh behavior in the tenant.

The administrator must permit the MCP and OAuth hostnames under applicable Enterprise organization policies. Do not disable security controls or make internal services public. No Cloud Run deployment, service account, gateway or proxy is introduced by this kit. If tenant policy prevents the connection, record the restriction for its administrator.

After “Verify Auth,” wait for the connector to become Active. Reload actions and compare actual names/schemas with [actions.json](actions.json). Start with its 20 read actions; keep the 2 workflow write actions off until the read-only gates pass. Google's enabled-action budget is 100; the proposed 22-action set fits without changing the shared server. Missing actions remain unsupported, not permission to select a similarly named mutation or API fallback. Leave user confirmations intact for writes.

## Import the skills

Import each ZIP through Enterprise's Skills page. Check the four names, imported instructions and supporting files. Use the assistant for skill conversations: the documented Enterprise skills path does not support invoking skills inside custom agents. Do not combine the four ZIPs into one upload.

Keep skill sharing disabled for this isolated pilot. Once account isolation is resolved and tenant acceptance passes, an administrator can enable/review sharing to the intended users. Sharing instructions does not grant MCP access.

## What must still be demonstrated

| Capability | Current disposition |
| --- | --- |
| OAuth, refresh and live organization identity | Tenant test required; shared-user rollout blocked by client-level account binding |
| Analytics | Tool invocation, signed CSV/JSON retrieval and actual row inspection unverified in Enterprise |
| Saved-segment inspection | Tool invocation and rule/count freshness handling unverified in Enterprise |
| Segment preparation/create/edit/unsaved count | Unsupported in this native skill runtime; Node.js dependency |
| Workflow inspection and inactive create/edit | MCP remote SDK avoids local Node; graph retrieval, commit receipts and read-back still require tenant testing |
| Deliverability | MCP configuration inspection unverified; full audit additionally requires Python, dnspython and permitted DNS/HTTPS egress |

Stop a dependent operation when its runtime or file capability is missing. A downloaded manifest is not inspected report data; a draft plan is not a saved workflow; an unavailable check is not zero or an all-clear. Do not move authenticated API calls into scripts to bypass missing connector execution.

## Authoritative platform references

Checked 2 November 2026. Follow tenant-specific availability and administrator policy.

- [Enterprise skill packaging, editions and runtime limitations](https://docs.cloud.google.com/gemini/enterprise/docs/skills)
- [Custom MCP setup, OAuth, action selection and organization policy](https://docs.cloud.google.com/gemini/enterprise/docs/connectors/custom-mcp-server/set-up-custom-mcp-server)
- [Administrator control of skills](https://docs.cloud.google.com/gemini/enterprise/docs/manage-skills)
