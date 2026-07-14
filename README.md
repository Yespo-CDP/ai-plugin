# Yespo AI Plugin

Yespo bundles reusable AI-agent workflows for Yespo email editing, email deliverability audits, and messaging analytics.

The repository now supports both:

- Claude Code plugins via Anthropic's `.claude-plugin` format
- Codex plugins via OpenAI's `.codex-plugin` format

Both platforms now install from the repository root.

## Repository Layout

- `.claude-plugin/plugin.json` - Claude plugin manifest at the repo root
- `.codex-plugin/plugin.json` - Codex plugin manifest at the repo root
- `skills/` - shared skill payload used by both platforms
- `.mcp.json` - shared MCP definition at the repo root
- `.claude-plugin/marketplace.json` - Claude marketplace catalog
- `.agents/plugins/marketplace.json` - Codex repo marketplace catalog

## Claude Code

Add the marketplace:

```bash
/plugin marketplace add Yespo-CDP/ai-plugin
```

Install the plugin:

```bash
/plugin install yespo@yespo-plugins
```

For local development:

```bash
claude --plugin-dir ./
```

Skills are namespaced as:

- `/yespo:yespo-email-editor`
- `/yespo:email-deliverability`
- `/yespo:yespo-analytics`

## Codex

Codex currently supports plugin installation through a marketplace file. This repo includes a repo-scoped marketplace at `.agents/plugins/marketplace.json`, and that marketplace points to the repository root plugin.

To test this repo as a Codex plugin:

1. Open the repo in Codex.
2. Restart Codex so it picks up `.agents/plugins/marketplace.json`.
3. Open the plugin directory and select the repo marketplace.
4. Install or enable `Yespo`.

For a personal local marketplace on a new machine, use `yespo-plugins` as the marketplace name and `Yespo Plugins` as the marketplace display name.

The Codex plugin manifest lives at:

```text
.codex-plugin/plugin.json
```

## Authenticate with Yespo

After installation, authenticate with the Yespo MCP server:

- Claude Code: open `/mcp`, select `yespo`, and complete the OAuth flow.
- Codex: enable the plugin and complete the MCP authentication prompt on install or first use.

## Included Workflows

### `yespo-email-editor`

Read, clone, and update Yespo email templates through the Yespo MCP server while preserving the original builder HTML and CSS structure. Supports validated text and button copy edits, full translation/localization with per-language CSS and Unicode preservation, and replacement of existing images through Yespo image upload sessions.

### `email-deliverability`

Audit the technical email deliverability setup of a Yespo organization: combine `get_email_deliverability_setup` MCP data with local MXToolbox-like public checks for SPF, DKIM, DMARC, MX, domain resolution, and short-link SSL, then produce Markdown and JSON audit reports.

### `yespo-analytics`

Answer messaging and event analytics questions from live Yespo MCP exports: query `get_messaging_analytics`, `get_events_analytics`, and `get_event_types`, download the signed CSV/JSON exports, and compute rankings and rates from the local rows.

## References

- [Anthropic Claude Code plugins](https://code.claude.com/docs/en/plugins)
- [OpenAI Codex Build plugins](https://developers.openai.com/codex/plugins/build)
