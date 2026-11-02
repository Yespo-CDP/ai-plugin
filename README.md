# Yespo AI Plugin

Use an AI assistant to audit email deliverability, analyze performance, prepare dynamic segments, and design workflows in Yespo or eSputnik. The plugin includes four skills and two independent account connections. Choose the connection for the account you want to work with; the Yespo name on a skill does not select the account.

This is an unpublished **0.5.0-dev.6** candidate. Codex testing covers selected scenarios and does not certify every operation or account. Release approval and client acceptance are separate from package verification. Claude Code packaging is included, but its acceptance testing is deferred. Gemini support is deferred.

## Included skills

| Skill | What it does |
| --- | --- |
| [`email-deliverability`](skills/email-deliverability/SKILL.md) | Audits sender setup and public DNS/TLS checks, including SPF, DKIM, DMARC, MX and short-link SSL. Produces Markdown and JSON reports. |
| [`yespo-analytics`](skills/yespo-analytics/SKILL.md) | Reads available messaging, event, contact, form/widget, recommendation, In-App and order reports. Preserves native metric definitions, dates, currencies and attribution limits. |
| [`segment-designer`](skills/segment-designer/SKILL.md) | Inspects audiences and prepares validated dynamic-segment rules for creation, updates or an unsaved count. Uses the bundled SDK and live account definitions. |
| [`workflow-designer`](skills/workflow-designer/SKILL.md) | Reads, creates and edits workflow definitions using existing account assets and message IDs. New workflows remain inactive. SDK execution and validation take place on the server. |

Email creation, editing, cloning, translation and onboarding skills are outside this package. Installing skills does not grant account permissions or add tools to the shared MCP servers. Each operation depends on the tools and permissions exposed by the selected connection.

## Prerequisites

- A plugin-capable Codex client, or Claude Code for the deferred compatibility test path below.
- A Yespo or eSputnik account and permission to use the requested features.
- A host that can run local helpers and download temporary report/catalog files.
- Node.js for the segment helper; the packaged runtime was tested with **Node.js 24.12.0**. Its dependencies are bundled, so no `npm install` is needed.
- Python 3 for deliverability and the optional workflow argument helper. Deliverability also requires **dnspython** in the Python environment used by the assistant; install it there with `python3 -m pip install dnspython`. DNS and TLS checks require network access. The workflow argument helper uses only the Python standard library.

Keep the whole package together. In particular, `packages/segment-designer-sdk/` must remain beside `skills/`; copying only the skill folders breaks the segment helper.

## Install the candidate in Codex

Start with the assembled release directory supplied for testing. Register its local marketplace using a Codex CLI that supports plugin marketplaces:

```sh
codex plugin marketplace add /absolute/path/to/yespo-release
```

Open the desktop app's Plugins Directory, select **Yespo Plugins**, and install **Yespo** from that local source. Refresh or restart the app if the source does not appear. Check that the installed version is `0.5.0-dev.6`, then start a new chat with this candidate enabled.

Local installations load a cached copy. After a candidate changes, refresh or reinstall it and check the installed version before testing. Availability varies by client; these steps follow the [official local packaging guidance](https://developers.openai.com/plugins/build/plugins).

## Claude Code test path

Claude Code acceptance for this candidate is deferred. To test the assembled directory locally:

```sh
claude --plugin-dir /absolute/path/to/yespo-release
```

The packaged skill names are `/yespo:email-deliverability`, `/yespo:yespo-analytics`, `/yespo:segment-designer` and `/yespo:workflow-designer`. See the [Claude Code plugin documentation](https://code.claude.com/docs/en/plugins) for client setup and plugin management instructions.

## Connect your account

The package declares two OAuth connections in `.mcp.json`: `yespo` at `https://mcp.yespo.io` and `esputnik` at `https://mcp.esputnik.com`. Authenticate each connection you intend to use; authenticating one does not authorize the other. Follow the host's connection prompts. In Claude Code, inspect connections with `/mcp`.

Name the intended brand/account in your request when both connections are enabled. For example:

- “Use Yespo to audit my email deliverability setup.”
- “Use eSputnik to summarize messaging performance for the last seven days.”
- “Use Yespo to count this audience without saving a segment.”
- “Use eSputnik to prepare an inactive workflow using these existing message IDs.”

The assistant prepares segment changes locally and makes authorized live calls through the selected connection. Workflow changes use the server's SDK and are read back for verification. A saved workflow definition does not prove how existing participants will behave. Saving segment rules does not prove that saved membership has been recalculated.

## Current limits

Testing covers selected accounts and scenarios, not every report or role. Populated In-App and recommendation metrics remain unverified. Historical seen/not-seen conversion depends on available channel data and confirmed calculation rules. Financial reports retain their native attribution scope; they do not establish same-order-period contribution. See the packaged [metric definitions](skills/yespo-analytics/references/metric-definitions.md) for interpretation guidance.

The root manifests, marketplace files, `skills/`, `packages/`, assets and this README form the installable payload. `release.json` records its version and SHA-256 file inventory. Development notes, acceptance reports, tests and build scripts are maintained separately and are excluded from assembled releases.
