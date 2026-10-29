# Yespo AI Plugin

Yespo bundles reusable AI-agent workflows for Yespo and eSputnik read-only email inspection, email deliverability audits, and messaging analytics. Yespo and eSputnik are the same underlying platform serving different markets, so this plugin ships two separate MCP server connections — one per brand/account — that you can use independently or side by side.

> **Note on naming:** the plugin, skills, folders, and scripts are named after Yespo for historical reasons, but every workflow here applies identically to eSputnik. Which brand/account a given operation targets depends solely on which MCP server (`yespo` or `esputnik`) is used for the tool calls — not on the `yespo`-branded names in this repo.

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

## Authenticate

This plugin declares two independent MCP servers in `.mcp.json` — `yespo` (`https://mcp.yespo.io`) and `esputnik` (`https://mcp.esputnik.com`). They are separate OAuth-protected resources with their own authorization servers, so authenticating with one does not grant access to the other. Connect whichever one (or both) match the account(s) you use:

- Claude Code: open `/mcp`, select `yespo` and/or `esputnik`, and complete the OAuth flow for each.
- Codex: enable the plugin and complete the MCP authentication prompt for each server on install or first use.

When a task is ambiguous about which account it targets, confirm with the user whether to use the `yespo` or `esputnik` MCP server before calling tools.

## Included Workflows

### `yespo-email-editor`

Inspect saved Yespo/eSputnik email exports, metadata and previews without modifying them. The legacy skill identifier is retained for compatibility. JSON/HTML/CSS editing, cloning, translation writes and image/module replacement are excluded. For an edit request, provide proposed copy or a change brief for manual application in the native editor.

MCP must enforce the same boundary for discovery and direct calls. Updating this plugin does not itself revoke server access, and existing installations keep their cached skill until refreshed.

### `email-deliverability`

Audit the technical email deliverability setup of a Yespo or eSputnik organization: combine `get_email_deliverability_setup` MCP data with local MXToolbox-like public checks for SPF, DKIM, DMARC, MX, domain resolution, and short-link SSL, then produce Markdown and JSON audit reports.

### `yespo-analytics`

Answer messaging and event analytics questions from live Yespo or eSputnik MCP exports: query `get_messaging_analytics`, `get_events_analytics`, and `get_event_types`, download the signed CSV/JSON exports, and compute rankings and rates from the local rows.

## References

- [Anthropic Claude Code plugins](https://code.claude.com/docs/en/plugins)
- [OpenAI Codex Build plugins](https://developers.openai.com/codex/plugins/build)
