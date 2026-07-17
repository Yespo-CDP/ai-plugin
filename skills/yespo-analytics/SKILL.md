---
name: yespo-analytics
description: Read live Yespo messaging and events analytics exports through Yespo MCP, download and inspect the local CSV or JSON, and answer with a concise summary unless exports are explicitly requested. Use for campaign/messaging performance, open/click/delivery/conversion rates, channel performance, event counts, and event type lookups.
version: 0.2.0
---

# Yespo Analytics

## Overview

Use this skill when the user asks for Yespo analytics such as campaign or messaging performance, workflow send rankings, open/click/delivery/conversion rates, channel or media-type performance, event counts, event type lookup, or conversion-share calculations that depend on Yespo MCP analytics exports.

This skill is read-only. Query Yespo through MCP, download export artifacts with `curl`, inspect the local CSV or JSON files, and answer from local rows rather than the manifest envelope.

Default to a summary-only answer. Only return or attach exported files if the user explicitly asks for them.

## Account Selection

Despite the `yespo` naming used throughout this skill (skill name, folder path, output paths, and generic wording like "Yespo MCP" or "Yespo analytics"), this workflow applies identically to eSputnik. Yespo and eSputnik are the same underlying platform serving different markets; which brand/account a given query targets depends solely on which MCP server is used for the tool calls, not on this skill's naming.

This repo declares two independent MCP servers: `yespo` (`https://mcp.yespo.io`) and `esputnik` (`https://mcp.esputnik.com`). They are separate OAuth-authenticated accounts, not interchangeable. If it is not clear which account the user means, ask before calling any tool rather than guessing or mixing data from both.

## Workflow

1. Identify the analytics question and choose the smallest Yespo MCP query that answers it.
   - Use `get_messaging_analytics(group_by, date_from?, date_to?, workflow_ids?, message_ids?, media_types?, conversion_event?, order_by?)` for send, delivery, open, click, bounce, spam, unsubscribe, revenue, channel, media-type, or conversion metrics.
   - Use `get_events_analytics(date_from?, date_to?, event_type_ids?)` for event-count denominators or event-volume breakdowns.
   - Use `get_event_types(event_type_ids?, event_key?, search?)` first when the user provides an event name/key and you need to resolve the exact event type identifier before running analytics.
2. Call the relevant MCP tool with the selected organization only.
   - Avoid exploratory loops. `get_messaging_analytics` and `get_events_analytics` are limited to 10 calls per 60 seconds per MCP client/tool.
   - Prefer one precise analytics query, then do filtering, ranking, and aggregation from the downloaded CSV.
3. If the tool returns a manifest with signed artifact URLs instead of inline rows, download the export using `curl -sL "<signed-url>" -o <local-path>` via the Bash tool.
   - Yespo export URLs are signed and short-lived; download them promptly.
   - Do not use WebFetch — it loads the export into the conversation context, wasting tokens on large files.
4. Save downloaded artifacts under `output/yespo-analytics/`.
   - Messaging exports: `output/yespo-analytics/messaging_<group_by>_<date_from>_<date_to>.csv`
   - Events exports: `output/yespo-analytics/events_<date_from>_<date_to>.csv`
   - If the export is JSON instead of CSV, keep the same basename and use `.json`.
5. Inspect the local file and answer from the downloaded rows.
   - Quote the exact `dateFrom`/`dateTo` resolved by the tool.
   - Reflect the manifest `timeRange` and `dataAvailability` in the answer when freshness, timezone, same-day data, or datetime precision matters.
   - Same-day analytics are available but values can change as new events arrive.
   - If the user asked for rankings, compute them from the local rows rather than from the manifest metadata.
6. Keep the response concise.
   - Return files only when explicitly requested.

## Time Range Behavior

- `date_from` and `date_to` accept `YYYY-MM-DD` dates or ISO datetime strings.
- Date-only values cover the full organization-local day.
- Timezone-less datetimes are interpreted in the organization timezone.
- Timezone-aware datetimes use their explicit instant and are reported back in the organization timezone.
- When dates are omitted, the live API default is the last seven organization-local days, including today.
- A single `get_messaging_analytics` or `get_events_analytics` call must not exceed 185 days.

## Messaging Analytics Behavior

- `group_by` must be `organization`, `workflow`, or `message`.
- Allowed `media_types` are `email`, `sms`, `mobilepush`, `appinbox`, and `webpush`.
- When `media_types` is omitted, the MCP default is `email` and `mobilepush`; confirm the resolved channels from `filters.mediaTypes`.
- Every CSV row is separated by `media_type`; never merge channel rows unless the user explicitly asks for a cross-channel total and you label it as computed.
- `organization` rows include `media_type`, core metrics, `reach`, `frequency`, delivery/open/click/conversion rates, and `revenue`.
- `workflow` rows add `workflow_id`, `workflow_name`, and `launches`.
- `message` rows add `workflow_id`, `workflow_name`, `callout_id`, `callout_name`, `message_id`, and `message_subject`.
- `spam`, `bounced`, and `unsubscribed` are message-level only.
- `conversions` is present only when `conversion_event` is supplied. `conversion_event` can be an integer `EventTypeID` or an exact case-insensitive event key/name match.
- `order_by` may use `sent`, `delivered`, `opened`, or `clicked` for all groups. `spam`, `bounced`, and `unsubscribed` are valid only for `group_by="message"`. `conversions` requires `conversion_event`.
- The finest available grouping level is callout/message. Recipient-domain, mailbox-provider, ISP, bounce-reason, recipient-level delivery errors, raw logs, and date-bucket splits are not available from this MCP analytics tool.

## Event Analytics Behavior

- `get_events_analytics` groups only by event type.
- Do not pass or invent `split_by_date` or `source`; those filters are not available on the live API-backed tool.
- Event analytics CSV columns are `event_type_id`, `event_key`, `event_name`, `count`, `launched_workflows`, `stopped_workflows`, `contact_not_found`, and `parameter_errors`.
- Rows are ordered by `count` descending.
- Use `get_event_types` to resolve event keys, event names, conversion candidates, or event type IDs before querying analytics when the user provides a name rather than an ID.
- `get_event_types` returns metadata only. It does not return counts, trends, delivery metrics, or failure diagnostics.

## Active Workflow Counts

When the user asks how many workflows are active, MCP `list_workflows` rows with `status = "active"` are an approximation: the MCP status alone cannot verify whether a workflow is paused or whether its launch conditions are actually wired up. Report the `list_workflows` count, and state that caveat explicitly when the exact business-level active count matters.

## Output Behavior

- Default: summary-only answer.
- Optional: share CSV or JSON export paths only when the user explicitly asks for the file.
- Intermediate analytics artifacts stay under `output/yespo-analytics/`.

## Constraints

- Read-only only; do not create, update, or delete Yespo entities.
- Stay within the selected organization unless the user explicitly asks for cross-organization comparison.
- Inspect the local downloaded artifact before answering whenever the MCP tool returns only an export manifest.
