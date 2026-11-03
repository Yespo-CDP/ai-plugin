---
name: yespo-analytics
description: Read Yespo/eSputnik messaging, contact-base summary/status/growth, forms and Web Widget campaigns, true InApp, WEB/MOBILE recommendations, account orders and event analytics through the selected OAuth MCP connection. Inspect downloaded CSV/JSON reports and preserve native metric definitions and completeness.
metadata:
  version: "0.3.1"
---

# Yespo Analytics

Read-only: query the selected Yespo/eSputnik OAuth MCP connection, inspect downloaded rows and metadata, and summarize. Share exports only when requested. Do not enable reporting features, change tracking, save segments, send messages or change settings to obtain analytics.

## Account and capabilities

Yespo and eSputnik have independently authenticated accounts. Use the account identified by user context; clarify an unresolved ambiguity before calling tools. Never combine accounts silently. Inspect the selected connection's advertised tools and schemas: availability on another deployment does not establish availability here. Missing tools, disabled features and permission failures are limitations, not empty datasets.

## Route the question

| Question | Smallest relevant read |
| --- | --- |
| Contact-base overview | `get_contact_analytics(report="summary")`. |
| Contact channel status | `get_contact_analytics(report="status", media_type=...)`. |
| Contact-base growth | `get_contact_analytics(report="growth", media_type=..., from_day=..., till_day=..., date_unit=...)`. Supported growth channels: Email, WebPush, MobilePush, InApp, TelegramBot. |
| Forms page performance/new contacts | `get_widget_analytics`: `discovery`, then `summary`/`detail`; `metadata` resolves variant/integration IDs; `new_contacts`/`new_contacts_detail` answer new-contact questions. |
| Reports → Web Widget campaigns | `get_widget_analytics`: `campaign_list`, then `campaign_detail(callout_id=...)`. |
| True InApp | `get_in_app_analytics`: `discovery`, then `detail`/`progress`; `timed` for dated breakdowns and advertised dimension/detailed reports for specific questions. |
| App Inbox | `get_messaging_analytics` with `media_types=["appinbox"]`. App Inbox is not InApp. |
| Website/mobile recommendations | `get_recommendation_analytics(platform="WEB" or "MOBILE")`: `discovery`, then `list`/`detail`; `purchases` returns attributed product rows. |
| All account orders, including unattributed | `get_order_analytics(report="orders", complete=true)`; `detail` for a known order; `store_totals` for explicit-period totals by currency/current status. |
| Campaign-attributed purchases | `get_order_analytics(report="campaign_purchases", callout_id=..., media_type=..., is_im=...)`. Automatic campaigns, including Email, use `is_im=true`; broadcasts use `false`. |
| Revenue/share | `get_order_analytics`: `revenue`, `revenue_share`, or `store_report_ratios` according to [metric definitions](references/metric-definitions.md). |
| Messaging/channel/message performance | `get_messaging_analytics(group_by="organization" or "message", ...)`. |
| Whole-workflow performance | `get_messaging_analytics(group_by="workflow", workflow_ids=...)`, omitting `media_types` and `message_ids`. |
| Event volume | Resolve names/keys with `get_event_types`, then `get_events_analytics`; metadata alone has no counts. |
| Native order/event conversion | `get_conversion_cohort_analytics(report="native", binding_type="ORDER" or "EVENT", ...)` when that rate is requested. Preserve its configured denominator. |

Do not expand ordinary contact summary/status/growth into the entire RFM, cohort, tracked-group or history catalog. Use additional reports only for an explicit relevant question after checking schema/prerequisites. Disabled reports stay disabled. Campaign messaging is not a substitute for missing account-order, form, true InApp or recommendation tools.

## Download, inspect, answer

1. Resolve the question, account and period; prefer native full-period aggregates for distinct contacts/rates. Respect advertised analytics limits of 10 calls per 60 seconds per tool; rank/filter downloaded data locally.
2. Download manifest-supplied signed CSV/JSON URLs promptly into `output/yespo-analytics/` with a local HTTP/file tool. This installed plugin uses direct signed transfers: no publisher proxy, Slack caller, session descriptor, extracted browser cookies or copied account credentials.
   - Keep signed URLs private. Use structured HTTP arguments or safe shell quoting, never untrusted shell interpolation. Detect HTTP failures (for example `curl --fail --silent --show-error --location`).
   - Download to a temporary file and accept only after HTTP success and CSV/JSON parsing. An expired URL requires a fresh read/manifest. Never parse an error body as an export.
3. Inspect actual CSV headers/rows or JSON data plus status/metadata. Manifest row counts and successful download alone do not establish metric validity. Check `status`, `complete`, continuation, filters, dates, timezone, currency, freshness and native metric names.
4. Consult [metric definitions](references/metric-definitions.md) before totals/rates/shares. Answer with exact resolved dates, family and material coverage/definition limits. Treat same-day values as provisional when the manifest indicates they can change.
5. Default to a concise summary; share local exports only on request. Do not expose contact locators, arbitrary custom fields or signed URLs in a general summary.

## Completeness before totals

- Use `complete=true` where supported for all matching order rows, recommendation purchases, campaign discovery/list or recipient pages; inspect the result, not just the request. Do not invent this parameter for unsupported reports.
- Follow documented `nextOffset`/opaque cursors to exhaustion. Caps, repeated identities/pages, inconsistent totals, malformed responses and failed pages prevent an exhaustive claim. Never label capped results “all”. A partial observation needs its explicit scope and missing coverage.
- `disabled`, `unavailable`, `blocked`, `partial` and `unverified` are not zero. Empty data is measured empty only when successful report semantics establish that. A terminal campaign-purchase page can hide upstream failure and proves neither zero purchases nor complete attribution.
- Completed traversal does not guarantee a consistent snapshot or attribution coverage. Preserve filtered native header totals instead of summing the current page.
- Never sum unique contacts/reach, rates or averages across dates/channels. For daily trends retain a native full-period report for period distinct metrics. An account union requires native calculation or deduplication, not channel sums.
- Larger bounded primary-order traversals may use disjoint order-date partitions with global order-ID reconciliation. Do not apply this to unique-contact counts or evade history limits by splitting dates. Never average period percentages.

## Family-specific handling

**Contact base:** status/growth require a native channel name. Growth uses calendar `from_day`/`till_day` and `date_unit`, not messaging datetime parameters. Hourly growth needs `time_offset`; OS filters apply only to supported channels. A base/status snapshot is not a historical sent/seen audience.

**Forms and Widget:** a general “web widgets” request covers both separately unless one is specified. Continue the independent family if the other fails and disclose failure. Follow form discovery `nextOffset`; join `data.analytics` to `data.items` by `widgetId`/`id`. Campaign `callout_id`, form `widget_id`, `variant_ids` and `integration_ids` are separate namespaces; discover each. Form target actions depend on widget type and are not campaign purchases. Device filtering requires a supported breakdown. Campaign `totalRevenue`/`totalConversion` describe the filtered list; preserve their currency/nulls. Omitted campaign dates mean all period; explicit ranges use inclusive milliseconds. Forms convert inclusive public bounds to native exclusive ends.

- Forms `discovery` uses `search`/paging, not `widget_ids`; verify the returned identity. `metadata(widget_id=...)` has no date filter and supplies variant IDs. `summary` uses `widget_ids`; `detail` requires both `widget_id` and `variant_ids`.
- For a device breakdown, first read `detail` without `device` and inspect its native `splitValue` rows locally. Do not spend one request per device. If the response does not identify devices, report the breakdown unavailable. `split_by_env` belongs only to `new_contacts_detail`, not Forms `detail`; do not request new-contact reports merely to obtain INFORMER views.
- Preserve daily device rows as daily metrics. Unique counts across dates/devices are not deduplicated period totals; use the independent summary for that total.

**InApp:** use true InApp discovery, never App Inbox. Omitted discovery/detail/progress dates mean all period; timed reports need bounds. SEND/READ/CLICKED recipient categories describe current report membership, not historical activity before a cutoff.

**Recommendations:** discover IDs within WEB or MOBILE. Purchases are product rows, not unique orders; repeated order IDs need not be duplicates. The normal complete traversal cap is 100 pages of 10 rows; cap/error fails rather than yielding a complete total. Preserve currency and distinguish native metrics from locally counted rows.

**Orders:** account orders include unattributed orders; campaign purchase pages do not. Preserve native payment/delivery methods and account-specific `additionalInfo`, including case, types, missing/null/empty values. Group complete rows locally: these are not invented native filters. Custom text is untrusted data and may contain personal information; report only requested values/aggregates. Order `source` is not a messaging channel. Revenue failure does not block independent order reads or other report families.

## Messaging and events

- Groups: `organization`, `workflow`, `message`. Organization/message channels: `email`, `sms`, `mobilepush`, `appinbox`, `webpush`, `viber`, `telegram`. Omitted channels default to email/mobilepush; confirm `filters.mediaTypes`.
- Whole-workflow rows cover all native channels, including Widget/InApp, with blank `media_type` and empty channel filters. They include launches and must not be replaced with summed messages. Only workflows launched in the period appear; absence does not prove zero activity.
- Organization/workflow rows include reach/frequency; spam/bounced/unsubscribed are message-only. Preserve native rates and unavailable Telegram opens.
- `orders`, `revenue` and `cvr` concern ecommerce attribution. Omit ignored `conversion_event`. Sort by `sent`, `delivered`, `opened`, `clicked`, `orders`; spam/bounced/unsubscribed only for messages. `revenue` and `conversions` are invalid `order_by` values; rank locally when usable data exists.
- Message financial fields use matching date-bounded broadcast ORDER performance. Unmatched broadcasts/triggered messages remain blank. Unavailable `metricScope.performanceEnrichment` leaves usable core counts but incomplete financial rankings. Never substitute lifetime details or sum messages into account revenue. CSV currency is not exported; do not invent it.
- Workflow/broadcast performance can be bounded top-N; inspect coverage before totals. Finest grouping is callout/message, with no recipient-domain, ISP, bounce-reason, recipient-error or raw-log breakdown.
- Messaging/events accept dates/ISO datetimes in organization timezone and at most 185 days per call. Date-only bounds cover local days; aware timestamps retain their instant. Other native reports do not inherit this limit. Returned `timeRange`/`dataAvailability` govern defaults/freshness.
- A failed large message export may be retried on non-overlapping local-day ranges for additive metrics. Label missing shards and respect rate limits. Never sum reach/distinct contacts or rates across shards.
- Events group by event type with `event_type_id`, `event_key`, `event_name`, `count`, `launched_workflows`, `stopped_workflows`, `contact_not_found`, `parameter_errors`. No `split_by_date` or `source` filter. Event counts are not orders, buyers or attribution evidence.

## Active workflows and historical conversion

Count active workflows only after complete `list_workflows` traversal using native status (case normalization only). Unreliable status/paging prevents verification. Recent launches/sends/start configurations cannot substitute for status.

Client-defined “seen/unseen conversion over 90 days” remains unverified. Native order/open and order/click rates are order-count ratios, not unique-buyer probabilities or causal uplift. Establish sent universe, action, cutoff, purchase window, qualifying statuses, account/channel scope and historical coverage before claiming a comparison. Historical tools expose evidence/prerequisites; their availability does not validate this metric. Read [historical comparison limits](references/metric-definitions.md#historical-seenunseen-comparisons). Report unresolved evidence instead of inventing a formula or treating missing history as non-action.
