# Yespo AI Plugin

Yespo bundles reusable AI-agent workflows for native mobile SDK integration, Yespo and eSputnik email editing, email deliverability audits, and messaging analytics. Yespo and eSputnik are the same underlying platform serving different markets, so this plugin ships two separate MCP server connections — one per brand/account — that you can use independently or side by side.

> **Note on naming:** the plugin, skills, folders, and scripts are named after Yespo for historical reasons, but every workflow here applies to eSputnik too. MCP-backed operations target the independently authorized `yespo` or `esputnik` connection. The mobile workflow retains technical names such as `Reteno`, `com.reteno:fcm`, and `reteno-local-storage` because both branded services use that SDK.

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
- `/yespo:mobile-sdk-integration`

## Codex

Add the marketplace:

```bash
codex plugin marketplace add Yespo-CDP/ai-plugin --ref main
```

Install the plugin:

```bash
codex plugin add yespo@yespo-plugins
```

No release tag exists yet. After the first versioned release is published, replace `main` with that tag using `--ref <tag>` when you need a pinned version.

For local development, open this repository in Codex and enable `Yespo` from the repo marketplace in `.agents/plugins/marketplace.json`.

The Codex plugin manifest lives at `.codex-plugin/plugin.json`.

## Project-local Skill

To use only the mobile integration workflow without the full plugin, copy or symlink `skills/mobile-sdk-integration` into the target repository as `.agents/skills/mobile-sdk-integration`. Commit that copy only when the project wants to pin and review the instructions with its source.

## Authenticate

This plugin declares two independent MCP servers in `.mcp.json` — `yespo` (`https://mcp.yespo.io`) and `esputnik` (`https://mcp.esputnik.com`). They are separate OAuth-protected resources with their own authorization servers, so authenticating with one does not grant access to the other. The email, deliverability, analytics, and optional live mobile-validation workflows use these connections. Connect whichever one (or both) match the account(s) you use:

- Claude Code: open `/mcp`, select `yespo` and/or `esputnik`, and complete the OAuth flow for each.
- Codex: enable the plugin and complete the MCP authentication prompt when a workflow first needs each server.

When a task is ambiguous about which account it targets, confirm with the user whether to use the `yespo` or `esputnik` MCP server before calling tools.

`mobile-sdk-integration` can inspect, implement, and compile a native SDK integration without MCP. It uses the selected connection only when it is available, authorized, and the user requests server-side validation. A test push is never sent without explicit approval.

## Included Workflows

### `yespo-email-editor`

Read, clone, and update Yespo or eSputnik email templates through the matching MCP server while preserving the original builder HTML and CSS structure. Supports validated text and button copy edits, full translation/localization with per-language CSS and Unicode preservation, and replacement of existing images through image upload sessions.

### `email-deliverability`

Audit the technical email deliverability setup of a Yespo or eSputnik organization: combine `get_email_deliverability_setup` MCP data with local MXToolbox-like public checks for SPF, DKIM, DMARC, MX, domain resolution, and short-link SSL, then produce Markdown and JSON audit reports.

### `yespo-analytics`

Answer messaging and event analytics questions from live Yespo or eSputnik MCP exports: query `get_messaging_analytics`, `get_events_analytics`, and `get_event_types`, download the signed CSV/JSON exports, and compute rankings and rates from the local rows.

### `mobile-sdk-integration`

Inspect an existing native Swift iOS or Kotlin/Java Android project, establish its Yespo/eSputnik context, targets, dependency manager, push provider, and partial Reteno setup, then apply the smallest compatible SDK integration. The workflow preserves existing lifecycle and notification behavior, keeps access keys out of git, runs repository-native verification, and reports code, runtime, and optional service-side validation separately.

## References

- [Anthropic Claude Code plugins](https://code.claude.com/docs/en/plugins)
- [OpenAI Codex plugins](https://developers.openai.com/plugins/build/plugins)
- [OpenAI Agent Skills](https://developers.openai.com/plugins/build/skills)
- [Mobile SDK integration release checklist](docs/mobile-sdk-integration-release-checklist.md)
