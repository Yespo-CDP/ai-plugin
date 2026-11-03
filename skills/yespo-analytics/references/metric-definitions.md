# Native metric definitions and reporting limits

Use the returned report's definitions and metadata as authority. This reference describes the pinned backend contract; a connector advertisement or successful download does not establish a deployment's data coverage. Preserve exact native field names alongside any explanatory label.

## Missing values and units

Keep absent, JSON null, empty string, blank CSV and actual numeric zero distinguishable. Do not fill unavailable opens, financial enrichment or rates with zero. An empty successful page is not necessarily an empty population. Preserve native status and reason fields, report scope, configured event/window, date bounds, timezone and currency evidence.

Do not add currencies or infer currency from an account locale. Amounts and percentages may be decimal strings; use decimal arithmetic if further arithmetic is justified. Signed values and rates above 100% can be valid under native definitions. Do not clamp them. Preserve undefined percentages as null and do not treat an unavailable denominator as zero.

## Orders, money and shares

| Report | What it measures | What it does not establish |
| --- | --- | --- |
| Messaging `orders`, `revenue`, `cvr` | Native ecommerce attribution; message financial enrichment is matching date-bounded broadcast ORDER performance. | All-account orders, arbitrary event conversions, unique buyers, or currency (not exported in CSV). |
| Account `orders` / `detail` | Primary account orders, including unattributed orders and current statuses. | Messaging channel from order `source`, or historical status as of period end. |
| `campaign_purchases` | One native attributed purchase sidebar page in the explicit automatic/broadcast namespace. Dates filter message start, not order date. | Complete account revenue or verified complete attribution. Repeated order IDs can carry distinct costs; empty responses may conceal backend errors. |
| `revenue` | Native account-order revenue aggregate, when available, under returned filters/date basis. | Availability when the feature is disabled; do not replace failure with zero or partial row sums. |
| `revenue_share` | Native percentage of attributed ORDER revenue across selected channels, rounded to one decimal. | Share of all store orders/revenue or reconciled contribution within the primary-order period. |
| `store_totals` | Completed bounded traversal of primary orders, totals by currency/current status, including zero-cost orders. | A channel numerator, attribution coverage, a transactional snapshot or historical status reconstruction. |
| `store_report_ratios` | Ratios of existing native channel ORDER counts/revenue to primary-store totals for the requested date arguments. | Reconciled same-order-period contribution, verified custom BI parity, unique-buyer conversion or causal uplift. |

For `store_totals` and `store_report_ratios`, require explicit dates. They always traverse primary orders; no search/subset filters or offsets. `media_types` on ratios selects numerator channels only. Caps, duplicate IDs, missing amounts/currencies/statuses and failed pages must fail without partial totals/ratios. The default page size is `limit=20` orders and the default traversal cap is `max_pages=100`; `limit` can be configured up to 100 orders per page. Thus default settings cover at most 2,000 rows, while `limit=100` permits at most 10,000 within the same page cap; reaching a cap without verified exhaustion fails. A larger period needs complete disjoint primary-order date partitions with global identity reconciliation, not averaged percentages.

### Store report ratios: disclose both bases

The backend defines `orderSharePercent` as native channel ORDER conversions / store denominator order count × 100, and `revenueSharePercent` as native channel revenue / store denominator revenue × 100. These formulas are backend report definitions, not a generic conversion formula to invent for other reports.

- Numerator dates: attributed message start (`started_date`), strictly after the start second through the inclusive end second. Interaction metrics can include the start second. It is not primary order time.
- Numerator count: positive-cost attribution rows minus negative-cost rows; zero-cost rows do not count. This is signed and is neither unique orders nor buyers.
- Denominator dates: inclusive primary `order_date`; native list excludes deleted orders.
- Denominator count: unique current primary orders, including zero-cost orders, in the configured ORDER currency and current status policy. Exclude CANCELLED and ABANDONED_SHOPPING_CART; retain other current statuses, including INITIALIZED, IN_PROGRESS and DELIVERED. Do not silently change to delivered-only or historical statuses.
- Preserve `currencyStatus`, `currencyEvidence`, `numeratorDateBasis`, `denominatorDateBasis` and `statusPolicy`. Current configuration does not independently validate the currency of cached native amounts. Mixed/unknown native currency prevents ratios; independent store currency/status totals can remain usable.
- Missing numerators or zero/unavailable denominators yield null. Percentages are decimal strings with at most six fractional digits. Negative values and values above 100% remain intact.
- Keep `overall` separate from `channels`. Never add an overall row to channels, and do not assert percentages sum to 100%.

If the user requests whole-store same-period channel contributions, describe `store_report_ratios` as a differently defined available report. Do not silently substitute it. A verified contribution needs aligned aggregates or complete order-level attribution for the same primary-order population, statuses, currency and period. `store_totals` supplies a denominator but does not solve the missing numerator/reconciliation.

### Source-verified order and attribution limits

Primary order dates are inclusive at both ends, with `is_deleted=false`; the list uses current stored status and joins current contact mapping. Whole-store status totals therefore do not reconstruct the customer's status or identity at period end. Native order revenue sums stored costs by status and matches currency case-insensitively. The UI excludes CANCELLED and ABANDONED_SHOPPING_CART from its displayed total; that is the store denominator policy, not a universal attribution-eligibility rule.

In the inspected streamed-order attribution path, nontracked orders bind by model only when DELIVERED. Tracked orders have separate mobile-source/configuration conditions; optional-field-only updates and deletions do not trigger a new model binding. The model chooses the latest eligible contact activity using each enabled channel's configured action and window relative to order time. A current settings read does not reconstruct the model used for every historical order, and this path does not establish all other binding/rebinding paths or deployed coverage.

Cancellation writes negative offsets of positive attribution rows whose binding timestamp is within the preceding two weeks. Deletion writes negative offsets without that cancellation window. Preserve the signed native amounts/counts; do not reinterpret them as unique completed orders, assume all older cancellations are reflected, or align them to current primary-order statuses without reconciliation. Source code alone does not prove exact-once processing or a complete refund ledger.

Primary-order ingestion can fill a missing currency from organization revenue settings; reported currency is stored source evidence, not proof of currency conversion. Native performance resolves currency through cached binding-type settings, with absent/blank currency allowing an unfiltered sum. Keep the existing unknown/mixed-currency guard and never infer the currency of an old cached amount from today's settings alone.

These facts are pinned to `esputnik-orders-list` `f4727e9`, `esputnik-orders` `cdffbc6`, `esputnik-orders-processor` `a281748`, `esputnik-callout-progress` `3b2244d`, `esputnik-callout-reports` `5d1aa0f`, and `esng` `d1f7237`. They do not resolve same-order-period contribution or custom BI parity.

## Campaign and recommendation measures

Widget campaigns preserve native `progress`, `revenue`, `totalRevenue` and `totalConversion`. The filtered header `totalRevenue` can contain `ordersCount`, `avgCheck`, `totalCost`, `currency`; never rebuild it from a page. Widget derived rates are percentages, with views as denominator for click/view and purchase/view rates. Preserve absent inputs as null. Forms target actions remain form-type-dependent and are not campaign purchases.

Recommendation purchase pages represent products. Do not count rows as orders, buyers or deduplicate repeated order IDs indiscriminately. Complete pagination does not verify financial attribution or a consistent snapshot. Preserve native aggregates separately from locally counted product rows.

Native conversion `binding_type="ORDER"` uses order-count purchase-to-open/click rates; values can exceed 100%. `EVENT` uses conversion count and configured SEND/RECEIVED/READ/CLICK progress denominator. Neither is automatically unique-buyer conversion. Native automatic campaigns require `is_im=true`, including Email; broadcasts use false. Broadcast native conversion detail is lifetime and rejects date filters, while automatic campaigns accept bounds. Do not mix lifetime detail with a dated denominator.

## Historical seen/unseen comparisons

The client-requested 90-day seen/unseen metric remains **unverified**. Tool availability and completed pagination are not a definition or a historical coverage guarantee. Require explicit account/channel scope, eligible sent contacts, exact action, cutoff, purchase window, qualifying statuses, attribution/membership rule and deduplication before any percentage.

- `historical_actions` reads timestamped READ/CLICKED observations; `historical_inputs` also reads backend-mapped SEND observations (SENT for MobilePush, DELIVERED for other reference channels). This mapping is not a universal delivery-status definition.
- Collection starts at feature activation with no retrospective backfill and retains 90 days. Finished or empty traversal does not prove full-period coverage. Do not interpret absent actions as verified non-action or absent orders as nonbuyers when coverage is incomplete. Separately, the inspected public API requires a start within three calendar months and an end no later than the start of the current server day; the adapter limits the elapsed span to 90 days. These are different constraints, not proof of a fully covered 90-day cohort.
- The inspected public history mapper cannot reliably distinguish Email/Widget. Their cohort counts and account aggregates including them are null, not zero. Do not reconstruct those counts from affected raw events; preserve independent supported-channel evidence separately.
- Current recipient-category lists lack a proven upper historical cutoff. One-contact `contact_history` has grouped interactions, unsafe cursor ties and no exhaustive-history guarantee; its interaction-time filtering can include activity dates outside the window, and it omits Widget/InApp SEND. Neither substitutes for account-wide timestamped history.
- `comparison` exposes observed sends/actions joined to account orders with counts and unique order contacts by native status. Do not choose qualifying statuses or label either measure a verified conversion rate by default.
- Do not sum unique contacts across date or channel partitions or turn event counts into unique buyers. Current active-contact state, last-order date, matching cardinalities, and independent action/purchase predicates do not establish historical membership, purchase-after-action or same-send attribution.
- A narrower supported comparison can be reported only under its explicit observed scope and limitations; do not relabel it as the full requested 90-day report. Segment creation or writes are not authorized by this read-only analytics skill.
