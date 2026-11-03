# Segment SDK — Agent API Reference

Use this reference only to write a mutation module against the supplied `segment` SDK instance. It documents the public methods, selectors, intents, values, references, results, examples, and SDK mutation failures.

## Mutation module contract

The default exported function receives one pre-created `segment` object:

```js
export default async function mutate(segment) {
  // Apply the requested semantic change through the public methods.
  return segment.finish();
}
```

Generated code must:

- use only `getModel`, `find`, `addCard`, `updateCard`, `addCondition`, `addConditions`, `updateCondition`, `remove`, and `finish`;
- use exact identifiers, operators, options, events, applications, schemas, and states returned by the staged compact definitions;
- use only opaque references returned by SDK methods or `find()`;
- check every `MutationResult` and stop on failure;
- preserve nodes outside the requested change;
- call and return `segment.finish()` exactly once after all mutations;
- interact only with the supplied `segment` instance and local helper functions; never import or instantiate the SDK, read or patch segment JSON, or perform file, environment, network, or persistence side effects.

Use this helper for every mutation:

```js
function must(result) {
  if (!result.ok) {
    const error = new Error(
      result.issues
        .map((issue) => `${issue.code}: ${issue.message}`)
        .join("; "),
    );
    error.code = result.issues[0]?.code ?? "SEGMENT_MUTATION_FAILED";
    error.issues = result.issues;
    throw error;
  }
  return result.value;
}
```

Mutations are atomic. A failed mutation leaves its pre-call state unchanged. Successful dependency-reset warnings are included in `finish().diagnostics` and must be reviewed.

## Public interface

```ts
interface SegmentSDK {
  getModel(): UiSegmentSchema;
  find(query: FindQuery): SegmentNodeView[];
  addCard(branch: Branch, input: AddCardInput): MutationResult<CardResult>;
  updateCard(card: CardRef, patch: CardPatch): MutationResult<CardRef>;
  addCondition(parent: CardRef | AggregateRef, intent: ConditionIntent | CriterionIntent): MutationResult<ConditionNodeRef>;
  addConditions(parent: CardRef | AggregateRef, intents: readonly (ConditionIntent | CriterionIntent)[]): MutationResult<ConditionNodeRef[]>;
  updateCondition(condition: ConditionNodeRef, update: ConditionUpdate): MutationResult<ConditionNodeRef>;
  remove(target: CardRef | ConditionNodeRef): MutationResult<void>;
  finish(): Promise<FinishResult>;
}

type Branch = "include" | "exclude";
type Relation = "AND" | "OR";

type MutationResult<T> =
  | {ok: true; value: T; warnings: readonly MutationIssue[]}
  | {ok: false; issues: readonly MutationIssue[]};

interface MutationIssue {
  code: string;
  message: string;
  path?: string;
}
```

There is no public raw JSON patch, `setModel`, `save`, validation-only mutation, or conversion method.

## References, inspection, and target selection

`CardRef`, `ConditionRef`, `AggregateRef`, and `CriterionRef` are opaque and valid only during one execution. Never construct `{kind, id}` manually. A reference becomes stale after its node is removed; an aggregate selection change can also remove nested criteria, so call `find()` again before further nested edits.

`getModel()` returns a clone for inspection. Modifying that clone does not change SDK state and does not replace `finish()`.

Use `find()` to locate existing targets:

```ts
interface FindQuery {
  branch?: Branch;
  kind?: "card" | "condition" | "aggregate" | "criterion";
  family?: ConditionFamily;
  columnId?: string;
  profileInputId?: number;
  operator?: string;
  value?: JsonValue;
  text?: string;
  limit?: number;
  parent?: CardRef | AggregateRef;
  aggregate?: AggregateRef;
}

interface SegmentNodeView {
  ref: CardRef | ConditionNodeRef;
  kind: "card" | "condition" | "aggregate" | "criterion";
  branch: Branch;
  card: CardRef;
  parent?: CardRef | AggregateRef;
  family?: ConditionFamily;
  value: UiFilter | UiCondition;
}
```

All query fields are combined with AND. `parent` limits matches to one card or aggregate; `aggregate` matches an aggregate and its criteria; `value` uses exact JSON equality. Returned `value` objects are clones.

For edits, use a narrow query, set `limit: 2`, and require exactly one match before mutation:

```js
function exactlyOne(segment, query, description) {
  const matches = segment.find({...query, limit: 2});
  if (matches.length !== 1) {
    throw new Error(`Expected one ${description}; found ${matches.length}`);
  }
  return matches[0];
}
```

## Card operations

### `addCard()`

```ts
type AddCardInput =
  | {
      mode?: "create";
      relation?: Relation;
      conditionRelation?: Relation;
      negated?: boolean;
      firstCondition?: ConditionIntent;
    }
  | {
      mode: "copy";
      copyFrom: CardRef;
      relation?: Relation;
    };

interface CardResult {
  card: CardRef;
  conditions: readonly ConditionNodeRef[];
}
```

- `branch` chooses `include` or `exclude`.
- `relation` is the connector before the new card and defaults to `AND`; it has no meaning for the first card.
- `conditionRelation` is the relation between conditions inside the card and defaults to `AND`.
- `negated` controls whole-card negation.
- `firstCondition` creates the card and first condition atomically.
- Copy mode inserts a copy after the source card and defaults its preceding relation to `OR`.
- An empty card is allowed only as intermediate state; `finish()` rejects it.

### `updateCard()`

```ts
interface CardPatch {
  relation?: Relation;
  conditionRelation?: Relation;
  negated?: boolean;
}
```

`relation` cannot be changed on the first card. Do not attempt arbitrary relation changes on an imported custom formula that the regular card editor cannot safely rewrite.

### `remove()`

`remove()` accepts a card or condition reference. Removing the last condition leaves an invalid empty card, and removing every card leaves an invalid empty segment; complete the intended replacement or remove the empty card before `finish()`.

Do not remove SDK-managed aggregate selector/date/state criteria or the final customer-data source criterion directly. Remove or update the aggregate instead.

## Condition selectors and values

```ts
interface DefinitionSelector {
  columnId?: string;
  profileInputId?: number;
  type?: string;
}

type ConditionValueIntent = JsonValue | {parameter: string};
```

Use `columnId` for standard definitions and `profileInputId` for custom profile fields. Add `type` only when the compact definitions show that the selector would otherwise be ambiguous.

Use `{parameter: "Name"}` only while creating a condition in a `PARAMETRIC` segment. Parameter names contain Latin letters only. An update cannot introduce a new parameter.

### Field condition

```ts
interface FieldIntent {
  kind: "field";
  definition: DefinitionSelector;
  operator: string;
  value?: ConditionValueIntent;
  negated?: boolean;
  label?: string | null;
}
```

### Predicted condition

```ts
interface PredictedIntent {
  kind: "predicted";
  definition: DefinitionSelector;
  negated?: boolean;
}
```

Do not provide an operator or value for a predicted condition. Use a definition returned in the `PREDICTED_SC` family; after creation only negation can be updated.

### Nested aggregate criterion

```ts
interface CriterionIntent {
  definition: DefinitionSelector;
  operator: string;
  value?: ConditionValueIntent;
  negated?: boolean;
  label?: string | null;
}
```

A `CardRef` accepts a top-level condition intent with `kind`. An `AggregateRef` accepts a `CriterionIntent` without `kind`. Never add selector, date, application, schema, state, or other SDK-managed criteria manually.

## Aggregate intents

Use only these valid agent-facing shapes:

```ts
type AggregateIntent =
  | {
      kind: "aggregate";
      family: "AGGREGATED_SC";
      event: string | string[];
      period?: PeriodIntent;
      criteria?: CriterionIntent[];
      negated?: boolean;
    }
  | {
      kind: "aggregate";
      family: "AGGREGATED_CUSTOM_EVENTS";
      event: string | number;
      dateColumnId?: "EVENT_DATE" | "EVENT_FIRST_DATE" | "EVENT_LAST_DATE";
      period?: PeriodIntent;
      criteria?: CriterionIntent[];
      occurrence?: OccurrenceIntent;
      negated?: boolean;
    }
  | {
      kind: "aggregate";
      family: "AGGREGATED_ACTIVITY" | "AGGREGATED_WIDGET_ACTIVITY";
      event: string | string[];
      period?: PeriodIntent;
      criteria?: CriterionIntent[];
      occurrence?: OccurrenceIntent;
      negated?: boolean;
    }
  | {
      kind: "aggregate";
      family: "AGGREGATED_PUSH" | "AGGREGATED_TOKEN";
      applicationId: string | number;
      criteria?: CriterionIntent[];
      negated?: boolean;
    }
  | {
      kind: "aggregate";
      family: "AGGREGATED_CUSTOMER_DATA";
      source: CriterionIntent;
      criteria?: CriterionIntent[];
      negated?: boolean;
    }
  | {
      kind: "aggregate";
      family: "AGGREGATED_CUSTOMER_LIFECYCLE";
      schemaId: string | number;
      state: {
        operator: string;
        value: ConditionValueIntent;
        negated?: boolean;
        label?: string | null;
      };
      negated?: boolean;
    };
```

| Family | Agent must provide | Restrictions that affect generated code |
|---|---|---|
| `AGGREGATED_SC` | exact event, optional period and criteria | Special predictive events are single-event choices with SDK-managed fixed periods and require an offered criterion. All time is available only for the supported order events. Use only criteria offered for the selected event. |
| `AGGREGATED_CUSTOM_EVENTS` | exact event, optional date mode, period, criteria, and occurrence | `EVENT_PARAMS.*` criteria must belong to the selected event. First/last-event date modes require a period and do not accept occurrence/count controls. |
| `AGGREGATED_ACTIVITY` | exact event(s), optional period, criteria, and occurrence | At least one offered non-system criterion is required. Count/rate/response controls are mutually exclusive. |
| `AGGREGATED_WIDGET_ACTIVITY` | exact opened/clicked event(s), optional period, criteria, and occurrence | Same occurrence restrictions as activity; use only widget-supported events and criteria. |
| `AGGREGATED_PUSH` | exact application ID and compatible criteria | Mobile applications require a nested criterion. Web/mobile application type changes which criteria and OS values are available. Add at most one `PUSH_TOKEN`. |
| `AGGREGATED_TOKEN` | exact application ID and compatible criteria | Use only criteria offered for the selected application. |
| `AGGREGATED_CUSTOMER_DATA` | one `source` criterion and optional same-source criteria | Every criterion must use the same source prefix. Do not supply the mapper label manually when the SDK can derive it. |
| `AGGREGATED_CUSTOMER_LIFECYCLE` | exact schema and state | Do not add arbitrary `criteria`; the editor exposes only schema and state. |

Aggregate `negated` inverts the aggregate. It is not the same as `occurrence: {kind: "not-exists"}`.

### Period intent

```ts
type PeriodIntent =
  | {kind: "all-time"}
  | {kind: "relative"; operator: string; value?: string | number}
  | {kind: "between"; from: string; to: string; dateColumnId?: string};
```

Use only period operators offered by the relevant date definition. Dates use `DD/MM/YYYY`; date-times use `DD/MM/YYYY HH:mm`. Do not pre-convert date-times or manufacture the stored all-time representation.

### Occurrence intent

```ts
type OccurrenceIntent =
  | {kind: "exists"}
  | {kind: "not-exists"}
  | {kind: "count"; operator: string; value: ConditionValueIntent; negated?: boolean}
  | {kind: "rate"; criterion: CriterionIntent};
```

Occurrence is available only for custom-event and activity/widget aggregates. `rate` is available only for activity/widget aggregates and must use an offered rate/response criterion. Specify occurrence through `occurrence`, not by also adding the corresponding count/rate criterion manually.

## `updateCondition()`

```ts
type ConditionUpdate =
  | {
      definition?: DefinitionSelector;
      operator?: string;
      value?: ConditionValueIntent;
      clearValue?: boolean;
      negated?: boolean;
      label?: string | null;
    }
  | {
      negated?: boolean;
      period?: PeriodIntent;
      selection?: AggregateSelection;
      occurrence?: OccurrenceIntent | null;
    }
  | {replaceWith: ConditionIntent | CriterionIntent};

type AggregateSelection =
  | {family: "AGGREGATED_SC"; event: string | string[]}
  | {family: "AGGREGATED_CUSTOM_EVENTS"; event: string | number; dateColumnId?: "EVENT_DATE" | "EVENT_FIRST_DATE" | "EVENT_LAST_DATE"}
  | {family: "AGGREGATED_ACTIVITY" | "AGGREGATED_WIDGET_ACTIVITY"; event: string | string[]}
  | {family: "AGGREGATED_PUSH" | "AGGREGATED_TOKEN"; applicationId: string | number}
  | {family: "AGGREGATED_CUSTOMER_DATA"; source: CriterionIntent}
  | {family: "AGGREGATED_CUSTOMER_LIFECYCLE"; schemaId: string | number; state: {operator: string; value: ConditionValueIntent; negated?: boolean; label?: string | null}};
```

- When changing a definition or operator, pass the intended replacement value in the same update; otherwise the SDK may clear the old incompatible value and emit `UI_VALUE_RESET`.
- `clearValue: true` explicitly clears a simple value.
- Update lifecycle state through its state criterion, or update schema and state together through aggregate `selection`.
- `selection` changes the event, application, source, schema, or state inside the same aggregate family. To change family, use `replaceWith` and a complete new condition intent.
- SoftCube and activity selection changes retain only compatible optional criteria. Custom-event, push, token, customer-data, and lifecycle selection changes rebuild their selection-dependent payload; supply the intended replacement state explicitly.
- When a custom-event selection must retain its period, pass that period in the same aggregate update.
- `occurrence: null` removes the current occurrence control.
- After a selection change, review `UI_DEPENDENCY_RESET` warnings and call `find()` again before editing nested criteria.
- A nested criterion can be replaced only with another `CriterionIntent`.

## Values and labels

- Omit `value` for an operator whose control is `VOID`.
- Pass user intent rather than a stored representation. Do not manually trim, serialize ranges, convert time zones, remove an SMS `+`, generate time labels, or lower select options to storage values.
- Use exact static option values returned by compact definitions.
- Standard ranges contain two ordered non-negative values. Date/date-time input must use the formats documented above.
- For request-backed autocomplete values absent from static definitions, resolve both the exact value and display label through an available segment-specific lookup. If either cannot be resolved, stop rather than substitute a nearby value.
- For ordinary single autocomplete values, pass the resolved display string as `label` when the definition cannot derive it.
- `GROUP` and activity-message autocomplete labels must be a JSON-stringified array of matching `{value, label}` objects, for example `label: JSON.stringify([{value: 42, label: "VIP"}])`.
- Do not invent labels for customer-data criteria; the SDK derives their source label.

## Build a new segment

Use `firstCondition` when the first condition is known, retain returned references, and add every remaining condition through the public methods:

```js
export default async function mutate(segment) {
  const {card} = must(segment.addCard("include", {
    firstCondition: {
      kind: "field",
      definition: {columnId: "EMAIL"},
      operator: "CONTAINS",
      value: "@example.com",
    },
  }));

  must(segment.addCondition(card, {
    kind: "aggregate",
    family: "AGGREGATED_CUSTOM_EVENTS",
    event: 42,
    period: {kind: "relative", operator: "LAST_DAYS", value: 30},
    occurrence: {kind: "exists"},
  }));

  return segment.finish();
}
```

Example identifiers and operators are illustrative. Replace them with exact values from the current staged definitions.

## Modify an existing segment

Express only the intended diff. Locate each target with `find()`, require exact cardinality, mutate through the relevant method, and leave all other nodes untouched:

```js
export default async function mutate(segment) {
  const email = exactlyOne(segment, {
    branch: "include",
    kind: "condition",
    family: "FIELDS",
    columnId: "EMAIL",
  }, "include email condition");

  must(segment.updateCondition(email.ref, {
    operator: "CONTAINS",
    value: "@example.org",
  }));

  return segment.finish();
}
```

Use `updateCard` or `updateCondition` for targeted changes, `addCard` or `addCondition` for additions, `remove` for deletion, and `replaceWith` when a condition must change family. Do not manufacture or patch non-null `aggregate.rule` or `originOperator` fields.

For `ONE_OF` and other multi-value controls, pass a flat array (or supported comma-separated scalar input), never a backend selection wrapper. For example, use `value: ["5380858", "5380806"]` for `ACTIVITY_CALLOUT_ID`, not `value: {callout: [...]}`. The trusted update runner converts supported backend read shapes before constructing the SDK session; generated mutation code always works with UI-mode values.

## Completion result

```ts
interface FinishResult {
  model: UiSegmentSchema;
  formula: {include: string; exclude: string};
  diagnostics: {
    mutationCount: number;
    warnings: readonly MutationIssue[];
    validation: "passed";
    definitionCount: number;
  };
}
```

Call and return `finish()` exactly once after all mutations. Do not catch a `finish()` failure merely to emit output. Correct the mutation code instead. On success, inspect the returned model and formula and review every warning in `diagnostics`.

## SDK mutation recovery

| Failure or warning | Agent action |
|---|---|
| Mutation returns `ok: false` | Correct the referenced target, definition, operator, value, or method input. Do not patch output JSON. |
| `DEFINITION_NOT_FOUND` or `DEFINITION_AMBIGUOUS` | Recheck the compact definitions and add the exact `type` or identity needed to select one definition. |
| `OPERATOR_NOT_SUPPORTED`, `OPTION_NOT_AVAILABLE`, or value/label issue | Use only the operator, option, value shape, and display metadata supported by the selected definition. |
| `MULTI_VALUE_ARRAY_REQUIRED` | Replace a backend wrapper object with the flat array expected by the UI control. |
| `INVALID_REFERENCE` or `REFERENCE_NOT_FOUND` | Obtain a new reference with `find()`; do not reuse a removed or selection-pruned reference. |
| `UI_VALUE_RESET` | Verify the cleared value was intended; otherwise repeat the update with the desired compatible value. |
| `UI_DEPENDENCY_RESET` | Inspect the resulting aggregate and restore only still-intended criteria supported by the new selection. |
| Empty segment/card, managed-criterion, occurrence, or family rule failure | Correct the public operations so the final model is complete; do not hand-author the missing JSON. |
| `DB_FIELD_IN_UI_MODEL` | Use a UI-mode model; do not guess DB-to-UI conversion. |

## SDK boundaries

- The SDK accepts and returns UI-mode JSON only. Do not pass or generate DB-mode JSON, `aggregate.rule`, `originOperator`, or persistence fields. In update mode, the trusted runner owns backend-to-UI hydration before constructing the SDK session.
- The SDK validates against the supplied definition snapshot; it does not resolve request-backed autocomplete values absent from that snapshot. Resolve those exact values and labels before mutation.
- `finish()` validates the resulting model against the supplied definitions and returns the model, formula, mutation diagnostics, and warnings.
