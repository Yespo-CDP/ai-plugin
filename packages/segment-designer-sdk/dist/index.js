import {
  require__
} from "./shared/chunk-SAKVVKSU.js";
import "./shared/chunk-AFWUOHIX.js";
import {
  __toESM
} from "./shared/chunk-NUICFKNS.js";

// src/segmentSdk.ts
var import__ = __toESM(require__(), 1);

// src/errors.ts
var SegmentSdkError = class extends Error {
  issues;
  constructor(message, issues = [{ code: "SEGMENT_SDK_ERROR", message }]) {
    super(message);
    this.name = "SegmentSdkError";
    this.issues = issues;
  }
};
var SegmentFinishError = class extends SegmentSdkError {
  constructor(issues) {
    super(`Segment validation failed with ${issues.length} issue(s).`, issues);
    this.name = "SegmentFinishError";
  }
};
function issue(code, message, path) {
  return path === void 0 ? { code, message } : { code, message, path };
}

// src/conditionFactory.ts
var ESNG_REVISION = "535e60a314b93d3d3f23b2f8faa8a2bfb9901bc8";
var SOFT_CUBE_PREDICTED_IDS = /* @__PURE__ */ new Set([
  "SURE_BUYERS",
  "POTENTIAL_BUYERS",
  "UNLIKELY_BUYERS",
  "UNDECIDED_BUYERS",
  "SC_RECALL"
]);
var REQUIRED_COLUMNS = {
  AGGREGATED_SC: ["SC_EVENT_NAME", "SC_EVENT_DATE"],
  AGGREGATED_CUSTOM_EVENTS: ["EVENT_TYPE_ID"],
  AGGREGATED_ACTIVITY: ["ACTIVITY_EVENT_ID"],
  AGGREGATED_WIDGET_ACTIVITY: ["ACTIVITY_EVENT_ID", "ACTIVITY_MEDIA_TYPE"],
  AGGREGATED_PUSH: ["PUSH_APPLICATION_ID"],
  AGGREGATED_TOKEN: ["TOKEN_APPLICATION_ID"],
  AGGREGATED_CUSTOMER_DATA: [],
  AGGREGATED_CUSTOMER_LIFECYCLE: ["LIFECYCLE_SCHEMA_ID", "LIFECYCLE_STATE_ID"]
};
function eventList(value) {
  return Array.isArray(value) ? value.join(",") : value;
}
function assertAvailableOptions(catalog, definition, values, label) {
  if ((definition.options?.length ?? 0) === 0 && (definition.profileInputMetadata?.options?.length ?? 0) === 0) return;
  const missing = values.filter((value) => catalog.findOption(definition, value) === void 0);
  if (missing.length > 0) {
    throw new SegmentSdkError(`${label} is not available in the current frontend definitions.`, [
      issue("OPTION_NOT_AVAILABLE", `${missing.map(String).join(", ")} cannot be selected for ${definition.columnId ?? label}.`)
    ]);
  }
}
function periodOrDefault(family, event, period) {
  if (period !== void 0) return period;
  if (family === "AGGREGATED_SC") {
    if (event === "Possible buyers") return { kind: "relative", operator: "NEXT_DAYS", value: 30 };
    if (event === "Possible visitors") return { kind: "relative", operator: "NEXT_DAYS", value: 7 };
    if (event === "Probability") return { kind: "relative", operator: "NEXT_DAYS", value: 90 };
  }
  if (family === "AGGREGATED_CUSTOM_EVENTS") return { kind: "relative", operator: "TODAY" };
  return { kind: "relative", operator: "LAST_WEEKS", value: 1 };
}
function simple(catalog, columnId, operator, value, family, context = {}, stored = false) {
  return catalog.createSimpleCondition({ columnId }, operator, value, {
    family,
    context,
    valueMode: stored ? "stored" : "intent"
  });
}
function scPeriodConditions(catalog, period) {
  if (period.kind === "all-time") {
    const from = simple(catalog, "SC_EVENT_DATE", "GREATER_THAN_OR_EQUAL", "01/01/2010 00:00", "AGGREGATED_SC");
    const to = simple(catalog, "SC_EVENT_DATE", "LESS_THAN_OR_EQUAL", "01/01/2050 00:00", "AGGREGATED_SC");
    from.value = "01/01/2010 00:00";
    to.value = "01/01/2050 00:00";
    return [from, to];
  }
  if (period.kind === "between") {
    return [
      simple(catalog, "SC_EVENT_DATE", "GREATER_THAN_OR_EQUAL", period.from, "AGGREGATED_SC"),
      simple(catalog, "SC_EVENT_DATE", "LESS_THAN_OR_EQUAL", period.to, "AGGREGATED_SC")
    ];
  }
  return [simple(catalog, "SC_EVENT_DATE", period.operator, period.value, "AGGREGATED_SC")];
}
function customEventPeriodConditions(catalog, period, dateColumnId) {
  if (period.kind === "all-time") {
    if (dateColumnId !== "EVENT_DATE") {
      throw new SegmentSdkError("All time is available only for the regular custom-event date mode.", [
        issue("ALL_TIME_WITH_FIRST_OR_LAST", "First/last-event modes require an explicit period.")
      ]);
    }
    return [];
  }
  if (period.kind === "between") {
    return [simple(
      catalog,
      period.dateColumnId ?? dateColumnId,
      "BETWEEN",
      `${period.from},${period.to}`,
      "AGGREGATED_CUSTOM_EVENTS"
    )];
  }
  return [simple(catalog, dateColumnId, period.operator, period.value, "AGGREGATED_CUSTOM_EVENTS")];
}
function activityPeriodConditions(catalog, period, family) {
  if (period.kind === "all-time") return [];
  if (period.kind === "between") {
    return [
      simple(catalog, "ACTIVITY_DATE", "GREATER_THAN_OR_EQUAL", period.from, family),
      simple(catalog, "ACTIVITY_DATE", "LESS_THAN_OR_EQUAL", period.to, family)
    ];
  }
  return [simple(catalog, "ACTIVITY_DATE", period.operator, period.value, family)];
}
function buildField(catalog, intent) {
  return catalog.createSimpleCondition(intent.definition, intent.operator, intent.value, {
    family: "FIELDS",
    negated: intent.negated,
    label: intent.label,
    allowParameter: true
  });
}
function buildPredicted(catalog, intent) {
  const definition = catalog.resolve(intent.definition, "PREDICTED_SC");
  if (definition.columnId === null || definition.columnId === void 0 || !SOFT_CUBE_PREDICTED_IDS.has(definition.columnId)) {
    throw new SegmentSdkError("The selected definition is not a predicted SoftCube condition.", [
      issue("PREDICTED_DEFINITION_REQUIRED", "Predicted conditions are limited to the frontend SoftCube predicted definition set.")
    ]);
  }
  return catalog.createSimpleCondition(intent.definition, "NEXT_DAYS", "30", {
    family: "PREDICTED_SC",
    negated: intent.negated
  });
}
function buildCriterion(catalog, intent, family, context = {}) {
  const definition = catalog.resolve(intent.definition, family, context);
  const label = family === "AGGREGATED_CUSTOMER_DATA" ? definition.categoryType ?? intent.label : intent.label;
  return catalog.createSimpleCondition(intent.definition, intent.operator, intent.value, {
    family,
    negated: intent.negated,
    label,
    context,
    allowParameter: true
  });
}
function applyAggregateExtras(catalog, intent, condition, context = {}) {
  if (intent.family === "AGGREGATED_CUSTOMER_LIFECYCLE" && (intent.criteria?.length ?? 0) > 0) {
    throw new SegmentSdkError("Customer lifecycle exposes only its schema and state controls in the frontend.");
  }
  const managedColumns = {
    AGGREGATED_SC: /* @__PURE__ */ new Set(["SC_EVENT_NAME", "SC_EVENT_DATE"]),
    AGGREGATED_CUSTOM_EVENTS: /* @__PURE__ */ new Set(["EVENT_TYPE_ID", "EVENT_DATE", "EVENT_FIRST_DATE", "EVENT_LAST_DATE"]),
    AGGREGATED_ACTIVITY: /* @__PURE__ */ new Set(["ACTIVITY_EVENT_ID", "ACTIVITY_DATE"]),
    AGGREGATED_WIDGET_ACTIVITY: /* @__PURE__ */ new Set(["ACTIVITY_EVENT_ID", "ACTIVITY_DATE", "ACTIVITY_MEDIA_TYPE"]),
    AGGREGATED_PUSH: /* @__PURE__ */ new Set(["PUSH_APPLICATION_ID"]),
    AGGREGATED_TOKEN: /* @__PURE__ */ new Set(["TOKEN_APPLICATION_ID"]),
    AGGREGATED_CUSTOMER_DATA: /* @__PURE__ */ new Set(),
    AGGREGATED_CUSTOMER_LIFECYCLE: /* @__PURE__ */ new Set(["LIFECYCLE_SCHEMA_ID", "LIFECYCLE_STATE_ID"])
  };
  const activityOccurrenceColumns = /* @__PURE__ */ new Set([
    "ACTIVITY_COUNT",
    "ACTIVITY_CTOR",
    "ACTIVITY_CTR",
    "ACTIVITY_OPEN_RATE",
    "ACTIVITY_DELIVERY_RATE",
    "ACTIVITY_RESPONSE_MINUTES"
  ]);
  for (const criterionIntent of intent.criteria ?? []) {
    const criterion = buildCriterion(catalog, criterionIntent, intent.family, context);
    const columnId = criterion.column.columnId ?? "";
    if (managedColumns[intent.family].has(columnId)) {
      throw new SegmentSdkError(`${columnId} is inserted and controlled by the aggregate editor.`);
    }
    const existingIds = condition.aggregate.conditions.map((item) => item.column.columnId);
    if (columnId === "EVENT_COUNT" && existingIds.includes(columnId)) {
      throw new SegmentSdkError("Only one EVENT_COUNT criterion is allowed in an event aggregate.");
    }
    if (activityOccurrenceColumns.has(columnId) && existingIds.some(
      (id) => typeof id === "string" && activityOccurrenceColumns.has(id)
    )) {
      throw new SegmentSdkError("Activity count/rate/response occurrence controls are mutually exclusive in the frontend.");
    }
    condition.aggregate.conditions.push(criterion);
  }
  if (intent.occurrence !== void 0) {
    const ids = condition.aggregate.conditions.map((criterion) => criterion.column.columnId ?? "");
    if (ids.includes("EVENT_COUNT") || ids.some((id) => activityOccurrenceColumns.has(id))) {
      throw new SegmentSdkError("Specify occurrence once, either through occurrence or through a nested criterion.");
    }
    applyOccurrence(catalog, condition, intent.family, intent.occurrence, context);
  }
  return condition;
}
function applyOccurrence(catalog, condition, family, occurrence, context = {}) {
  const occurrenceColumns = family === "AGGREGATED_CUSTOM_EVENTS" ? /* @__PURE__ */ new Set(["EVENT_COUNT"]) : family === "AGGREGATED_ACTIVITY" || family === "AGGREGATED_WIDGET_ACTIVITY" ? /* @__PURE__ */ new Set(["ACTIVITY_COUNT", "ACTIVITY_CTOR", "ACTIVITY_CTR", "ACTIVITY_OPEN_RATE", "ACTIVITY_DELIVERY_RATE", "ACTIVITY_RESPONSE_MINUTES"]) : /* @__PURE__ */ new Set();
  condition.aggregate.conditions = condition.aggregate.conditions.filter(
    (criterion) => !occurrenceColumns.has(criterion.column.columnId ?? "")
  );
  if (occurrence === null) return;
  if (occurrence.kind === "exists" || occurrence.kind === "not-exists") {
    const countColumn2 = family === "AGGREGATED_CUSTOM_EVENTS" ? "EVENT_COUNT" : family === "AGGREGATED_ACTIVITY" || family === "AGGREGATED_WIDGET_ACTIVITY" ? "ACTIVITY_COUNT" : void 0;
    if (countColumn2 === void 0) throw new SegmentSdkError(`${family} has no exists/not-exists occurrence control in the frontend.`);
    if (family === "AGGREGATED_CUSTOM_EVENTS" && condition.aggregate.conditions.some(
      (criterion) => criterion.column.columnId === "EVENT_FIRST_DATE" || criterion.column.columnId === "EVENT_LAST_DATE"
    )) {
      throw new SegmentSdkError("Event occurrence is not offered for first/last-event date modes.", [
        issue("EVENT_COUNT_WITH_FIRST_OR_LAST", "Select the regular event date mode before choosing occurred/did not occur.")
      ]);
    }
    condition.aggregate.conditions.push(simple(
      catalog,
      countColumn2,
      occurrence.kind === "exists" ? "GREATER_THAN" : "EQUALS",
      "0",
      family,
      context
    ));
    return;
  }
  if (occurrence.kind === "rate") {
    if (family !== "AGGREGATED_ACTIVITY" && family !== "AGGREGATED_WIDGET_ACTIVITY") {
      throw new SegmentSdkError("Rate occurrence controls are offered only by activity aggregates.");
    }
    const rate = buildCriterion(catalog, occurrence.criterion, family, context);
    const rateColumns = /* @__PURE__ */ new Set([
      "ACTIVITY_CTOR",
      "ACTIVITY_CTR",
      "ACTIVITY_OPEN_RATE",
      "ACTIVITY_DELIVERY_RATE",
      "ACTIVITY_RESPONSE_MINUTES"
    ]);
    if (!rateColumns.has(rate.column.columnId ?? "")) {
      throw new SegmentSdkError("A rate occurrence must use one of the activity rate/response controls offered by the frontend.");
    }
    condition.aggregate.conditions.push(rate);
    return;
  }
  const countColumn = family === "AGGREGATED_CUSTOM_EVENTS" ? "EVENT_COUNT" : family === "AGGREGATED_ACTIVITY" || family === "AGGREGATED_WIDGET_ACTIVITY" ? "ACTIVITY_COUNT" : void 0;
  if (countColumn === void 0) {
    throw new SegmentSdkError(`${family} has no count occurrence control in the frontend.`);
  }
  if (family === "AGGREGATED_CUSTOM_EVENTS" && condition.aggregate.conditions.some(
    (criterion) => criterion.column.columnId === "EVENT_FIRST_DATE" || criterion.column.columnId === "EVENT_LAST_DATE"
  )) {
    throw new SegmentSdkError("EVENT_COUNT is not offered for first/last-event date modes.", [
      issue("EVENT_COUNT_WITH_FIRST_OR_LAST", "Select the regular event date mode before adding a count occurrence.")
    ]);
  }
  condition.aggregate.conditions.push(simple(
    catalog,
    countColumn,
    occurrence.operator,
    occurrence.value,
    family,
    context
  ));
}
function buildAggregate(catalog, intent) {
  const conditions = [];
  switch (intent.family) {
    case "AGGREGATED_SC": {
      const event = eventList(intent.event);
      const eventDefinition = catalog.resolveColumn("SC_EVENT_NAME", intent.family);
      assertAvailableOptions(catalog, eventDefinition, Array.isArray(intent.event) ? intent.event : [intent.event], "SoftCube event");
      const stored = Array.isArray(intent.event) ? intent.event.map((item) => catalog.optionStoredValue(eventDefinition, item, "value")).join(",") : catalog.optionStoredValue(eventDefinition, intent.event, "value");
      conditions.push(simple(catalog, "SC_EVENT_NAME", Array.isArray(intent.event) ? "ONE_OF" : "EQUALS", stored, intent.family, {}, true));
      conditions.push(...scPeriodConditions(catalog, periodOrDefault(intent.family, event, intent.period)));
      return applyAggregateExtras(catalog, intent, {
        aggregate: { collection: "SC_EVENTS", negation: intent.negated ?? false, conditions }
      });
    }
    case "AGGREGATED_CUSTOM_EVENTS": {
      const eventDefinition = catalog.resolveColumn("EVENT_TYPE_ID", intent.family);
      const eventOption = catalog.findOption(eventDefinition, intent.event);
      assertAvailableOptions(catalog, eventDefinition, [intent.event], "Custom event");
      const eventSelection = eventOption?.id ?? eventOption?.value ?? intent.event;
      const eventName = eventOption?.name ?? String(intent.event);
      const eventCondition = simple(
        catalog,
        "EVENT_TYPE_ID",
        "EQUALS",
        eventSelection,
        intent.family
      );
      conditions.push(eventCondition);
      const dateColumnId = intent.dateColumnId ?? "EVENT_DATE";
      conditions.push(...customEventPeriodConditions(
        catalog,
        periodOrDefault(intent.family, eventName, intent.period),
        dateColumnId
      ));
      return applyAggregateExtras(catalog, intent, {
        aggregate: { collection: "EVENTS", negation: intent.negated ?? false, conditions }
      }, { event: eventCondition.value });
    }
    case "AGGREGATED_ACTIVITY":
    case "AGGREGATED_WIDGET_ACTIVITY": {
      const eventDefinition = catalog.resolveColumn("ACTIVITY_EVENT_ID", intent.family);
      const eventItems = Array.isArray(intent.event) ? intent.event : [intent.event];
      assertAvailableOptions(catalog, eventDefinition, eventItems, "Activity event");
      const storedItems = eventItems.map((item) => {
        const option = catalog.findOption(eventDefinition, item);
        return option?.value ?? option?.id ?? item;
      });
      const eventValue = storedItems.join(",");
      conditions.push(simple(
        catalog,
        "ACTIVITY_EVENT_ID",
        eventItems.length > 1 ? "ONE_OF" : "EQUALS",
        eventValue,
        intent.family,
        {},
        true
      ));
      conditions.push(...activityPeriodConditions(
        catalog,
        periodOrDefault(intent.family, eventList(intent.event), intent.period),
        intent.family
      ));
      const result = applyAggregateExtras(catalog, intent, {
        aggregate: { collection: "ACTIVITY", negation: intent.negated ?? false, conditions }
      });
      if (intent.family === "AGGREGATED_WIDGET_ACTIVITY") {
        result.aggregate.conditions.push(simple(catalog, "ACTIVITY_MEDIA_TYPE", "EQUALS", "WIDGET", intent.family, {}, true));
      }
      return result;
    }
    case "AGGREGATED_PUSH": {
      const definition = catalog.resolveColumn("PUSH_APPLICATION_ID", intent.family);
      if ((definition.options?.length ?? 0) > 0 && catalog.findOption(definition, intent.applicationId) === void 0) {
        throw new SegmentSdkError("The push application is not available in PUSH_APPLICATION_ID options.", [
          issue("PUSH_APPLICATION_NOT_AVAILABLE", `Push application ${intent.applicationId} is not available.`)
        ]);
      }
      const applicationId = catalog.optionStoredValue(definition, intent.applicationId, "value");
      conditions.push(simple(catalog, "PUSH_APPLICATION_ID", "EQUALS", String(applicationId), intent.family, {}, true));
      return applyAggregateExtras(catalog, intent, {
        aggregate: { collection: "PUSH_SUBSCRIPTIONS", negation: intent.negated ?? false, conditions }
      });
    }
    case "AGGREGATED_TOKEN": {
      const definition = catalog.resolveColumn("TOKEN_APPLICATION_ID", intent.family);
      if ((definition.options?.length ?? 0) > 0 && catalog.findOption(definition, intent.applicationId) === void 0) {
        throw new SegmentSdkError("The token application is not available in TOKEN_APPLICATION_ID options.", [
          issue("TOKEN_APPLICATION_NOT_AVAILABLE", `Token application ${intent.applicationId} is not available.`)
        ]);
      }
      const applicationId = catalog.optionStoredValue(definition, intent.applicationId, "value");
      conditions.push(simple(catalog, "TOKEN_APPLICATION_ID", "EQUALS", String(applicationId), intent.family, {}, true));
      return applyAggregateExtras(catalog, intent, {
        aggregate: { collection: "TOKEN_SUBSCRIPTIONS", negation: intent.negated ?? false, conditions }
      });
    }
    case "AGGREGATED_CUSTOMER_DATA": {
      conditions.push(buildCriterion(catalog, intent.source, intent.family));
      return applyAggregateExtras(catalog, intent, {
        aggregate: { collection: "CUSTOMER_DATA", negation: intent.negated ?? false, conditions }
      });
    }
    case "AGGREGATED_CUSTOMER_LIFECYCLE": {
      const schemaDefinition = catalog.resolveColumn("LIFECYCLE_SCHEMA_ID", intent.family);
      assertAvailableOptions(catalog, schemaDefinition, [intent.schemaId], "Lifecycle schema");
      const schemaId = catalog.optionStoredValue(schemaDefinition, intent.schemaId, "value");
      conditions.push(simple(catalog, "LIFECYCLE_SCHEMA_ID", "EQUALS", schemaId, intent.family, {}, true));
      const state = catalog.createSimpleCondition({ columnId: "LIFECYCLE_STATE_ID" }, intent.state.operator, intent.state.value, {
        family: intent.family,
        negated: intent.state.negated,
        label: intent.state.label,
        allowParameter: true
      });
      conditions.push(state);
      return applyAggregateExtras(catalog, intent, {
        aggregate: { collection: "CUSTOMER_LIFECYCLE", negation: intent.negated ?? false, conditions }
      });
    }
  }
}
function inferFamily(condition) {
  if (!("aggregate" in condition)) {
    return condition.column.columnId !== null && condition.column.columnId !== void 0 && SOFT_CUBE_PREDICTED_IDS.has(condition.column.columnId) ? "PREDICTED_SC" : "FIELDS";
  }
  switch (condition.aggregate.collection) {
    case "SC_EVENTS":
      return "AGGREGATED_SC";
    case "PUSH_SUBSCRIPTIONS":
      return "AGGREGATED_PUSH";
    case "TOKEN_SUBSCRIPTIONS":
      return "AGGREGATED_TOKEN";
    case "EVENTS":
      return "AGGREGATED_CUSTOM_EVENTS";
    case "CUSTOMER_DATA":
      return "AGGREGATED_CUSTOMER_DATA";
    case "CUSTOMER_LIFECYCLE":
      return "AGGREGATED_CUSTOMER_LIFECYCLE";
    case "ACTIVITY": {
      return condition.aggregate.conditions.some(
        (criterion) => criterion.column.columnId === "ACTIVITY_MEDIA_TYPE" && criterion.value === "WIDGET"
      ) ? "AGGREGATED_WIDGET_ACTIVITY" : "AGGREGATED_ACTIVITY";
    }
  }
}

// src/definitionCatalog.ts
import moment from "./moment-timezone.js";
var DATE_FORMAT = "DD/MM/YYYY";
var DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm";
var NUMBER_TYPES = /* @__PURE__ */ new Set(["INTEGER", "DOUBLE"]);
var MULTI_OPERATORS = /* @__PURE__ */ new Set(["ONE_OF", "CONTAINS_ONE_OF"]);
var SYSTEM_COMMA_COLUMNS = /* @__PURE__ */ new Set(["SC_EVENT_NAME", "ACTIVITY_EVENT_ID"]);
var ACTIVITY_MESSAGE_COLUMNS = /* @__PURE__ */ new Set(["ACTIVITY_MESSAGE_ID", "ACTIVITY_CALLOUT_ID", "ACTIVITY_IMCALLOUT_ID"]);
var SHORT_YEAR_COLUMNS = /* @__PURE__ */ new Set(["CREATED_DATE_YEAR", "UPDATED_DATE_YEAR", "PUSH_SUBSCRIBED_DATE_YEAR"]);
var PARAMETER_TYPES = {
  STRING: "TEXT",
  EMAIL: "TEXT",
  TEXT_AREA: "TEXT_AREA",
  INTEGER: "INTEGER",
  DOUBLE: "FLOAT",
  DATE: "DATE"
};
var SANITIZE_PATTERN = /[%^*|~{};"<>]/;
function clone(value) {
  return structuredClone(value);
}
function scalarEquals(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  return String(a) === String(b);
}
function familyMatches(definition, family) {
  if (family === void 0) return true;
  if (family === "AGGREGATED_ACTIVITY") {
    return definition.conditionType === "AGGREGATED_ACTIVITY" || definition.conditionType === "AGGREGATED_CONTACT_ACTIVITY";
  }
  if (family === "AGGREGATED_WIDGET_ACTIVITY") {
    return definition.conditionType === "AGGREGATED_WIDGET_ACTIVITY" || definition.conditionType === "AGGREGATED_ACTIVITY";
  }
  if (family === "PREDICTED_SC") {
    return definition.conditionType === "PREDICTED_SC" || definition.groupType === "SOFT_CUBE";
  }
  if (family === "AGGREGATED_SC") {
    return definition.conditionType === "AGGREGATED_SC" || definition.groupType === "SOFT_CUBE";
  }
  return definition.conditionType === void 0 || definition.conditionType === family;
}
function flattenDefinitions(definitions) {
  const result = [];
  const visit = (definition, eventIdentities) => {
    result.push({ definition, eventIdentities });
    for (const option of [...definition.options ?? [], ...definition.profileInputMetadata?.options ?? []]) {
      const identities = [option.id, option.profileInputOptionId, option.value, option.name, option.label, option.description].filter((item) => item !== void 0);
      for (const parameter of option.params ?? []) visit(parameter, identities);
    }
  };
  definitions.forEach((definition) => visit(clone(definition)));
  return result;
}
function parameterName(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value) || !("parameter" in value)) return void 0;
  return typeof value.parameter === "string" ? value.parameter.trim() : void 0;
}
function asAtoms(value) {
  if (Array.isArray(value)) return clone(value);
  if (typeof value === "string") return value.split(",").map((item) => item.trim());
  return [clone(value)];
}
function scalarText(value) {
  return String(value).trim();
}
function usesMultiInput(definition, operator) {
  return MULTI_OPERATORS.has(operator.name) && definition.type !== "TIME" && ["STRING", "INTEGER", "SELECT", "AUTOCOMPLETE"].includes(operator.type);
}
function optionLabel(option) {
  return String(option.label ?? option.description ?? option.name ?? option.value ?? option.id ?? option.profileInputOptionId ?? "");
}
function usesDefaultScalarAutocompleteMapper(definition) {
  const columnId = definition.columnId;
  return typeof columnId === "string" && (columnId.startsWith("EVENT_PARAMS.") || columnId.startsWith("SC_EVENT_PARAMS."));
}
var DefinitionCatalog = class {
  definitions;
  context;
  entries;
  constructor(definitions, context = {}) {
    if (context.timeZone !== void 0 && moment.tz.zone(context.timeZone) === null) {
      throw new SegmentSdkError(`${context.timeZone} is not a valid IANA time zone.`);
    }
    if (context.groupType !== void 0 && !["DYNAMIC", "PARAMETRIC"].includes(context.groupType)) {
      throw new SegmentSdkError(`${String(context.groupType)} is not a supported frontend group type.`);
    }
    if (context.enabledFeatures !== void 0 && Object.values(context.enabledFeatures).some((value) => typeof value !== "boolean")) {
      throw new SegmentSdkError("uiContext.enabledFeatures must contain resolved boolean decisions.");
    }
    if (context.requireResolvedFeatures !== void 0 && typeof context.requireResolvedFeatures !== "boolean") {
      throw new SegmentSdkError("uiContext.requireResolvedFeatures must be a boolean.");
    }
    if (context.scEventDateValidPeriodDays !== void 0 && (!Number.isSafeInteger(context.scEventDateValidPeriodDays) || context.scEventDateValidPeriodDays < 0)) {
      throw new SegmentSdkError("uiContext.scEventDateValidPeriodDays must be a non-negative integer.");
    }
    if (context.mobilePushApplicationIds !== void 0 && context.mobilePushApplicationIds.some((id) => typeof id !== "string" && typeof id !== "number")) {
      throw new SegmentSdkError("uiContext.mobilePushApplicationIds must contain only string or number IDs.");
    }
    this.entries = Object.freeze(flattenDefinitions(definitions));
    this.definitions = Object.freeze(this.entries.map((entry) => entry.definition));
    this.context = clone(context);
  }
  resolve(selector, family, context = {}) {
    const candidates = this.entries.filter(({ definition, eventIdentities }) => {
      if (definition.isSupported === false || !familyMatches(definition, family)) return false;
      if (selector.columnId !== void 0 && definition.columnId !== selector.columnId) return false;
      if (selector.profileInputId !== void 0 && definition.profileInputMetadata?.profileInputId !== selector.profileInputId) return false;
      if (selector.type !== void 0 && definition.type !== selector.type) return false;
      if (selector.columnId?.startsWith("EVENT_PARAMS") && context.event !== void 0) {
        return eventIdentities?.some((identity) => scalarEquals(identity, context.event)) ?? false;
      }
      return selector.columnId !== void 0 || selector.profileInputId !== void 0;
    });
    if (candidates.length === 0) {
      throw new SegmentSdkError("Condition definition was not found or is unsupported.", [
        issue("DEFINITION_NOT_FOUND", `No supported definition matches ${JSON.stringify(selector)}.`)
      ]);
    }
    const unique = new Map(candidates.map(({ definition }) => [
      `${definition.columnId ?? "profile"}:${definition.profileInputMetadata?.profileInputId ?? ""}:${definition.type}:${definition.conditionType ?? ""}`,
      definition
    ]));
    if (unique.size > 1) {
      throw new SegmentSdkError("Condition definition is ambiguous.", [
        issue("DEFINITION_AMBIGUOUS", `More than one supported definition matches ${JSON.stringify(selector)}; add type.`)
      ]);
    }
    return clone([...unique.values()][0]);
  }
  resolveColumn(columnId, family, context = {}) {
    return this.resolve({ columnId }, family, context);
  }
  resolveOperator(definition, operatorName) {
    const operator = definition.operators?.find((item) => item.name === operatorName && item.isSupported !== false);
    if (operator === void 0) {
      throw new SegmentSdkError("Operator is not available for the selected definition.", [
        issue("OPERATOR_NOT_SUPPORTED", `Operator ${operatorName} is not supported by ${definition.columnId ?? `profileInputId ${definition.profileInputMetadata?.profileInputId}`}.`)
      ]);
    }
    const aggregateDate = definition.columnId === "SC_EVENT_DATE" && definition.conditionType === "AGGREGATED_SC" || definition.columnId === "ACTIVITY_DATE" && ["AGGREGATED_ACTIVITY", "AGGREGATED_CONTACT_ACTIVITY", "AGGREGATED_WIDGET_ACTIVITY"].includes(definition.conditionType ?? "");
    if (aggregateDate && definition.type === "DATETIME" && operator.type === "DATE" && ["GREATER_THAN_OR_EQUAL", "LESS_THAN_OR_EQUAL"].includes(operator.name)) {
      return { ...clone(operator), type: "DATETIME" };
    }
    return clone(operator);
  }
  toColumn(definition, operator) {
    if (definition.columnId != null) {
      return {
        columnId: definition.columnId,
        type: definition.type,
        profileInputId: null
      };
    }
    const profileInputId = definition.profileInputMetadata?.profileInputId;
    if (profileInputId === void 0) throw new SegmentSdkError("Definition has neither columnId nor profileInputId.");
    return { columnId: null, type: definition.type, profileInputId };
  }
  findOption(definition, value) {
    return [...definition.options ?? [], ...definition.profileInputMetadata?.options ?? []].find(
      (option) => option.isSupported !== false && [option.id, definition.profileInputMetadata != null ? option.profileInputOptionId : void 0, option.value, option.name, option.label, option.description].some((candidate) => scalarEquals(candidate, value))
    );
  }
  optionStoredValue(definition, value, preference = "value") {
    const option = this.findOption(definition, value);
    if (option === void 0) return value;
    const preferred = preference === "id" ? option.id : option.value;
    const fallback = preference === "id" ? option.value : option.id ?? option.profileInputOptionId;
    return preferred ?? fallback ?? option.profileInputOptionId ?? option.name ?? option.label ?? option.description ?? value;
  }
  optionUiValue(definition, value, multiple = false) {
    const option = this.findOption(definition, value);
    if (option === void 0) return multiple ? value : String(value);
    const profileOptionId = definition.profileInputMetadata != null ? option.profileInputOptionId : void 0;
    const raw = profileOptionId ?? option.value ?? option.id ?? option.name ?? option.label ?? option.description ?? value;
    return multiple ? raw : String(raw);
  }
  parameterType(condition, family, context = {}) {
    const definition = this.resolve({ columnId: condition.column.columnId ?? void 0, profileInputId: condition.column.profileInputId ?? void 0, type: condition.column.type ?? void 0 }, family, context);
    const control = PARAMETER_TYPES[this.resolveOperator(definition, condition.operator).type];
    if (control === void 0) throw new SegmentSdkError("This frontend control does not support a schema parameter.");
    return control;
  }
  createSimpleCondition(selector, operatorName, value, options = {}) {
    const definition = this.resolve(selector, options.family, options.context);
    const operator = this.resolveOperator(definition, operatorName);
    const normalized = options.valueMode === "stored" ? { value, label: options.label } : this.normalizeValue(definition, operator, value, options);
    const condition = { column: this.toColumn(definition, operator), operator: operator.name, negation: options.negated ?? false, isValid: true };
    if (normalized.value !== void 0) condition.value = normalized.value;
    if (normalized.label !== void 0) condition.label = normalized.label;
    return condition;
  }
  validateSimpleCondition(condition, path, family, context = {}) {
    const issues = [];
    let definition;
    let operator;
    try {
      definition = this.resolve({ columnId: condition.column.columnId ?? void 0, profileInputId: condition.column.profileInputId ?? void 0, type: condition.column.type ?? void 0 }, family, context);
      operator = this.resolveOperator(definition, condition.operator);
    } catch (error) {
      if (error instanceof SegmentSdkError) return error.issues.map((entry) => ({ ...entry, path }));
      throw error;
    }
    this.validateFeatureDecision(definition, path, issues);
    const value = condition.value;
    if (operator.type === "VOID") {
      if (value != null && value !== "") issues.push(issue("VOID_OPERATOR_HAS_VALUE", `${condition.operator} must not carry a value.`, `${path}.value`));
      return issues;
    }
    if (value == null || value === "" || Array.isArray(value) && value.length === 0) {
      issues.push(issue("VALUE_REQUIRED", `${condition.operator} requires a value.`, `${path}.value`));
      return issues;
    }
    if (typeof value === "string" && /^\$\{[A-Za-z]+\}$/.test(value)) {
      if (this.context.groupType !== "PARAMETRIC") issues.push(issue("PARAMETER_NOT_ALLOWED", "Schema parameters are available only in PARAMETRIC groups.", `${path}.value`));
      if (PARAMETER_TYPES[operator.type] === void 0) issues.push(issue("PARAMETER_CONTROL_NOT_SUPPORTED", `${operator.type} is not a parameter-capable frontend control.`, `${path}.value`));
      return issues;
    }
    this.validateValueShape(definition, operator, condition, path, issues);
    this.validateOptions(definition, operator, value, path, issues);
    return issues;
  }
  normalizeValue(definition, operator, value, options) {
    if (operator.type === "VOID") return { label: options.label };
    const parameter = parameterName(value);
    if (parameter !== void 0) {
      if (!options.allowParameter || this.context.groupType !== "PARAMETRIC") {
        throw new SegmentSdkError("Schema parameters are available only while creating a condition in a PARAMETRIC group.", [issue("PARAMETER_NOT_ALLOWED", "Use a literal value, or create the condition in PARAMETRIC group context.")]);
      }
      if (!/^[A-Za-z]+$/.test(parameter)) throw new SegmentSdkError("Parameter names may contain Latin letters only.");
      if (PARAMETER_TYPES[operator.type] === void 0) throw new SegmentSdkError(`${operator.type} is not a parameter-capable frontend control.`);
      return { value: `\${${parameter}}`, label: options.label };
    }
    if (value === void 0) return { label: options.label };
    if (usesMultiInput(definition, operator) && typeof value === "object" && value !== null && !Array.isArray(value)) {
      throw new SegmentSdkError(`${definition.columnId ?? "This condition"} requires a flat multi-value selection.`, [
        issue(
          "MULTI_VALUE_ARRAY_REQUIRED",
          "Pass an array or comma-separated scalar values; backend wrapper objects are not valid SDK intent."
        )
      ]);
    }
    let next = clone(value);
    let label = options.label;
    const customField = definition.profileInputMetadata != null;
    if (operator.type === "DATETIME") next = customField ? scalarText(next) : this.toUtcDateTime(next);
    else if (operator.type === "DATE") next = scalarText(next);
    else if (operator.type === "DATE_TIME_RANGE") next = asAtoms(next).map((item) => customField ? scalarText(item) : this.toUtcDateTime(item)).join(",");
    else if (operator.type === "RANGE") next = asAtoms(next).map(scalarText).join(",");
    else if (definition.type === "TIME") {
      const normalized = this.normalizeTime(next);
      next = normalized.value;
      label ??= normalized.label;
    } else if (usesMultiInput(definition, operator)) {
      const values = asAtoms(next);
      next = values.map((item) => this.normalizeListAtom(definition, operator, item));
      if (operator.type === "AUTOCOMPLETE") label = this.normalizeAutocompleteLabel(definition, next, label, true);
    } else if (["SELECT", "SELECT_DAY", "SELECT_MONTH", "SELECT_YEAR", "SELECT_PERCENT", "CHECKBOX_GROUP"].includes(operator.type)) {
      next = this.optionUiValue(definition, next, false);
    } else if (operator.type === "AUTOCOMPLETE") {
      next = definition.columnId === "GROUP" ? Number(next) : scalarText(next);
      label = this.normalizeAutocompleteLabel(definition, next, label, false);
    } else if (["STRING", "EMAIL", "TEXT_AREA", "INTEGER", "DOUBLE"].includes(operator.type)) {
      next = scalarText(next);
      if (definition.columnId === "SMS" && next.startsWith("+")) next = next.slice(1);
    }
    return { value: next, label };
  }
  normalizeListAtom(definition, operator, value) {
    if (["SELECT", "CHECKBOX_GROUP"].includes(operator.type)) return this.optionUiValue(definition, value, true);
    if (operator.type === "AUTOCOMPLETE" && definition.columnId === "GROUP") return Number(value);
    if (["STRING", "INTEGER", "AUTOCOMPLETE"].includes(operator.type)) return scalarText(value);
    return clone(value);
  }
  normalizeAutocompleteLabel(definition, value, label, multiple) {
    if (label !== void 0) {
      if (definition.columnId === "GROUP" || ACTIVITY_MESSAGE_COLUMNS.has(definition.columnId ?? "")) {
        if (typeof label !== "string") throw new SegmentSdkError(`${definition.columnId} requires its autocomplete selection label as JSON.`);
        try {
          JSON.parse(label);
        } catch {
          throw new SegmentSdkError(`${definition.columnId} requires its autocomplete selection label as JSON.`);
        }
      }
      return label;
    }
    const values = Array.isArray(value) ? value : [value];
    const matched = values.map((item) => this.findOption(definition, item));
    if (matched.every((item) => item !== void 0)) {
      const selections = matched.map((item, index) => ({ value: values[index], label: optionLabel(item) }));
      return definition.columnId === "GROUP" || ACTIVITY_MESSAGE_COLUMNS.has(definition.columnId ?? "") ? JSON.stringify(selections) : multiple ? JSON.stringify(selections) : selections[0].label;
    }
    if (usesDefaultScalarAutocompleteMapper(definition)) {
      const selections = values.map((item) => ({ value: item, label: String(item) }));
      return multiple ? JSON.stringify(selections) : selections[0].label;
    }
    if (definition.requestURL != null || definition.operators.some((item) => item.requestURL != null)) {
      throw new SegmentSdkError(`Autocomplete definition ${definition.columnId ?? definition.profileInputMetadata?.profileInputId} requires an explicit label.`);
    }
    return label;
  }
  normalizeTime(value) {
    const localHours = asAtoms(value).map((item) => Number(item));
    const zone = this.context.timeZone ?? "UTC";
    const utcHours = localHours.map((hour) => {
      const today = moment.tz(zone);
      return moment.tz({ year: today.year(), month: today.month(), date: today.date(), hour }, zone).utc().hour();
    });
    const ranges = [];
    let start;
    let previous;
    localHours.forEach((rawHour, index) => {
      let hour = rawHour;
      const last = index === localHours.length - 1;
      if (previous !== void 0 && hour < previous) hour += 24;
      if (start === void 0) start = hour;
      if (previous !== void 0 && hour - previous > 1 || last) {
        ranges.push(`${start % 24}:00 - ${((last ? hour : previous) + 1) % 24}:00`);
        start = hour;
      }
      previous = hour;
    });
    return { value: utcHours, label: ranges.join(", ") };
  }
  validateValueShape(definition, operator, condition, path, issues) {
    const value = condition.value;
    const values = Array.isArray(value) ? value : [value];
    if (["STRING", "EMAIL", "TEXT_AREA"].includes(operator.type) && !usesMultiInput(definition, operator) && typeof value !== "string") issues.push(issue("VALUE_TYPE", `${operator.type} requires a string value.`, `${path}.value`));
    if (NUMBER_TYPES.has(operator.type)) {
      if (values.some((item) => typeof item === "boolean" || !Number.isFinite(Number(item)))) issues.push(issue("VALUE_TYPE", `${operator.type} requires numeric value(s).`, `${path}.value`));
      if (operator.type === "INTEGER" && values.some((item) => !Number.isInteger(Number(item)))) issues.push(issue("INTEGER_REQUIRED", "The frontend integer control rejects decimal values.", `${path}.value`));
    }
    if (operator.type === "BOOLEAN" && ![true, false, "true", "false"].includes(value)) issues.push(issue("VALUE_TYPE", "BOOLEAN requires true or false.", `${path}.value`));
    if (typeof value === "string" && !["DATETIME", "DATE_TIME_RANGE", "RANGE"].includes(operator.type) && SANITIZE_PATTERN.test(value)) issues.push(issue("UNSAFE_CHARACTERS", "The value contains characters rejected by the frontend sanitizer.", `${path}.value`));
    if (definition.columnId === "SMS" && (typeof value !== "string" || !/^\d+$/.test(value))) issues.push(issue("SMS_FORMAT", "SMS accepts digits only; a leading + is stripped by the frontend.", `${path}.value`));
    if (operator.type === "RANGE") {
      const atoms = typeof value === "string" ? value.split(",") : [];
      const numbers = atoms.map(Number);
      if (atoms.length !== 2 || numbers.some((item) => !Number.isFinite(item))) issues.push(issue("VALUE_TYPE", "RANGE requires exactly two numeric values.", `${path}.value`));
      else {
        const custom = definition.groupType === "CUSTOM";
        if (!custom && numbers.some((item) => !Number.isInteger(item) || item < 0)) issues.push(issue("RANGE_INTEGER", "Standard frontend ranges use non-negative integers.", `${path}.value`));
        if (numbers[1] <= numbers[0]) issues.push(issue("RANGE_ORDER", "Range end must be greater than range start.", `${path}.value`));
      }
    }
    if (operator.type === "DATETIME" && (typeof value !== "string" || !moment(value, DATE_TIME_FORMAT, true).isValid())) issues.push(issue("VALUE_TYPE", `DATETIME requires ${DATE_TIME_FORMAT}.`, `${path}.value`));
    if (operator.type === "DATE" && (typeof value !== "string" || !moment(value, DATE_FORMAT, true).isValid())) issues.push(issue("VALUE_TYPE", `DATE requires ${DATE_FORMAT}.`, `${path}.value`));
    if (operator.type === "DATE_TIME_RANGE") {
      const dates = typeof value === "string" ? value.split(",").map((item) => moment(item.trim(), DATE_TIME_FORMAT, true)) : [];
      if (dates.length !== 2 || dates.some((item) => !item.isValid())) issues.push(issue("VALUE_TYPE", `DATE_TIME_RANGE requires two ${DATE_TIME_FORMAT} values.`, `${path}.value`));
    }
    if (definition.type === "TIME") {
      if (!Array.isArray(value) || value.length === 0 || value.some((item) => !Number.isInteger(Number(item)) || Number(item) < 0 || Number(item) > 23)) issues.push(issue("TIME_RANGE", "TIME requires one or more UTC hours from 0 through 23.", `${path}.value`));
      if (typeof condition.label !== "string") issues.push(issue("TIME_LABEL_REQUIRED", "TIME requires the frontend display-hours label.", `${path}.label`));
    }
    if (usesMultiInput(definition, operator) && !SYSTEM_COMMA_COLUMNS.has(definition.columnId ?? "") && !Array.isArray(value)) {
      issues.push(issue("VALUE_TYPE", `${operator.name} stores an array in UI JSON.`, `${path}.value`));
    }
    if (operator.type === "AUTOCOMPLETE" && (definition.requestURL != null || operator.requestURL != null)) {
      if (typeof condition.label !== "string" || condition.label.trim() === "") issues.push(issue("AUTOCOMPLETE_LABEL_REQUIRED", "Autocomplete selections require the display label returned by the frontend lookup.", `${path}.label`));
      if ((definition.columnId === "GROUP" || ACTIVITY_MESSAGE_COLUMNS.has(definition.columnId ?? "")) && typeof condition.label === "string") {
        try {
          const parsed = JSON.parse(condition.label);
          if (!Array.isArray(parsed)) throw new Error("not an array");
          if (definition.columnId === "GROUP") {
            const selected = Array.isArray(value) ? value : [value];
            const labelsValid = parsed.every((item) => typeof item === "object" && item !== null && "value" in item && "label" in item && typeof item.label === "string");
            const labelValues = parsed.map((item) => item.value);
            if (!labelsValid || selected.length !== labelValues.length || selected.some((item) => !labelValues.some((candidate) => scalarEquals(item, candidate)))) {
              throw new Error("selection mismatch");
            }
          } else if (!parsed.every((item) => typeof item === "object" && item !== null && typeof item.selectedOption === "string")) {
            throw new Error("missing selectedOption");
          }
        } catch {
          issues.push(issue("AUTOCOMPLETE_LABEL_FORMAT", `${definition.columnId} stores matching selection metadata as a JSON array.`, `${path}.label`));
        }
      }
    }
    if (/STREAK$/.test(operator.name) && Number(value) < 2) issues.push(issue("VALUE_MIN", "Streak duration must be at least 2.", `${path}.value`));
    if (["REGULAR_DATE", "DATE", "DATETIME"].includes(definition.type) && NUMBER_TYPES.has(operator.type) && Number(value) < 1) issues.push(issue("VALUE_MIN", "Date duration must be at least 1.", `${path}.value`));
    this.validateSyntheticSelect(operator, value, definition, path, issues);
    const metadata = definition.profileInputMetadata;
    const properties = metadata?.controlTypeProperties ?? definition.controlTypeProperties;
    if (NUMBER_TYPES.has(operator.type) && properties !== void 0) {
      const numeric = Number(values[0]);
      const min = Number(properties.MIN_VALUE ?? properties.minValue);
      const max = Number(properties.MAX_VALUE ?? properties.maxValue);
      if (Number.isFinite(min) && numeric < min) issues.push(issue("VALUE_MIN", `Value must be at least ${min}.`, `${path}.value`));
      if (Number.isFinite(max) && numeric > max) issues.push(issue("VALUE_MAX", `Value must be at most ${max}.`, `${path}.value`));
    }
  }
  validateSyntheticSelect(operator, value, definition, path, issues) {
    const number = Number(value);
    if (operator.type === "SELECT_DAY" && (!Number.isInteger(number) || number < 1 || number > 31)) issues.push(issue("OPTION_NOT_AVAILABLE", "Day must be from 1 through 31.", `${path}.value`));
    if (operator.type === "SELECT_MONTH" && (!Number.isInteger(number) || number < 1 || number > 12)) issues.push(issue("OPTION_NOT_AVAILABLE", "Month must be from 1 through 12.", `${path}.value`));
    if (operator.type === "SELECT_PERCENT" && (!Number.isInteger(number) || number < 1 || number > 100)) issues.push(issue("OPTION_NOT_AVAILABLE", "Percent must be from 1 through 100.", `${path}.value`));
    if (operator.type === "SELECT_YEAR") {
      const current = moment().year();
      const short = SHORT_YEAR_COLUMNS.has(definition.columnId ?? "");
      const min = short ? 2011 : current - 80;
      const max = short ? current : current + 5;
      if (!Number.isInteger(number) || number < min || number > max) issues.push(issue("OPTION_NOT_AVAILABLE", `Year must be from ${min} through ${max}.`, `${path}.value`));
    }
  }
  validateOptions(definition, operator, value, path, issues) {
    const options = [...definition.options ?? [], ...definition.profileInputMetadata?.options ?? []];
    if (options.length === 0 || operator.requestURL != null || definition.requestURL != null || !["SELECT", "CHECKBOX_GROUP"].includes(operator.type)) return;
    const atoms = SYSTEM_COMMA_COLUMNS.has(definition.columnId ?? "") && typeof value === "string" ? value.split(",").map((item) => item.trim()) : Array.isArray(value) ? value : [value];
    for (const atom of atoms) {
      const option = this.findOption(definition, atom);
      const unavailable = option === void 0 || operator.name !== "ONE_OF" && option.inUse === false || operator.type === "CHECKBOX_GROUP" && option.inUse === false;
      if (unavailable) issues.push(issue("OPTION_NOT_AVAILABLE", `${JSON.stringify(atom)} is not an available option of ${definition.columnId}.`, `${path}.value`));
    }
  }
  validateFeatureDecision(definition, path, issues) {
    if (definition.categoryType !== "LOCATION") return;
    const decision = this.context.enabledFeatures?.GEOMARKETING_UI;
    if (decision === false) issues.push(issue("FEATURE_NOT_AVAILABLE", "Location conditions are hidden by the frontend organization configuration.", path));
    if (decision === void 0 && this.context.requireResolvedFeatures === true) issues.push(issue("FEATURE_CONTEXT_REQUIRED", "GEOMARKETING_UI must be resolved to validate location UI availability.", path));
  }
  toUtcDateTime(value) {
    const text = scalarText(value);
    const parsed = moment.tz(text, DATE_TIME_FORMAT, true, this.context.timeZone ?? "UTC");
    return parsed.isValid() ? parsed.utc().format(DATE_TIME_FORMAT) : text;
  }
};

// src/businessRules.ts
import moment2 from "./moment-timezone.js";
var SC_RULES = /* @__PURE__ */ new Map([
  ["SC_ORDER_STATUS", { supportedEvents: ["Order Online", "Order Offline"] }],
  ["SC_ORDER_ITEMS_AMOUNT", { supportedEvents: ["Order Online", "Order Offline"] }],
  ["SC_ORDER_SUM_PRICE", { supportedEvents: ["Order Online", "Order Offline"] }],
  ["SC_ORDER_NUMBER", { supportedEvents: ["Order Online", "Order Offline"] }],
  ["SC_CATEGORY_KEY", { supportedEvents: ["CategoryPage"] }],
  ["SC_PRODUCT_NAME", { unsupportedEvents: ["CategoryPage"] }],
  ["SC_PRODUCT_BRAND", { unsupportedEvents: ["CategoryPage"] }],
  ["SC_PRODUCT_URL", { unsupportedEvents: ["CategoryPage"] }],
  ["SC_PRODUCT_PRICE", { unsupportedEvents: ["CategoryPage"] }],
  ["SC_PRODUCT_IN_STOCK", { unsupportedEvents: ["CategoryPage"] }],
  ["SC_PRODUCT_ID", { unsupportedEvents: ["CategoryPage"] }],
  ["SC_PRODUCT_CATEGORY", { unsupportedEvents: ["CategoryPage"] }],
  ["SC_DEVICE_NAME", { unsupportedEvents: ["Order Offline"] }],
  ["SC_PAGE_URL", { unsupportedEvents: ["Order Offline"] }],
  ["SC_DEVICE_MODEL", { unsupportedEvents: ["Order Offline"] }],
  ["SC_BROWSER_NAME", { unsupportedEvents: ["Order Offline"] }],
  ["SC_DEVICE_BRAND", { unsupportedEvents: ["Order Offline"] }],
  ["SC_UTM_TERM", { unsupportedEvents: ["Order Offline"] }],
  ["SC_UTM_CONTENT", { unsupportedEvents: ["Order Offline"] }],
  ["SC_UTM_CAMPAIGN", { unsupportedEvents: ["Order Offline"] }],
  ["SC_UTM_MEDIUM", { unsupportedEvents: ["Order Offline"] }],
  ["SC_UTM_SOURCE", { unsupportedEvents: ["Order Offline"] }],
  ["SC_RECALL", { supportedEvents: ["Possible buyers", "Possible visitors"] }]
]);
var SC_PREDICTION_IDS = /* @__PURE__ */ new Set(["SC_PURCHASE_PROBABILITY", "SC_CHURN_PROBABILITY"]);
var SC_PREDICTED_BUYER_IDS = /* @__PURE__ */ new Set(["SURE_BUYERS", "POTENTIAL_BUYERS", "UNLIKELY_BUYERS", "UNDECIDED_BUYERS", "SC_RECALL"]);
var SC_SPECIAL_PERIODS = /* @__PURE__ */ new Map([
  ["Probability", 90],
  ["Possible buyers", 30],
  ["Possible visitors", 7]
]);
var CA_SUPPORT = /* @__PURE__ */ new Map([
  ["ACTIVITY_COUNT", ["COUNT_SENT", "COUNT_DELIVERED", "COUNT_FAILED", "COUNT_OPENED", "COUNT_CLICKED", "COUNT_SPAM"]],
  ["ACTIVITY_CTOR", ["COUNT_CLICKED"]],
  ["ACTIVITY_CTR", ["COUNT_CLICKED"]],
  ["ACTIVITY_OPEN_RATE", ["COUNT_OPENED"]],
  ["ACTIVITY_DELIVERY_RATE", ["COUNT_DELIVERED"]],
  ["ACTIVITY_UNSUBSCRIBE_REASON", ["COUNT_UNSUBSCRIBED"]],
  ["ACTIVITY_MEDIA_TYPE", ["COUNT_SENT", "COUNT_DELIVERED", "COUNT_FAILED", "COUNT_OPENED", "COUNT_CLICKED", "COUNT_UNSENT"]],
  ["ACTIVITY_LANGUAGE", ["COUNT_SENT", "COUNT_DELIVERED", "COUNT_FAILED", "COUNT_OPENED", "COUNT_CLICKED", "COUNT_SPAM", "COUNT_UNSUBSCRIBED"]],
  ["ACTIVITY_RESPONSE_MINUTES", ["COUNT_OPENED"]],
  ["ACTIVITY_HOUR_BLOCK", ["COUNT_SENT", "COUNT_DELIVERED", "COUNT_FAILED", "COUNT_OPENED", "COUNT_CLICKED", "COUNT_SPAM", "COUNT_UNSUBSCRIBED"]],
  ["ACTIVITY_CONTENT_PART", ["COUNT_OPENED", "COUNT_CLICKED"]],
  ["ACTIVITY_URL", ["COUNT_CLICKED"]]
]);
var CA_ALWAYS = /* @__PURE__ */ new Set([
  "ACTIVITY_MESSAGE_TYPE",
  "ACTIVITY_TAG",
  "ACTIVITY_MESSAGE_ID",
  "ACTIVITY_CALLOUT_ID",
  "ACTIVITY_IMCALLOUT_ID",
  "ACTIVITY_WORKFLOW_ID",
  "ACTIVITY_SUBSCRIPTION_CATEGORY_ID",
  "ACTIVITY_STRATEGY_GROUPID",
  "ACTIVITY_EMAIL_DOMAIN"
]);
var WIDGET_SUPPORT = /* @__PURE__ */ new Map([
  ["ACTIVITY_COUNT", ["COUNT_OPENED", "COUNT_CLICKED"]],
  ["ACTIVITY_CTOR", ["COUNT_CLICKED"]],
  ["ACTIVITY_WIDGET_TYPE", ["COUNT_OPENED", "COUNT_CLICKED"]],
  ["ACTIVITY_LANGUAGE", ["COUNT_OPENED", "COUNT_CLICKED"]],
  ["ACTIVITY_MESSAGE_ID", ["COUNT_OPENED", "COUNT_CLICKED"]]
]);
var ALL_MESSAGE_EVENTS = /* @__PURE__ */ new Set([
  "COUNT_SENT",
  "COUNT_DELIVERED",
  "COUNT_FAILED",
  "COUNT_OPENED",
  "COUNT_CLICKED",
  "COUNT_UNSUBSCRIBED",
  "COUNT_UNSENT",
  "COUNT_SPAM"
]);
var MEDIA_EVENT_SUPPORT = /* @__PURE__ */ new Map([
  ["EMAIL", ALL_MESSAGE_EVENTS],
  ["SMS", ALL_MESSAGE_EVENTS],
  ["WEB_PUSH", ALL_MESSAGE_EVENTS],
  ["MOBILE_PUSH", ALL_MESSAGE_EVENTS],
  ["VIBER", ALL_MESSAGE_EVENTS],
  ["PULL", ALL_MESSAGE_EVENTS],
  ["PLUTO", ALL_MESSAGE_EVENTS],
  ["TELEGRAM_BOT", /* @__PURE__ */ new Set(["COUNT_SENT", "COUNT_CLICKED", "COUNT_DELIVERED", "COUNT_FAILED"])],
  ["IN_APP", /* @__PURE__ */ new Set(["COUNT_OPENED", "COUNT_CLICKED", "COUNT_FAILED"])]
]);
var ACTIVITY_OCCURRENCE_COLUMNS = /* @__PURE__ */ new Set([
  "ACTIVITY_COUNT",
  "ACTIVITY_CTOR",
  "ACTIVITY_CTR",
  "ACTIVITY_OPEN_RATE",
  "ACTIVITY_DELIVERY_RATE",
  "ACTIVITY_RESPONSE_MINUTES"
]);
var ACTIVITY_MESSAGE_COLUMNS2 = /* @__PURE__ */ new Set(["ACTIVITY_MESSAGE_ID", "ACTIVITY_CALLOUT_ID", "ACTIVITY_IMCALLOUT_ID"]);
var DATE_TIME_FORMAT2 = "DD/MM/YYYY HH:mm";
function isSimple(value) {
  return "column" in value;
}
function isAggregate(value) {
  return "aggregate" in value;
}
function columnIds(condition) {
  return condition.aggregate.conditions.map((criterion) => criterion.column.columnId).filter((value) => typeof value === "string");
}
function occurrences(ids, id) {
  return ids.filter((value) => value === id).length;
}
function eventValues(condition, columnId) {
  const value = condition.aggregate.conditions.find((criterion) => criterion.column.columnId === columnId)?.value;
  return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}
function isMobilePushApplication(catalog, definition, value) {
  const explicit = catalog.context.mobilePushApplicationIds;
  if (explicit !== void 0) return explicit.some((id) => String(id) === String(value));
  return Boolean(catalog.findOption(definition, value)?.index);
}
function validateSc(condition, catalog, path) {
  const issues = [];
  const events = eventValues(condition, "SC_EVENT_NAME");
  const specialEvents = events.filter((event) => SC_SPECIAL_PERIODS.has(event));
  if (specialEvents.length > 0 && events.length !== 1) {
    issues.push(issue("SC_SPECIAL_EVENT_MUST_BE_SINGLE", "Probability and possible-buyer/visitor selections are single-event choices in the frontend.", path));
  }
  const optional = condition.aggregate.conditions.filter(
    (criterion) => !["SC_EVENT_NAME", "SC_EVENT_DATE"].includes(criterion.column.columnId ?? "")
  );
  if (specialEvents.length === 1 && optional.length === 0) {
    issues.push(issue("SC_SPECIAL_CRITERION_REQUIRED", `${specialEvents[0]} has no All option; choose one criterion offered by the frontend.`, path));
  }
  for (const [index, criterion] of condition.aggregate.conditions.entries()) {
    const id = criterion.column.columnId;
    if (typeof id !== "string" || id === "SC_EVENT_NAME" || id === "SC_EVENT_DATE") continue;
    if (events[0] === "Probability" && !SC_PREDICTION_IDS.has(id)) {
      issues.push(issue("SC_CRITERION_EVENT_MISMATCH", `${id} is not offered for Probability.`, `${path}.aggregate.conditions[${index}]`));
    } else if (["Possible buyers", "Possible visitors"].includes(events[0]) && !SC_PREDICTED_BUYER_IDS.has(id)) {
      issues.push(issue("SC_CRITERION_EVENT_MISMATCH", `${id} is not offered for ${events[0]}.`, `${path}.aggregate.conditions[${index}]`));
    } else if (!SC_SPECIAL_PERIODS.has(events[0]) && (SC_PREDICTION_IDS.has(id) || SC_PREDICTED_BUYER_IDS.has(id))) {
      issues.push(issue("SC_CRITERION_EVENT_MISMATCH", `${id} is a predictive-only criterion.`, `${path}.aggregate.conditions[${index}]`));
    }
    if (SC_PREDICTION_IDS.has(id) && criterion.operator === "LESS_THAN" && Number(criterion.value) === 0) {
      issues.push(issue("SC_PREDICTION_OPTION_NOT_AVAILABLE", "The frontend removes 0 from LESS_THAN probability options.", `${path}.aggregate.conditions[${index}].value`));
    }
    if (SC_PREDICTION_IDS.has(id) && criterion.operator === "GREATER_THAN" && Number(criterion.value) === 100) {
      issues.push(issue("SC_PREDICTION_OPTION_NOT_AVAILABLE", "The frontend removes 100 from GREATER_THAN probability options.", `${path}.aggregate.conditions[${index}].value`));
    }
    if (events.length === 1 && events[0] === "CategoryPage") {
      let definition;
      try {
        definition = catalog.resolveColumn(id, "AGGREGATED_SC");
      } catch {
        definition = void 0;
      }
      const allowed = definition?.group === "Product" && id === "SC_CATEGORY_KEY" || definition?.group === "Auditory";
      if (!allowed) issues.push(issue("SC_CATEGORY_PAGE_CRITERION", `${id} is outside the CategoryPage-only Product/Auditory menu.`, `${path}.aggregate.conditions[${index}]`));
    }
    const rule = SC_RULES.get(id);
    if (rule?.supportedEvents !== void 0 && !events.some((event) => rule.supportedEvents?.includes(event))) {
      issues.push(issue("SC_CRITERION_EVENT_MISMATCH", `${id} is not available for event ${events.join(", ")}.`, `${path}.aggregate.conditions[${index}]`));
    }
    if (rule?.unsupportedEvents !== void 0 && events.length > 0 && events.every((event) => rule.unsupportedEvents?.includes(event))) {
      issues.push(issue("SC_CRITERION_EVENT_MISMATCH", `${id} is hidden for event ${events.join(", ")}.`, `${path}.aggregate.conditions[${index}]`));
    }
  }
  const dates = condition.aggregate.conditions.filter((criterion) => criterion.column.columnId === "SC_EVENT_DATE");
  const from = dates.find((criterion) => criterion.operator === "GREATER_THAN_OR_EQUAL")?.value;
  const to = dates.find((criterion) => criterion.operator === "LESS_THAN_OR_EQUAL")?.value;
  const isAllTime = from === "01/01/2010 00:00" && to === "01/01/2050 00:00";
  if (isAllTime && !events.every((event) => ["Order Online", "Order Offline"].includes(event))) {
    issues.push(issue("SC_ALL_TIME_NOT_AVAILABLE", "All time is offered only for Order Online and Order Offline.", path));
  }
  const relativeDates = dates.filter((date) => date.operator !== "GREATER_THAN_OR_EQUAL" && date.operator !== "LESS_THAN_OR_EQUAL");
  for (const [index, date] of relativeDates.entries()) {
    const specialPeriod = events.length === 1 ? SC_SPECIAL_PERIODS.get(events[0]) : void 0;
    if (specialPeriod !== void 0 && (date.operator !== "NEXT_DAYS" || Number(date.value) !== specialPeriod)) {
      issues.push(issue("SC_SPECIAL_PERIOD_FIXED", `${events[0]} uses the frontend's fixed NEXT_DAYS ${specialPeriod} period.`, `${path}.aggregate.conditions[${index + 1}]`));
    }
    if (specialPeriod === void 0 && date.operator === "NEXT_DAYS") {
      issues.push(issue("SC_NEXT_DAYS_NOT_AVAILABLE", "NEXT_DAYS is offered only for predictive SoftCube events.", `${path}.aggregate.conditions[${index + 1}]`));
    }
  }
  const validDays = Number.isFinite(catalog.context.scEventDateValidPeriodDays) ? Math.max(0, Number(catalog.context.scEventDateValidPeriodDays)) : 60;
  if (typeof from === "string" && typeof to === "string" && !isAllTime) {
    const start = moment2(from, DATE_TIME_FORMAT2, true);
    const end = moment2(to, DATE_TIME_FORMAT2, true);
    if (start.isValid() && end.isValid()) {
      if (start.isAfter(end)) {
        issues.push(issue("SC_PERIOD_ORDER", "SoftCube period start must not be after its end.", path));
      } else if (end.diff(start, "minutes", true) > validDays * 24 * 60) {
        issues.push(issue("SC_PERIOD_TOO_LONG", `SoftCube custom period cannot exceed ${validDays} days.`, path));
      }
    }
  }
  for (const [index, date] of dates.entries()) {
    if (events.length === 1 && SC_SPECIAL_PERIODS.has(events[0])) continue;
    if (typeof date.value !== "number" && typeof date.value !== "string") continue;
    const numeric = Number(date.value);
    if (!Number.isFinite(numeric)) continue;
    const maximum = date.operator.includes("WEEKS") ? Math.floor(validDays / 7) : date.operator.includes("HOURS") ? Math.floor(validDays * 24) : validDays;
    if ((date.operator.includes("DAYS") || date.operator.includes("WEEKS") || date.operator.includes("HOURS")) && numeric > maximum) {
      issues.push(issue("SC_PERIOD_TOO_LONG", `${date.operator} cannot exceed ${maximum}.`, `${path}.aggregate.conditions[${index}]`));
    }
  }
  return issues;
}
function validateCustomEvent(condition, catalog, path) {
  const issues = [];
  const ids = columnIds(condition);
  const dateId = ids.find((id) => ["EVENT_FIRST_DATE", "EVENT_LAST_DATE"].includes(id));
  if (dateId !== void 0 && ids.includes("EVENT_COUNT")) {
    issues.push(issue("EVENT_COUNT_WITH_FIRST_OR_LAST", "EVENT_COUNT is not offered for first/last-event date modes.", path));
  }
  const eventValue = condition.aggregate.conditions.find((criterion) => criterion.column.columnId === "EVENT_TYPE_ID")?.value;
  let eventDefinition;
  try {
    eventDefinition = catalog.resolveColumn("EVENT_TYPE_ID", "AGGREGATED_CUSTOM_EVENTS");
  } catch {
    return issues;
  }
  const eventOption = catalog.findOption(eventDefinition, eventValue);
  const eventParameterIds = new Set((eventOption?.params ?? []).map((parameter) => parameter.columnId).filter(Boolean));
  for (const [index, criterion] of condition.aggregate.conditions.entries()) {
    const id = criterion.column.columnId;
    if (typeof id === "string" && id.includes("EVENT_PARAMS") && !eventParameterIds.has(id)) {
      issues.push(issue("EVENT_PARAMETER_NOT_AVAILABLE", `${id} is not defined for the selected event.`, `${path}.aggregate.conditions[${index}]`));
    }
  }
  return issues;
}
function validateActivity(condition, family, path) {
  const issues = [];
  const events = eventValues(condition, "ACTIVITY_EVENT_ID");
  const supportMap = family === "AGGREGATED_WIDGET_ACTIVITY" ? WIDGET_SUPPORT : CA_SUPPORT;
  const managed = family === "AGGREGATED_WIDGET_ACTIVITY" ? /* @__PURE__ */ new Set(["ACTIVITY_EVENT_ID", "ACTIVITY_DATE", "ACTIVITY_MEDIA_TYPE"]) : /* @__PURE__ */ new Set(["ACTIVITY_EVENT_ID", "ACTIVITY_DATE"]);
  if (!condition.aggregate.conditions.some((criterion) => !managed.has(criterion.column.columnId ?? ""))) {
    issues.push(issue("ACTIVITY_CRITERION_REQUIRED", "The activity frontend has no All option; select at least one activity criterion.", path));
  }
  for (const [index, criterion] of condition.aggregate.conditions.entries()) {
    const id = criterion.column.columnId;
    if (typeof id !== "string" || ["ACTIVITY_EVENT_ID", "ACTIVITY_DATE"].includes(id)) continue;
    if (family === "AGGREGATED_WIDGET_ACTIVITY" && id === "ACTIVITY_MEDIA_TYPE" && criterion.value === "WIDGET") continue;
    const supportedEvents = supportMap.get(id);
    if (supportedEvents === void 0 && !(family === "AGGREGATED_ACTIVITY" && CA_ALWAYS.has(id))) {
      issues.push(issue("ACTIVITY_CRITERION_NOT_OFFERED", `${id} is not offered by the ${family} frontend menu.`, `${path}.aggregate.conditions[${index}]`));
    } else if (supportedEvents !== void 0 && !events.some((event) => supportedEvents.includes(event))) {
      issues.push(issue("ACTIVITY_CRITERION_EVENT_MISMATCH", `${id} is not supported by event ${events.join(", ")}.`, `${path}.aggregate.conditions[${index}]`));
    }
    if (family === "AGGREGATED_ACTIVITY" && id === "ACTIVITY_MEDIA_TYPE") {
      const mediaValues = String(criterion.value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
      for (const media of mediaValues) {
        const supported = MEDIA_EVENT_SUPPORT.get(media);
        if (supported !== void 0 && events.some((event) => !supported.has(event))) {
          issues.push(issue("ACTIVITY_MEDIA_EVENT_MISMATCH", `${media} does not support every selected activity event.`, `${path}.aggregate.conditions[${index}]`));
        }
      }
    }
    if (ACTIVITY_MESSAGE_COLUMNS2.has(id ?? "") && typeof criterion.label === "string") {
      try {
        const selections = JSON.parse(criterion.label);
        if (!Array.isArray(selections)) throw new Error("not an array");
        for (const selection of selections) {
          const media = typeof selection?.selectedOption === "string" ? selection.selectedOption : void 0;
          if (media === void 0) continue;
          const supported = media === void 0 ? void 0 : MEDIA_EVENT_SUPPORT.get(media);
          if (supported === void 0 || events.some((event) => !supported.has(event))) {
            issues.push(issue("ACTIVITY_MEDIA_EVENT_MISMATCH", "The autocomplete media type in the stored label is not offered for every selected event.", `${path}.aggregate.conditions[${index}].label`));
          }
        }
      } catch {
      }
    }
  }
  if (family === "AGGREGATED_WIDGET_ACTIVITY" && events.some((event) => !["COUNT_OPENED", "COUNT_CLICKED"].includes(event))) {
    issues.push(issue("WIDGET_EVENT_NOT_AVAILABLE", "Widget activity only offers COUNT_OPENED and COUNT_CLICKED.", path));
  }
  const occurrenceCount = columnIds(condition).filter((id) => ACTIVITY_OCCURRENCE_COLUMNS.has(id)).length;
  if (occurrenceCount > 1) {
    issues.push(issue(
      "ACTIVITY_OCCURRENCE_MUTUALLY_EXCLUSIVE",
      "The activity editor offers count/rate/response occurrence controls as one mutually exclusive choice.",
      path
    ));
  }
  return issues;
}
function validatePush(condition, catalog, path) {
  const issues = [];
  const appValue = condition.aggregate.conditions.find((criterion) => criterion.column.columnId === "PUSH_APPLICATION_ID")?.value;
  let mobile = false;
  try {
    const appDefinition = catalog.resolveColumn("PUSH_APPLICATION_ID", "AGGREGATED_PUSH");
    mobile = isMobilePushApplication(catalog, appDefinition, appValue);
  } catch {
    return issues;
  }
  if (mobile && condition.aggregate.conditions.every((criterion) => criterion.column.columnId === "PUSH_APPLICATION_ID")) {
    issues.push(issue("MOBILE_PUSH_CRITERION_REQUIRED", "Mobile push has no All option; select at least one nested criterion.", path));
  }
  const forbidden = mobile ? /* @__PURE__ */ new Set(["PUSH_BROWSER"]) : /* @__PURE__ */ new Set(["PUSH_APP_VERSION", "PUSH_DEVICE_MODEL", "PUSH_TOKEN"]);
  for (const [index, criterion] of condition.aggregate.conditions.entries()) {
    const id = criterion.column.columnId;
    if (typeof id === "string" && forbidden.has(id)) {
      issues.push(issue("PUSH_CRITERION_APP_MISMATCH", `${id} is hidden for this ${mobile ? "mobile" : "web"} push application.`, `${path}.aggregate.conditions[${index}]`));
    }
    if (mobile && id === "PUSH_OS") {
      try {
        const definition = catalog.resolveColumn("PUSH_OS", "AGGREGATED_PUSH");
        const values = Array.isArray(criterion.value) ? criterion.value : String(criterion.value ?? "").split(",");
        if (values.some((value) => catalog.findOption(definition, value)?.index !== 1)) {
          issues.push(issue("PUSH_OS_OPTION_NOT_AVAILABLE", "Mobile push offers only PUSH_OS options marked for mobile applications.", `${path}.aggregate.conditions[${index}]`));
        }
      } catch {
      }
    }
  }
  if (columnIds(condition).filter((id) => id === "PUSH_TOKEN").length > 1) {
    issues.push(issue("PUSH_TOKEN_MAX_ONE", "The push editor allows only one PUSH_TOKEN criterion per aggregate.", path));
  }
  return issues;
}
function validateCustomerData(condition, catalog, path) {
  const issues = [];
  const prefixes = new Set(condition.aggregate.conditions.map((criterion) => criterion.column.columnId).filter((id) => typeof id === "string").map((id) => id.split(".")[0]));
  if (prefixes.size > 1) issues.push(issue("CUSTOMER_DATA_SOURCE_MISMATCH", "All criteria in one CUSTOMER_DATA aggregate must come from the same data source.", path));
  condition.aggregate.conditions.forEach((criterion, index) => {
    try {
      const definition = catalog.resolve({ columnId: criterion.column.columnId ?? void 0, profileInputId: criterion.column.profileInputId ?? void 0, type: criterion.column.type ?? void 0 }, "AGGREGATED_CUSTOMER_DATA");
      if (definition.categoryType != null && criterion.label !== definition.categoryType) {
        issues.push(issue("CUSTOMER_DATA_LABEL", `Customer-data mapper stores ${definition.categoryType} as the condition label.`, `${path}.aggregate.conditions[${index}].label`));
      }
    } catch {
    }
  });
  return issues;
}
function validateAggregateOrder(condition, family, path) {
  const ids = columnIds(condition);
  const issues = [];
  const firstByFamily = {
    AGGREGATED_SC: "SC_EVENT_NAME",
    AGGREGATED_CUSTOM_EVENTS: "EVENT_TYPE_ID",
    AGGREGATED_ACTIVITY: "ACTIVITY_EVENT_ID",
    AGGREGATED_WIDGET_ACTIVITY: "ACTIVITY_EVENT_ID",
    AGGREGATED_PUSH: "PUSH_APPLICATION_ID",
    AGGREGATED_TOKEN: "TOKEN_APPLICATION_ID",
    AGGREGATED_CUSTOMER_LIFECYCLE: "LIFECYCLE_SCHEMA_ID"
  };
  const first = firstByFamily[family];
  if (first !== void 0 && ids[0] !== first) {
    issues.push(issue("SYSTEM_CRITERION_ORDER", `${first} must be first, as emitted by the frontend external mapper.`, `${path}.aggregate.conditions`));
  }
  const ensureDatePrefix = (dateId, maximum) => {
    const indices = ids.flatMap((id, index) => id === dateId ? [index] : []);
    if (indices.length > maximum || indices.some((index, offset) => index !== offset + 1)) {
      issues.push(issue("SYSTEM_CRITERION_ORDER", `${dateId} conditions must immediately follow the selector in frontend order.`, `${path}.aggregate.conditions`));
    }
  };
  if (family === "AGGREGATED_SC") ensureDatePrefix("SC_EVENT_DATE", 2);
  if (family === "AGGREGATED_ACTIVITY" || family === "AGGREGATED_WIDGET_ACTIVITY") ensureDatePrefix("ACTIVITY_DATE", 2);
  if (family === "AGGREGATED_CUSTOM_EVENTS") {
    const dateIndices = ids.flatMap((id, index) => ["EVENT_DATE", "EVENT_FIRST_DATE", "EVENT_LAST_DATE"].includes(id) ? [index] : []);
    if (dateIndices.length > 1 || dateIndices.some((index) => index !== 1)) {
      issues.push(issue("SYSTEM_CRITERION_ORDER", "The custom-event date condition must immediately follow EVENT_TYPE_ID.", `${path}.aggregate.conditions`));
    }
  }
  if (family === "AGGREGATED_CUSTOMER_LIFECYCLE" && ids[1] !== "LIFECYCLE_STATE_ID") {
    issues.push(issue("SYSTEM_CRITERION_ORDER", "LIFECYCLE_STATE_ID must follow LIFECYCLE_SCHEMA_ID.", `${path}.aggregate.conditions`));
  }
  return issues;
}
function scCriterionSupported(id, events) {
  if (events.length === 1 && events[0] === "Probability") return SC_PREDICTION_IDS.has(id);
  if (events.length === 1 && ["Possible buyers", "Possible visitors"].includes(events[0])) return SC_PREDICTED_BUYER_IDS.has(id);
  if (events.some((event) => SC_SPECIAL_PERIODS.has(event))) return false;
  if (SC_PREDICTION_IDS.has(id) || SC_PREDICTED_BUYER_IDS.has(id)) return false;
  const rule = SC_RULES.get(id);
  if (rule?.supportedEvents !== void 0 && !events.some((event) => rule.supportedEvents?.includes(event))) return false;
  if (rule?.unsupportedEvents !== void 0 && events.length > 0 && events.every((event) => rule.unsupportedEvents?.includes(event))) return false;
  return true;
}
function activityCriterionSupported(criterion, family, events) {
  const id = criterion.column.columnId;
  if (typeof id !== "string" || ["ACTIVITY_EVENT_ID", "ACTIVITY_DATE"].includes(id)) return true;
  if (family === "AGGREGATED_WIDGET_ACTIVITY" && id === "ACTIVITY_MEDIA_TYPE" && criterion.value === "WIDGET") return true;
  const supportMap = family === "AGGREGATED_WIDGET_ACTIVITY" ? WIDGET_SUPPORT : CA_SUPPORT;
  const supportedEvents = supportMap.get(id);
  if (supportedEvents === void 0 && !(family === "AGGREGATED_ACTIVITY" && CA_ALWAYS.has(id))) return false;
  if (supportedEvents !== void 0 && !events.some((event) => supportedEvents.includes(event))) return false;
  if (family === "AGGREGATED_ACTIVITY" && id === "ACTIVITY_MEDIA_TYPE") {
    const mediaValues = String(criterion.value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    return mediaValues.every((media) => {
      const supported = MEDIA_EVENT_SUPPORT.get(media);
      return supported === void 0 || events.every((event) => supported.has(event));
    });
  }
  return true;
}
function reconcileFrontendAggregate(condition, catalog) {
  const family = inferFamily(condition);
  const removed = [];
  let keep = () => true;
  if (family === "AGGREGATED_SC") {
    const events = eventValues(condition, "SC_EVENT_NAME");
    keep = (criterion) => {
      const id = criterion.column.columnId;
      if (typeof id !== "string" || REQUIRED_COLUMNS[family].includes(id)) return true;
      if (events.length === 1 && events[0] === "CategoryPage") {
        let definition;
        try {
          definition = catalog.resolveColumn(id, family);
        } catch {
          return false;
        }
        return (definition.group === "Product" && id === "SC_CATEGORY_KEY" || definition.group === "Auditory") && scCriterionSupported(id, events);
      }
      return scCriterionSupported(id, events);
    };
  } else if (family === "AGGREGATED_CUSTOM_EVENTS") {
    const selectedEvent = condition.aggregate.conditions.find((criterion) => criterion.column.columnId === "EVENT_TYPE_ID")?.value;
    let eventDefinition;
    try {
      eventDefinition = catalog.resolveColumn("EVENT_TYPE_ID", family);
    } catch {
      eventDefinition = void 0;
    }
    const eventOption = eventDefinition === void 0 ? void 0 : catalog.findOption(eventDefinition, selectedEvent);
    const parameterIds = new Set((eventOption?.params ?? []).map((definition) => definition.columnId).filter(Boolean));
    const firstOrLast = condition.aggregate.conditions.some(
      (criterion) => criterion.column.columnId === "EVENT_FIRST_DATE" || criterion.column.columnId === "EVENT_LAST_DATE"
    );
    keep = (criterion) => {
      const id = criterion.column.columnId;
      if (id === "EVENT_COUNT" && firstOrLast) return false;
      return typeof id !== "string" || !id.includes("EVENT_PARAMS") || parameterIds.has(id);
    };
  } else if (family === "AGGREGATED_ACTIVITY" || family === "AGGREGATED_WIDGET_ACTIVITY") {
    const events = eventValues(condition, "ACTIVITY_EVENT_ID");
    keep = (criterion) => activityCriterionSupported(criterion, family, events);
  } else if (family === "AGGREGATED_PUSH") {
    const selectedApp = condition.aggregate.conditions.find((criterion) => criterion.column.columnId === "PUSH_APPLICATION_ID")?.value;
    let appDefinition;
    try {
      appDefinition = catalog.resolveColumn("PUSH_APPLICATION_ID", family);
    } catch {
      appDefinition = void 0;
    }
    const mobile = appDefinition === void 0 ? false : isMobilePushApplication(catalog, appDefinition, selectedApp);
    const forbidden = mobile ? /* @__PURE__ */ new Set(["PUSH_BROWSER"]) : /* @__PURE__ */ new Set(["PUSH_APP_VERSION", "PUSH_DEVICE_MODEL", "PUSH_TOKEN"]);
    keep = (criterion) => {
      const id = criterion.column.columnId ?? "";
      if (forbidden.has(id)) return false;
      if (mobile && id === "PUSH_OS") {
        try {
          const definition = catalog.resolveColumn("PUSH_OS", family);
          const values = Array.isArray(criterion.value) ? criterion.value : String(criterion.value ?? "").split(",");
          return values.every((value) => catalog.findOption(definition, value)?.index === 1);
        } catch {
          return true;
        }
      }
      return true;
    };
  } else if (family === "AGGREGATED_CUSTOMER_DATA") {
    const first = condition.aggregate.conditions[0]?.column.columnId?.split(".")[0];
    keep = (criterion, index) => index === 0 || first === void 0 || criterion.column.columnId?.split(".")[0] === first;
  }
  condition.aggregate.conditions = condition.aggregate.conditions.filter((criterion, index) => {
    const retained = keep(criterion, index);
    if (!retained) removed.push(criterion.column.columnId ?? `criterion ${index + 1}`);
    return retained;
  });
  return removed.map((columnId) => issue(
    "UI_DEPENDENCY_RESET",
    `${columnId} was removed because the controlling aggregate selection no longer offers it.`
  ));
}
function validateAggregate(condition, catalog, path) {
  const issues = [];
  const family = inferFamily(condition);
  const features = catalog.context.enabledFeatures ?? {};
  const requireFeature = (name, relevant) => {
    if (relevant && catalog.context.requireResolvedFeatures === true && features[name] === void 0) {
      issues.push(issue("FEATURE_CONTEXT_REQUIRED", `${name} must be resolved to prove this aggregate is reachable in the frontend.`, path));
    }
  };
  requireFeature("SC_SEGMENTATION", family === "AGGREGATED_SC");
  requireFeature("DATA_SOURCE_PG_USAGE", family === "AGGREGATED_CUSTOMER_DATA");
  requireFeature("TMP_SHOW_CUSTOMER_LIFECYCLE_IN_CONTACTS_ANALYTICS", family === "AGGREGATED_CUSTOMER_LIFECYCLE");
  if (family === "AGGREGATED_SC" && features.SC_SEGMENTATION === false) {
    issues.push(issue("FEATURE_NOT_AVAILABLE", "SoftCube segmentation is hidden by the frontend organization configuration.", path));
  }
  if (family === "AGGREGATED_CUSTOMER_DATA" && features.DATA_SOURCE_PG_USAGE === false) {
    issues.push(issue("FEATURE_NOT_AVAILABLE", "Customer-data segmentation is hidden by the frontend organization configuration.", path));
  }
  if (family === "AGGREGATED_CUSTOMER_LIFECYCLE" && features.TMP_SHOW_CUSTOMER_LIFECYCLE_IN_CONTACTS_ANALYTICS === false) {
    issues.push(issue("FEATURE_NOT_AVAILABLE", "Customer lifecycle is hidden by the frontend organization configuration.", path));
  }
  const ids = columnIds(condition);
  issues.push(...validateAggregateOrder(condition, family, path));
  for (const required of REQUIRED_COLUMNS[family]) {
    if (!ids.includes(required)) issues.push(issue("REQUIRED_CRITERION_MISSING", `${family} requires ${required}.`, path));
  }
  if (occurrences(ids, "EVENT_COUNT") > 1) {
    issues.push(issue("EVENT_COUNT_MAX_ONE", "One custom-event aggregate can contain only one EVENT_COUNT criterion.", path));
  }
  if (occurrences(ids, "ACTIVITY_COUNT") > 1) {
    issues.push(issue("ACTIVITY_COUNT_MAX_ONE", "One activity aggregate can contain only one ACTIVITY_COUNT criterion.", path));
  }
  if (occurrences(ids, "PUSH_TOKEN") > 1) {
    issues.push(issue("PUSH_TOKEN_MAX_ONE", "One push aggregate can contain only one PUSH_TOKEN criterion.", path));
  }
  if (family === "AGGREGATED_CUSTOMER_DATA" && condition.aggregate.conditions.length === 0) {
    issues.push(issue("CUSTOMER_DATA_EMPTY", "CUSTOMER_DATA requires a source criterion.", path));
  }
  const selectedCustomEvent2 = family === "AGGREGATED_CUSTOM_EVENTS" ? condition.aggregate.conditions.find((criterion) => criterion.column.columnId === "EVENT_TYPE_ID")?.value : void 0;
  for (const [index, criterion] of condition.aggregate.conditions.entries()) {
    issues.push(...catalog.validateSimpleCondition(
      criterion,
      `${path}.aggregate.conditions[${index}]`,
      family,
      { event: selectedCustomEvent2 }
    ));
    if (criterion.originOperator != null) {
      issues.push(issue("DB_FIELD_IN_UI_MODEL", "originOperator is produced by UI-to-DB conversion and is not authored by the frontend editor.", `${path}.aggregate.conditions[${index}].originOperator`));
    }
  }
  if (family === "AGGREGATED_SC") issues.push(...validateSc(condition, catalog, path));
  if (family === "AGGREGATED_CUSTOM_EVENTS") issues.push(...validateCustomEvent(condition, catalog, path));
  if (family === "AGGREGATED_CUSTOM_EVENTS" && features.SEGMENT_BY_EVENTS_PARAMETERS === false) {
    condition.aggregate.conditions.forEach((criterion, index) => {
      if (criterion.column.columnId?.includes("EVENT_PARAMS")) {
        issues.push(issue("FEATURE_NOT_AVAILABLE", "Custom-event parameters are disabled by the frontend organization configuration.", `${path}.aggregate.conditions[${index}]`));
      }
    });
  }
  const hasEventParameters = family === "AGGREGATED_CUSTOM_EVENTS" && condition.aggregate.conditions.some((criterion) => criterion.column.columnId?.includes("EVENT_PARAMS"));
  requireFeature("SEGMENT_BY_EVENTS_PARAMETERS", hasEventParameters);
  if (family === "AGGREGATED_ACTIVITY" || family === "AGGREGATED_WIDGET_ACTIVITY") {
    issues.push(...validateActivity(condition, family, path));
  }
  if (family === "AGGREGATED_PUSH") issues.push(...validatePush(condition, catalog, path));
  if (family === "AGGREGATED_CUSTOMER_DATA") issues.push(...validateCustomerData(condition, catalog, path));
  if (features.PRODUCT_EVENTS_VISIBILITY === false) {
    if (family === "AGGREGATED_CUSTOMER_DATA" && condition.aggregate.conditions.some(
      (criterion) => criterion.column.columnId?.split(".")[0].toUpperCase() === "ORDERS"
    )) {
      issues.push(issue("FEATURE_NOT_AVAILABLE", "ORDERS customer-data conditions are hidden when product events are disabled.", path));
    }
    if (family === "AGGREGATED_SC") {
      const eventDefinition = (() => {
        try {
          return catalog.resolveColumn("SC_EVENT_NAME", family);
        } catch {
          return void 0;
        }
      })();
      const productSelected = eventValues(condition, "SC_EVENT_NAME").some((event) => {
        const option = eventDefinition === void 0 ? void 0 : catalog.findOption(eventDefinition, event);
        return option?.category === "PRODUCTS_EVENTS" || option?.group === "PRODUCTS_EVENTS";
      });
      if (productSelected) issues.push(issue("FEATURE_NOT_AVAILABLE", "Product SoftCube events are hidden when product events are disabled.", path));
    }
  }
  const productVisibilityRelevant = family === "AGGREGATED_CUSTOMER_DATA" && condition.aggregate.conditions.some((criterion) => criterion.column.columnId?.split(".")[0].toUpperCase() === "ORDERS") || family === "AGGREGATED_SC" && (() => {
    let definition;
    try {
      definition = catalog.resolveColumn("SC_EVENT_NAME", family);
    } catch {
      return false;
    }
    return eventValues(condition, "SC_EVENT_NAME").some((event) => {
      const option = catalog.findOption(definition, event);
      return option?.category === "PRODUCTS_EVENTS" || option?.group === "PRODUCTS_EVENTS";
    });
  })();
  requireFeature("PRODUCT_EVENTS_VISIBILITY", productVisibilityRelevant);
  return issues;
}
function validateCondition(condition, catalog, path) {
  if (isSimple(condition)) {
    const issues2 = catalog.validateSimpleCondition(condition, path, inferFamily(condition));
    if (condition.originOperator != null) issues2.push(issue("DB_FIELD_IN_UI_MODEL", "originOperator is produced by UI-to-DB conversion and is not authored by the frontend editor.", `${path}.originOperator`));
    return issues2;
  }
  if (isAggregate(condition)) {
    const issues2 = validateAggregate(condition, catalog, path);
    if (condition.aggregate.rule != null) issues2.push(issue("DB_FIELD_IN_UI_MODEL", "aggregate.rule belongs to converted/backend JSON, not frontend UI-mode JSON.", `${path}.aggregate.rule`));
    return issues2;
  }
  const issues = [];
  for (const [index, child] of condition.filter.conditions.entries()) {
    issues.push(...validateCondition(child, catalog, `${path}.filter.conditions[${index}]`));
  }
  return issues;
}
function validateNode(node, catalog, path) {
  if (node.filter !== null && node.filter !== void 0) {
    const issues2 = [];
    if (node.filter.conditions.length === 0) issues2.push(issue("EMPTY_CARD", "A segment card must contain at least one condition.", `${path}.filter.conditions`));
    for (const [index, condition] of node.filter.conditions.entries()) {
      issues2.push(...validateCondition(condition, catalog, `${path}.filter.conditions[${index}]`));
    }
    return issues2;
  }
  const issues = [];
  for (const [index, child] of (node.segments ?? []).entries()) {
    issues.push(...validateNode(child, catalog, `${path}.segments[${index}]`));
  }
  return issues;
}
function validateBranch(branch, catalog, path) {
  if (branch === null) return [];
  const issues = [];
  for (const [index, node] of branch.segments.entries()) {
    issues.push(...validateNode(node, catalog, `${path}.segments[${index}]`));
  }
  return issues;
}
function validateFrontendBusinessRules(model, catalog) {
  const issues = [
    ...validateBranch(model.include, catalog, "include"),
    ...validateBranch(model.exclude, catalog, "exclude")
  ];
  const hasCards = (model.include?.segments.length ?? 0) > 0 || (model.exclude?.segments.length ?? 0) > 0;
  if (!hasCards) issues.unshift(issue("SEGMENT_EMPTY", "At least one include or exclude card is required."));
  return issues;
}

// src/tree.ts
function clone2(value) {
  return structuredClone(value);
}
function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function isAggregate2(condition) {
  return "aggregate" in condition;
}
function makeRef(kind, id) {
  return Object.freeze(Object.assign(/* @__PURE__ */ Object.create(null), { kind, id }));
}
function isCard(expression) {
  return expression.kind === "card";
}
function serializeExpression(expression) {
  if (isCard(expression)) return { filter: clone2(expression.filter) };
  const node = {
    relation: expression.relation,
    segments: expression.children.map(serializeExpression)
  };
  if (expression.custom !== void 0) node.custom = expression.custom;
  return node;
}
function stripConditionReadMetadata(condition) {
  if ("column" in condition) {
    delete condition.normalizedValue;
    delete condition.sourceDateFormat;
    return;
  }
  if (isAggregate2(condition)) {
    condition.aggregate.conditions.forEach(
      (criterion) => stripConditionReadMetadata(criterion)
    );
    return;
  }
  condition.filter.conditions.forEach(stripConditionReadMetadata);
}
function stripNodeReadMetadata(node) {
  node.filter?.conditions.forEach(stripConditionReadMetadata);
  node.segments?.forEach(stripNodeReadMetadata);
}
function flattenCards(expression, result = []) {
  if (isCard(expression)) result.push(expression);
  else for (const child of expression.children) flattenCards(child, result);
  return result;
}
function findParent(group, cardId) {
  for (let index = 0; index < group.children.length; index += 1) {
    const child = group.children[index];
    if (isCard(child) && child.id === cardId) return { parent: group, index };
    if (!isCard(child)) {
      const found = findParent(child, cardId);
      if (found !== void 0) return found;
    }
  }
  return void 0;
}
function relationBetween(group, leftId, rightId) {
  const childIndexContaining = (id) => group.children.findIndex(
    (child2) => flattenCards(child2).some((card) => card.id === id)
  );
  const leftIndex = childIndexContaining(leftId);
  const rightIndex = childIndexContaining(rightId);
  if (leftIndex === -1 || rightIndex === -1) return void 0;
  if (leftIndex !== rightIndex) return group.relation;
  const child = group.children[leftIndex];
  return isCard(child) ? void 0 : relationBetween(child, leftId, rightId);
}
function canonicalTree(cards, relations) {
  if (cards.length === 0) return { kind: "group", relation: "AND", children: [] };
  if (cards.length === 1) return { kind: "group", relation: "AND", children: [cards[0]] };
  const terms = [];
  let current = [cards[0]];
  const flush = () => {
    terms.push(current.length === 1 ? current[0] : { kind: "group", relation: "AND", children: [...current] });
    current = [];
  };
  for (let index = 1; index < cards.length; index += 1) {
    if (relations[index - 1] === "AND") current.push(cards[index]);
    else {
      flush();
      current = [cards[index]];
    }
  }
  flush();
  if (terms.length === 1 && !isCard(terms[0])) return terms[0];
  if (terms.length === 1) return { kind: "group", relation: "AND", children: terms };
  return { kind: "group", relation: "OR", children: terms };
}
function normalizeGroup(group, isRoot = true) {
  const normalized = [];
  for (const child of group.children) {
    if (isCard(child)) {
      normalized.push(child);
      continue;
    }
    const next = normalizeGroup(child, false);
    if (next.children.length === 0) continue;
    if (next.children.length === 1 && !next.custom) normalized.push(next.children[0]);
    else if (next.relation === group.relation && !next.custom && !group.custom) normalized.push(...next.children);
    else normalized.push(next);
  }
  group.children = normalized;
  if (isRoot && group.children.length === 1 && !isCard(group.children[0]) && !group.children[0].custom) {
    return group.children[0];
  }
  return group;
}
function hasCustomGroup(group) {
  return Boolean(group.custom) || group.children.some((child) => !isCard(child) && hasCustomGroup(child));
}
var SegmentTree = class {
  branches;
  cards = /* @__PURE__ */ new Map();
  conditions = /* @__PURE__ */ new Map();
  counters = { card: 0, condition: 0, aggregate: 0, criterion: 0 };
  extras;
  constructor(model) {
    const seed = model === void 0 ? { include: { relation: "AND", segments: [] }, exclude: { relation: "AND", segments: [] }, parameters: [] } : clone2(model);
    const { include: _include, exclude: _exclude, ...extras } = seed;
    this.extras = extras;
    this.branches = {
      include: this.parseBranch(seed.include, "include"),
      exclude: this.parseBranch(seed.exclude, "exclude")
    };
  }
  snapshot() {
    return clone2({
      branches: this.branches,
      cards: this.cards,
      conditions: this.conditions,
      counters: this.counters,
      extras: this.extras
    });
  }
  restore(snapshot) {
    this.cards.clear();
    this.conditions.clear();
    this.branches = snapshot.branches;
    for (const [id, location] of snapshot.cards) this.cards.set(id, location);
    for (const [id, entry] of snapshot.conditions) this.conditions.set(id, entry);
    this.counters = snapshot.counters;
    this.extras = snapshot.extras;
  }
  toModel() {
    const model = {
      ...clone2(this.extras),
      include: this.serializeBranch(this.branches.include),
      exclude: this.serializeBranch(this.branches.exclude)
    };
    model.include?.segments.forEach(stripNodeReadMetadata);
    model.exclude?.segments.forEach(stripNodeReadMetadata);
    return model;
  }
  cardRef(id) {
    this.requireCard(id);
    return makeRef("card", id);
  }
  conditionRef(entry) {
    return makeRef(entry.kind, entry.id);
  }
  allCards(branch) {
    const branches = branch === void 0 ? ["include", "exclude"] : [branch];
    return branches.flatMap((branchName) => flattenCards(this.branches[branchName]).map((card) => {
      const location = this.cards.get(card.id);
      if (location === void 0) throw new SegmentSdkError(`Card ${card.id} is missing from the internal index.`);
      return location;
    }));
  }
  allConditions() {
    const ordered = [];
    for (const { card } of this.allCards()) {
      for (const condition of card.filter.conditions) {
        const top = [...this.conditions.values()].find(
          (entry) => entry.cardId === card.id && entry.kind !== "criterion" && entry.value === condition
        );
        if (top === void 0) continue;
        ordered.push(top);
        if (top.kind === "aggregate" && isAggregate2(condition)) {
          for (const criterion of condition.aggregate.conditions) {
            const child = [...this.conditions.values()].find(
              (entry) => entry.aggregateId === top.id && entry.value === criterion
            );
            if (child !== void 0) ordered.push(child);
          }
        }
      }
    }
    return ordered;
  }
  getCard(id) {
    return this.requireCard(id);
  }
  getCondition(id) {
    const entry = this.conditions.get(id);
    if (entry === void 0) throw new SegmentSdkError(`Condition reference ${id} is stale or unknown.`, [issue("REFERENCE_NOT_FOUND", `Condition ${id} was not found.`)]);
    return entry;
  }
  addCard(branch, filter, relation) {
    const card = { kind: "card", id: this.nextId("card"), filter: clone2(filter) };
    const root = this.branches[branch];
    if (root.children.length === 0) {
      root.children.push(card);
    } else if (root.relation === relation) {
      root.children.push(card);
    } else if (root.relation === "OR" && relation === "AND" && root.children.length > 0) {
      const lastIndex = root.children.length - 1;
      const last = root.children[lastIndex];
      if (!isCard(last) && last.relation === "AND" && !last.custom) last.children.push(card);
      else root.children[lastIndex] = { kind: "group", relation: "AND", children: [last, card] };
    } else if (root.children.length <= 1) {
      root.relation = relation;
      root.children.push(card);
    } else {
      this.branches[branch] = { kind: "group", relation, children: [root, card] };
    }
    this.cards.set(card.id, { card, branch });
    return makeRef("card", card.id);
  }
  copyCard(sourceId, relation = "OR") {
    const sourceLocation = this.requireCard(sourceId);
    const found = findParent(this.branches[sourceLocation.branch], sourceId);
    if (found === void 0) throw new SegmentSdkError("Card reference is stale.");
    const copy = {
      kind: "card",
      id: this.nextId("card"),
      filter: clone2(sourceLocation.card.filter)
    };
    if (found.parent.relation === relation) {
      found.parent.children.splice(found.index + 1, 0, copy);
    } else {
      found.parent.children[found.index] = {
        kind: "group",
        relation,
        children: [found.parent.children[found.index], copy]
      };
    }
    this.cards.set(copy.id, { card: copy, branch: sourceLocation.branch });
    for (const condition of copy.filter.conditions) this.registerTopLevelCondition(copy.id, condition);
    this.branches[sourceLocation.branch] = normalizeGroup(this.branches[sourceLocation.branch]);
    return this.cardRef(copy.id);
  }
  cardConditionRefs(cardId) {
    const { card } = this.requireCard(cardId);
    const entries = /* @__PURE__ */ new Map();
    for (const entry of this.conditions.values()) {
      if (entry.cardId === cardId && entry.kind !== "criterion" && !entries.has(entry.value)) {
        entries.set(entry.value, entry);
      }
    }
    return card.filter.conditions.flatMap((condition) => {
      const entry = entries.get(condition);
      return entry === void 0 ? [] : [this.conditionRef(entry)];
    });
  }
  updateCard(id, patch) {
    const location = this.requireCard(id);
    if (patch.conditionRelation !== void 0) location.card.filter.relation = patch.conditionRelation;
    if (patch.negated !== void 0) location.card.filter.negation = patch.negated;
    if (patch.relation !== void 0) this.changeRelationBefore(location.branch, id, patch.relation);
  }
  addTopLevelCondition(cardId, condition) {
    const { card } = this.requireCard(cardId);
    card.filter.conditions.push(condition);
    return this.registerTopLevelCondition(cardId, condition);
  }
  addCriterion(aggregateId, criterion) {
    const aggregateEntry = this.getCondition(aggregateId);
    const aggregateValue = aggregateEntry.value;
    if (aggregateEntry.kind !== "aggregate" || !isAggregate2(aggregateValue)) {
      throw new SegmentSdkError("Criteria can only be added inside an aggregate.");
    }
    aggregateValue.aggregate.conditions.push(criterion);
    const entry = {
      id: this.nextId("criterion"),
      kind: "criterion",
      value: criterion,
      cardId: aggregateEntry.cardId,
      aggregateId
    };
    this.conditions.set(entry.id, entry);
    return entry;
  }
  replaceCondition(id, next) {
    const entry = this.getCondition(id);
    if (entry.kind === "criterion") {
      const aggregate = this.getCondition(entry.aggregateId ?? "");
      const aggregateValue = aggregate.value;
      if (!isAggregate2(aggregateValue)) throw new SegmentSdkError("Criterion parent is invalid.");
      const index2 = aggregateValue.aggregate.conditions.indexOf(entry.value);
      if (index2 < 0 || "aggregate" in next) throw new SegmentSdkError("Criterion replacement is invalid.");
      aggregateValue.aggregate.conditions[index2] = next;
      entry.value = next;
      return;
    }
    const card = this.requireCard(entry.cardId).card;
    const index = card.filter.conditions.indexOf(entry.value);
    if (index < 0) throw new SegmentSdkError("Condition reference is stale.");
    const preservedCriteria = entry.kind === "aggregate" ? [...this.conditions.values()].filter((candidate) => candidate.aggregateId === entry.id) : [];
    card.filter.conditions[index] = next;
    this.unregisterCondition(entry);
    this.registerTopLevelCondition(entry.cardId, next, id, preservedCriteria);
  }
  removeCard(id) {
    const location = this.requireCard(id);
    const found = findParent(this.branches[location.branch], id);
    if (found === void 0) throw new SegmentSdkError("Card reference is stale.");
    found.parent.children.splice(found.index, 1);
    this.branches[location.branch] = normalizeGroup(this.branches[location.branch]);
    for (const entry of [...this.conditions.values()]) {
      if (entry.cardId === id) this.conditions.delete(entry.id);
    }
    this.cards.delete(id);
  }
  removeCondition(id) {
    const entry = this.getCondition(id);
    if (entry.kind === "criterion") {
      const aggregate = this.getCondition(entry.aggregateId ?? "");
      const aggregateValue = aggregate.value;
      if (!isAggregate2(aggregateValue)) throw new SegmentSdkError("Criterion parent is invalid.");
      const index2 = aggregateValue.aggregate.conditions.indexOf(entry.value);
      if (index2 >= 0) aggregateValue.aggregate.conditions.splice(index2, 1);
      this.conditions.delete(id);
      return;
    }
    const card = this.requireCard(entry.cardId).card;
    const index = card.filter.conditions.indexOf(entry.value);
    if (index >= 0) card.filter.conditions.splice(index, 1);
    this.unregisterCondition(entry);
  }
  formula(branch, labelOffset = 0) {
    const labels = /* @__PURE__ */ new Map();
    flattenCards(this.branches[branch]).forEach((card, index) => labels.set(card.id, this.cardLabel(index + labelOffset)));
    const render = (expression, parentRelation) => {
      if (isCard(expression)) return labels.get(expression.id) ?? "?";
      const body = expression.children.map((child) => render(child, expression.relation)).join(` ${expression.relation} `);
      return parentRelation !== void 0 && parentRelation !== expression.relation && expression.children.length > 1 ? `(${body})` : body;
    };
    return render(this.branches[branch]);
  }
  parseBranch(branch, branchName) {
    const root = {
      kind: "group",
      relation: branch?.relation ?? "AND",
      children: [],
      custom: branch?.custom
    };
    for (const node of branch?.segments ?? []) root.children.push(this.parseNode(node, branchName));
    return root;
  }
  parseNode(node, branch) {
    if (node.filter !== null && node.filter !== void 0) {
      const card = { kind: "card", id: this.nextId("card"), filter: clone2(node.filter) };
      this.cards.set(card.id, { card, branch });
      for (const condition of card.filter.conditions) this.registerTopLevelCondition(card.id, condition);
      return card;
    }
    return {
      kind: "group",
      relation: node.relation ?? "AND",
      children: (node.segments ?? []).map((child) => this.parseNode(child, branch)),
      custom: node.custom
    };
  }
  serializeBranch(group) {
    const branch = {
      relation: group.relation,
      segments: group.children.map(serializeExpression)
    };
    if (group.custom !== void 0) branch.custom = group.custom;
    return branch;
  }
  registerTopLevelCondition(cardId, condition, forcedId, preservedCriteria = []) {
    const aggregate = isAggregate2(condition);
    const entry = {
      id: forcedId ?? this.nextId(aggregate ? "aggregate" : "condition"),
      kind: aggregate ? "aggregate" : "condition",
      value: condition,
      cardId
    };
    this.conditions.set(entry.id, entry);
    if (aggregate) {
      const remaining = [...preservedCriteria];
      for (const criterion of condition.aggregate.conditions) {
        const preservedIndex = remaining.findIndex((candidate) => sameJson(candidate.value, criterion));
        const preserved = preservedIndex >= 0 ? remaining.splice(preservedIndex, 1)[0] : void 0;
        const criterionEntry = {
          id: preserved?.id ?? this.nextId("criterion"),
          kind: "criterion",
          value: criterion,
          cardId,
          aggregateId: entry.id
        };
        this.conditions.set(criterionEntry.id, criterionEntry);
      }
    }
    return entry;
  }
  unregisterCondition(entry) {
    if (entry.kind === "aggregate") {
      for (const child of [...this.conditions.values()]) {
        if (child.aggregateId === entry.id) this.conditions.delete(child.id);
      }
    }
    this.conditions.delete(entry.id);
  }
  requireCard(id) {
    const location = this.cards.get(id);
    if (location === void 0) throw new SegmentSdkError(`Card reference ${id} is stale or unknown.`, [issue("REFERENCE_NOT_FOUND", `Card ${id} was not found.`)]);
    return location;
  }
  changeRelationBefore(branch, cardId, relation) {
    const root = this.branches[branch];
    if (hasCustomGroup(root)) throw new SegmentSdkError("Relation changes on custom formulas are not supported by the card editor.");
    const cards = flattenCards(root);
    const index = cards.findIndex((card) => card.id === cardId);
    if (index <= 0) throw new SegmentSdkError("The first card has no preceding relation to update.", [issue("FIRST_CARD_RELATION", "relation applies only to cards after the first card.")]);
    const relations = [];
    for (let cursor = 1; cursor < cards.length; cursor += 1) {
      const current = relationBetween(root, cards[cursor - 1].id, cards[cursor].id);
      if (current === void 0) throw new SegmentSdkError("Could not derive the card formula relation.");
      relations.push(current);
    }
    relations[index - 1] = relation;
    this.branches[branch] = canonicalTree(cards, relations);
  }
  nextId(kind) {
    this.counters[kind] += 1;
    return `${kind}-${this.counters[kind]}`;
  }
  cardLabel(index) {
    const letter = String.fromCharCode(65 + index % 26);
    const cycle = Math.floor(index / 26);
    return cycle === 0 ? letter : `${letter}${cycle + 1}`;
  }
};

// src/segmentSdk.ts
var CUSTOM_EVENT_DATE_COLUMNS = /* @__PURE__ */ new Set(["EVENT_DATE", "EVENT_FIRST_DATE", "EVENT_LAST_DATE"]);
var ACTIVITY_OCCURRENCE_COLUMNS2 = /* @__PURE__ */ new Set([
  "ACTIVITY_COUNT",
  "ACTIVITY_CTOR",
  "ACTIVITY_CTR",
  "ACTIVITY_OPEN_RATE",
  "ACTIVITY_DELIVERY_RATE",
  "ACTIVITY_RESPONSE_MINUTES"
]);
function clone3(value) {
  return structuredClone(value);
}
function isAggregate3(value) {
  return "aggregate" in value;
}
function isSimple2(value) {
  return "column" in value && typeof value.column === "object" && value.column !== null && "operator" in value && typeof value.operator === "string";
}
function isReplaceUpdate(update) {
  return "replaceWith" in update;
}
function sameJson2(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}
function refId(ref, expected) {
  if (ref === null || typeof ref !== "object" || typeof ref.id !== "string" || !expected.includes(ref.kind)) {
    throw new SegmentSdkError(`Expected a ${expected.join(" or ")} reference.`, [
      issue("INVALID_REFERENCE", `Expected reference kind ${expected.join(" or ")}.`)
    ]);
  }
  return ref.id;
}
function aggregateFamily(entry) {
  if (!isAggregate3(entry.value)) throw new SegmentSdkError("Reference does not point to an aggregate.");
  return inferFamily(entry.value);
}
function selectorFrom(condition) {
  return {
    columnId: condition.column.columnId ?? void 0,
    profileInputId: condition.column.profileInputId ?? void 0,
    type: condition.column.type ?? void 0
  };
}
function jsonText(value) {
  return JSON.stringify(value).toLowerCase();
}
function splitRange(value) {
  const parts = Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(",") : [];
  return parts.length === 2 ? [parts[0].trim(), parts[1].trim()] : void 0;
}
function extractPeriod(condition, family) {
  const conditions = condition.aggregate.conditions;
  if (family === "AGGREGATED_SC") {
    const dates = conditions.filter((criterion) => criterion.column.columnId === "SC_EVENT_DATE");
    const from = dates.find((criterion) => criterion.operator === "GREATER_THAN_OR_EQUAL")?.value;
    const to = dates.find((criterion) => criterion.operator === "LESS_THAN_OR_EQUAL")?.value;
    if (from === "01/01/2010 00:00" && to === "01/01/2050 00:00") return { kind: "all-time" };
    if (typeof from === "string" && typeof to === "string") return { kind: "between", from, to };
    const relative = dates[0];
    if (relative !== void 0) {
      return typeof relative.value === "string" || typeof relative.value === "number" ? { kind: "relative", operator: relative.operator, value: relative.value } : { kind: "relative", operator: relative.operator };
    }
  }
  if (family === "AGGREGATED_CUSTOM_EVENTS") {
    const date = conditions.find((criterion) => CUSTOM_EVENT_DATE_COLUMNS.has(criterion.column.columnId ?? ""));
    if (date === void 0) return { kind: "all-time" };
    const range = splitRange(date.value);
    if (date.operator === "BETWEEN" && range !== void 0) {
      return { kind: "between", from: range[0], to: range[1], dateColumnId: date.column.columnId ?? void 0 };
    }
    return typeof date.value === "string" || typeof date.value === "number" ? { kind: "relative", operator: date.operator, value: date.value } : { kind: "relative", operator: date.operator };
  }
  if (family === "AGGREGATED_ACTIVITY" || family === "AGGREGATED_WIDGET_ACTIVITY") {
    const dates = conditions.filter((criterion) => criterion.column.columnId === "ACTIVITY_DATE");
    if (dates.length === 0) return { kind: "all-time" };
    const from = dates.find((criterion) => criterion.operator === "GREATER_THAN_OR_EQUAL")?.value;
    const to = dates.find((criterion) => criterion.operator === "LESS_THAN_OR_EQUAL")?.value;
    if (typeof from === "string" && typeof to === "string") return { kind: "between", from, to };
    const relative = dates[0];
    return typeof relative.value === "string" || typeof relative.value === "number" ? { kind: "relative", operator: relative.operator, value: relative.value } : { kind: "relative", operator: relative.operator };
  }
  return void 0;
}
function selectedCustomEvent(condition) {
  return condition.aggregate.conditions.find((criterion) => criterion.column.columnId === "EVENT_TYPE_ID")?.value;
}
var SegmentSdkSession = class {
  tree;
  catalog;
  validateSchema;
  sealed = false;
  mutationCounter = 0;
  warningList = [];
  validationState = "pending";
  constructor(options) {
    if (!Array.isArray(options.definitions)) throw new SegmentSdkError("definitions must be the full definition-endpoint array.");
    if (options.outputSchema === null || typeof options.outputSchema !== "object") {
      throw new SegmentSdkError("outputSchema is required so finish() can always run structural validation.");
    }
    this.tree = new SegmentTree(options.model);
    this.catalog = new DefinitionCatalog(options.definitions, options.uiContext);
    const ajv = new import__.Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true });
    this.validateSchema = ajv.compile(options.outputSchema);
  }
  getModel() {
    return this.withDerivedParameters(this.tree.toModel()).model;
  }
  find(query) {
    const result = [];
    const limit = query.limit === void 0 ? Number.POSITIVE_INFINITY : Math.max(0, query.limit);
    for (const location of this.tree.allCards(query.branch)) {
      const cardRef = this.tree.cardRef(location.card.id);
      if (query.parent === void 0 && query.aggregate === void 0 && (query.kind === void 0 || query.kind === "card")) {
        const value = clone3(location.card.filter);
        if (this.matchesQuery(query, "card", value)) {
          result.push({ ref: cardRef, kind: "card", branch: location.branch, card: cardRef, value });
          if (result.length >= limit) return result;
        }
      }
      for (const entry of this.tree.allConditions().filter((candidate) => candidate.cardId === location.card.id)) {
        if (query.kind !== void 0 && query.kind !== entry.kind) continue;
        const family = entry.kind === "criterion" ? aggregateFamily(this.tree.getCondition(entry.aggregateId ?? "")) : isSimple2(entry.value) || isAggregate3(entry.value) ? inferFamily(entry.value) : void 0;
        const parent = entry.kind === "criterion" ? this.tree.conditionRef(this.tree.getCondition(entry.aggregateId ?? "")) : cardRef;
        if (query.parent !== void 0 && (query.parent.kind !== parent.kind || query.parent.id !== parent.id)) continue;
        if (query.aggregate !== void 0 && entry.aggregateId !== query.aggregate.id && entry.id !== query.aggregate.id) continue;
        const value = clone3(entry.value);
        if (!this.matchesQuery(query, entry.kind, value, family)) continue;
        result.push({
          ref: this.tree.conditionRef(entry),
          kind: entry.kind,
          branch: location.branch,
          card: cardRef,
          parent,
          family,
          value
        });
        if (result.length >= limit) return result;
      }
    }
    return result;
  }
  addCard(branch, input = {}) {
    return this.mutate(() => {
      if (branch !== "include" && branch !== "exclude") throw new SegmentSdkError("branch must be include or exclude.");
      if (input.mode === "copy") {
        const sourceId = refId(input.copyFrom, ["card"]);
        if (this.tree.getCard(sourceId).branch !== branch) {
          throw new SegmentSdkError("The UI copies a card within its current include/exclude branch.");
        }
        const card2 = this.tree.copyCard(sourceId, input.relation ?? "OR");
        return { card: card2, conditions: this.tree.cardConditionRefs(card2.id) };
      }
      const card = this.tree.addCard(branch, {
        relation: input.conditionRelation ?? "AND",
        negation: input.negated ?? false,
        conditions: []
      }, input.relation ?? "AND");
      if (input.firstCondition !== void 0) this.addTopLevelCondition(card.id, input.firstCondition);
      return { card, conditions: this.tree.cardConditionRefs(card.id) };
    });
  }
  updateCard(card, patch) {
    return this.mutate(() => {
      const id = refId(card, ["card"]);
      this.tree.updateCard(id, patch);
      return this.tree.cardRef(id);
    });
  }
  addCondition(parent, intent) {
    return this.mutate(() => this.insertCondition(parent, intent));
  }
  addConditions(parent, intents) {
    return this.mutate(() => {
      if (!Array.isArray(intents) || intents.length === 0) {
        throw new SegmentSdkError("addConditions requires at least one condition intent.");
      }
      return Array.from(intents, (intent) => this.insertCondition(parent, intent));
    });
  }
  insertCondition(parent, intent) {
    if (parent.kind === "card") {
      const cardId = refId(parent, ["card"]);
      if (!("kind" in intent)) throw new SegmentSdkError("A card accepts a field, predicted, or aggregate intent.");
      return this.tree.conditionRef(this.addTopLevelCondition(cardId, intent));
    }
    const aggregateId = refId(parent, ["aggregate"]);
    if ("kind" in intent) throw new SegmentSdkError("An aggregate accepts only a CriterionIntent.");
    const aggregateEntry = this.tree.getCondition(aggregateId);
    const family = aggregateFamily(aggregateEntry);
    if (family === "AGGREGATED_CUSTOMER_LIFECYCLE") {
      throw new SegmentSdkError("Customer lifecycle exposes one state criterion; update that criterion instead of adding another.");
    }
    const criterion = buildCriterion(this.catalog, intent, family, this.criterionContext(aggregateEntry));
    this.assertCriterionAvailable(aggregateEntry, criterion);
    return this.tree.conditionRef(this.tree.addCriterion(aggregateId, criterion));
  }
  updateCondition(condition, update) {
    return this.mutate(() => {
      const id = refId(condition, ["condition", "aggregate", "criterion"]);
      const entry = this.tree.getCondition(id);
      if (isReplaceUpdate(update)) return this.replaceNode(entry, update.replaceWith);
      if (entry.kind === "aggregate") {
        this.updateAggregate(entry, update);
        return this.tree.conditionRef(this.tree.getCondition(id));
      }
      return this.updateSimple(entry, update);
    });
  }
  remove(target) {
    return this.mutate(() => {
      if (target.kind === "card") {
        this.tree.removeCard(refId(target, ["card"]));
        return;
      }
      const id = refId(target, ["condition", "aggregate", "criterion"]);
      const entry = this.tree.getCondition(id);
      if (entry.kind === "criterion") {
        const aggregate = this.tree.getCondition(entry.aggregateId ?? "");
        const family = aggregateFamily(aggregate);
        const columnId = isSimple2(entry.value) ? entry.value.column.columnId : void 0;
        if (typeof columnId === "string" && this.managedColumns(family).has(columnId)) {
          throw new SegmentSdkError(`${columnId} is controlled by the aggregate editor and cannot be removed independently.`);
        }
        if (family === "AGGREGATED_CUSTOMER_DATA" && isAggregate3(aggregate.value) && aggregate.value.aggregate.conditions.length === 1) {
          throw new SegmentSdkError("The last customer-data source criterion cannot be removed; remove the aggregate instead.");
        }
      }
      this.tree.removeCondition(id);
    });
  }
  async finish() {
    this.assertOpen();
    const derived = this.withDerivedParameters(this.tree.toModel());
    const issues = [...derived.issues, ...this.validate(derived.model)];
    if (issues.length > 0) {
      this.validationState = "failed";
      throw new SegmentFinishError(issues);
    }
    this.validationState = "passed";
    this.sealed = true;
    const includeCount = this.tree.allCards("include").length;
    return {
      model: clone3(derived.model),
      formula: {
        include: this.tree.formula("include"),
        exclude: this.tree.formula("exclude", includeCount)
      },
      diagnostics: this.diagnostics()
    };
  }
  addTopLevelCondition(cardId, intent) {
    const condition = intent.kind === "field" ? buildField(this.catalog, intent) : intent.kind === "predicted" ? buildPredicted(this.catalog, intent) : buildAggregate(this.catalog, intent);
    if (isAggregate3(condition)) {
      const warnings = reconcileFrontendAggregate(condition, this.catalog);
      if (warnings.length > 0) {
        throw new SegmentSdkError("One or more requested aggregate criteria are not offered for the selected parent value.", warnings);
      }
    }
    return this.tree.addTopLevelCondition(cardId, condition);
  }
  updateSimple(entry, update) {
    if (!isSimple2(entry.value)) throw new SegmentSdkError("Composite filter conditions cannot be patched as simple conditions.");
    const current = entry.value;
    const parentFamily = entry.kind === "criterion" ? aggregateFamily(this.tree.getCondition(entry.aggregateId ?? "")) : inferFamily(current);
    const columnId = current.column.columnId;
    const editableLifecycleState = parentFamily === "AGGREGATED_CUSTOMER_LIFECYCLE" && columnId === "LIFECYCLE_STATE_ID";
    if (editableLifecycleState && update.definition !== void 0) {
      throw new SegmentSdkError("The lifecycle state definition is structural; update its operator/value or the aggregate selection.");
    }
    if (entry.kind === "criterion" && typeof columnId === "string") {
      const managed = this.managedColumns(parentFamily).has(columnId);
      if (managed && !editableLifecycleState) {
        throw new SegmentSdkError(`${columnId} is controlled by the aggregate editor; update the aggregate instead.`);
      }
    }
    if (parentFamily === "PREDICTED_SC" && (update.definition !== void 0 || update.operator !== void 0 || update.value !== void 0 || update.clearValue || hasOwn(update, "label"))) {
      throw new SegmentSdkError("Predicted SoftCube operator and value are fixed by the frontend; only negation can be changed.");
    }
    const selector = update.definition ?? selectorFrom(current);
    const operator = update.operator ?? current.operator;
    let value = current.value;
    const suppliedValue = hasOwn(update, "value");
    if (update.clearValue) value = void 0;
    else if (suppliedValue) value = update.value;
    const aggregateEntry = entry.kind === "criterion" ? this.tree.getCondition(entry.aggregateId ?? "") : void 0;
    const context = aggregateEntry === void 0 ? {} : this.criterionContext(aggregateEntry);
    if (!update.clearValue && !suppliedValue && (update.definition !== void 0 || update.operator !== void 0)) {
      const currentDefinition = this.catalog.resolve(selectorFrom(current), parentFamily, context);
      const nextDefinition = this.catalog.resolve(selector, parentFamily, context);
      const currentType = this.catalog.resolveOperator(currentDefinition, current.operator).type;
      const nextType = this.catalog.resolveOperator(nextDefinition, operator).type;
      if (update.definition !== void 0 || currentType !== nextType || update.operator !== void 0) {
        value = void 0;
        this.warn(issue("UI_VALUE_RESET", "The value was cleared because the selected definition/operator changed its frontend control.", void 0));
      }
    }
    let label = hasOwn(update, "label") ? update.label : current.label;
    if (parentFamily === "AGGREGATED_CUSTOMER_DATA" && update.definition !== void 0 && !hasOwn(update, "label")) {
      label = this.catalog.resolve(selector, parentFamily, context).categoryType ?? label;
    }
    const next = this.catalog.createSimpleCondition(selector, operator, value, {
      family: parentFamily,
      negated: update.negated ?? current.negation,
      label,
      context,
      valueMode: suppliedValue ? "intent" : "stored",
      allowParameter: false
    });
    if (current.index !== void 0) next.index = current.index;
    if (aggregateEntry !== void 0 && !editableLifecycleState) this.assertCriterionAvailable(aggregateEntry, next, entry.id);
    this.tree.replaceCondition(entry.id, next);
    return this.tree.conditionRef(this.tree.getCondition(entry.id));
  }
  replaceNode(entry, replacement) {
    if (entry.kind === "criterion") {
      if ("kind" in replacement) throw new SegmentSdkError("A nested criterion can only be replaced by another CriterionIntent.");
      const aggregate = this.tree.getCondition(entry.aggregateId ?? "");
      const family = aggregateFamily(aggregate);
      const currentColumn = isSimple2(entry.value) ? entry.value.column.columnId : void 0;
      if (typeof currentColumn === "string" && this.managedColumns(family).has(currentColumn)) {
        throw new SegmentSdkError(`${currentColumn} is controlled by the aggregate editor and cannot be replaced directly.`);
      }
      const next2 = buildCriterion(this.catalog, replacement, family, this.criterionContext(aggregate));
      this.assertCriterionAvailable(aggregate, next2, entry.id);
      this.tree.replaceCondition(entry.id, next2);
      return this.tree.conditionRef(this.tree.getCondition(entry.id));
    }
    if (!("kind" in replacement)) throw new SegmentSdkError("A card condition must be replaced by a ConditionIntent.");
    const next = replacement.kind === "field" ? buildField(this.catalog, replacement) : replacement.kind === "predicted" ? buildPredicted(this.catalog, replacement) : buildAggregate(this.catalog, replacement);
    this.tree.replaceCondition(entry.id, next);
    return this.tree.conditionRef(this.tree.getCondition(entry.id));
  }
  updateAggregate(entry, update) {
    if (!isAggregate3(entry.value)) throw new SegmentSdkError("Reference does not point to an aggregate.");
    let next = clone3(entry.value);
    let family = inferFamily(next);
    if (update.selection !== void 0) {
      if (update.selection.family !== family) {
        throw new SegmentSdkError("Changing aggregate family is a condition replacement; use replaceWith with a full AggregateIntent.");
      }
      const preservesNestedCriteria = family === "AGGREGATED_SC" || family === "AGGREGATED_ACTIVITY" || family === "AGGREGATED_WIDGET_ACTIVITY";
      const discarded = preservesNestedCriteria ? [] : next.aggregate.conditions.filter(
        (criterion) => !this.managedColumns(family).has(criterion.column.columnId ?? "")
      );
      next = this.rebuildSelection(next, update.selection, update.period);
      if (discarded.length > 0) {
        this.warn(issue(
          "UI_DEPENDENCY_RESET",
          `${discarded.map((criterion) => criterion.column.columnId ?? "criterion").join(", ")} was reset because this frontend selection replaces the aggregate payload.`
        ));
      }
      family = inferFamily(next);
    }
    if (update.negated !== void 0) next.aggregate.negation = update.negated;
    if (update.period !== void 0) this.replacePeriod(next, family, update.period);
    let requestedOccurrenceColumn;
    if (hasOwn(update, "occurrence")) {
      applyOccurrence(this.catalog, next, family, update.occurrence ?? null, this.aggregateContext(next));
      if (update.occurrence?.kind === "count" || update.occurrence?.kind === "exists" || update.occurrence?.kind === "not-exists") {
        requestedOccurrenceColumn = family === "AGGREGATED_CUSTOM_EVENTS" ? "EVENT_COUNT" : "ACTIVITY_COUNT";
      } else if (update.occurrence?.kind === "rate") {
        requestedOccurrenceColumn = next.aggregate.conditions.at(-1)?.column.columnId ?? void 0;
      }
    }
    const reconciliation = reconcileFrontendAggregate(next, this.catalog);
    if (requestedOccurrenceColumn !== void 0 && !next.aggregate.conditions.some(
      (criterion) => criterion.column.columnId === requestedOccurrenceColumn
    )) {
      throw new SegmentSdkError(`${requestedOccurrenceColumn} is not offered for the aggregate's current selection.`, reconciliation);
    }
    for (const warning of reconciliation) this.warn(warning);
    this.tree.replaceCondition(entry.id, next);
  }
  rebuildSelection(current, selection, periodOverride) {
    const family = inferFamily(current);
    const negated = current.aggregate.negation ?? false;
    const currentPeriod = extractPeriod(current, family);
    let intent;
    switch (selection.family) {
      case "AGGREGATED_SC": {
        const nextEvents = Array.isArray(selection.event) ? selection.event : [selection.event];
        const currentEvents = (current.aggregate.conditions.find((criterion) => criterion.column.columnId === "SC_EVENT_NAME")?.value ?? "").toString().split(",").map((item) => item.trim());
        const special = /* @__PURE__ */ new Set(["Probability", "Possible buyers", "Possible visitors"]);
        const crossesSpecialMode = nextEvents.some((event) => special.has(event)) || currentEvents.some((event) => special.has(event));
        const period = periodOverride ?? (crossesSpecialMode ? void 0 : currentPeriod);
        intent = { kind: "aggregate", family: selection.family, event: selection.event, period, negated };
        break;
      }
      case "AGGREGATED_CUSTOM_EVENTS": {
        const period = periodOverride;
        if (selection.dateColumnId !== void 0 && selection.dateColumnId !== "EVENT_DATE" && period?.kind === "all-time") {
          throw new SegmentSdkError("First/last-event mode requires a period so its date basis is representable in UI-mode JSON.");
        }
        intent = {
          kind: "aggregate",
          family: selection.family,
          event: selection.event,
          dateColumnId: selection.dateColumnId ?? "EVENT_DATE",
          period,
          negated
        };
        break;
      }
      case "AGGREGATED_ACTIVITY":
      case "AGGREGATED_WIDGET_ACTIVITY": {
        const period = periodOverride ?? currentPeriod;
        intent = { kind: "aggregate", family: selection.family, event: selection.event, period, negated };
        break;
      }
      case "AGGREGATED_PUSH":
      case "AGGREGATED_TOKEN":
        intent = { kind: "aggregate", family: selection.family, applicationId: selection.applicationId, negated };
        break;
      case "AGGREGATED_CUSTOMER_DATA":
        intent = { kind: "aggregate", family: selection.family, source: selection.source, negated };
        break;
      case "AGGREGATED_CUSTOMER_LIFECYCLE":
        intent = {
          kind: "aggregate",
          family: selection.family,
          schemaId: selection.schemaId,
          state: selection.state,
          negated
        };
        break;
    }
    const rebuilt = buildAggregate(this.catalog, intent);
    if (family === "AGGREGATED_SC" || family === "AGGREGATED_ACTIVITY" || family === "AGGREGATED_WIDGET_ACTIVITY") {
      const managed = this.managedColumns(family);
      const optional = current.aggregate.conditions.filter((criterion) => !managed.has(criterion.column.columnId ?? ""));
      rebuilt.aggregate.conditions.push(...clone3(optional));
    }
    return rebuilt;
  }
  replacePeriod(condition, family, period) {
    const periodFamilies = /* @__PURE__ */ new Set([
      "AGGREGATED_SC",
      "AGGREGATED_CUSTOM_EVENTS",
      "AGGREGATED_ACTIVITY",
      "AGGREGATED_WIDGET_ACTIVITY"
    ]);
    if (!periodFamilies.has(family)) throw new SegmentSdkError(`${family} has no period control in the frontend.`);
    const dateIds = family === "AGGREGATED_SC" ? /* @__PURE__ */ new Set(["SC_EVENT_DATE"]) : family === "AGGREGATED_CUSTOM_EVENTS" ? CUSTOM_EVENT_DATE_COLUMNS : /* @__PURE__ */ new Set(["ACTIVITY_DATE"]);
    const currentDateId = condition.aggregate.conditions.find(
      (criterion) => typeof criterion.column.columnId === "string" && dateIds.has(criterion.column.columnId)
    )?.column.columnId ?? "EVENT_DATE";
    const retained = condition.aggregate.conditions.filter(
      (criterion) => typeof criterion.column.columnId !== "string" || !dateIds.has(criterion.column.columnId)
    );
    const dates = family === "AGGREGATED_SC" ? scPeriodConditions(this.catalog, period) : family === "AGGREGATED_CUSTOM_EVENTS" ? customEventPeriodConditions(this.catalog, period, currentDateId) : activityPeriodConditions(this.catalog, period, family);
    const selectorIndex = retained.findIndex((criterion) => REQUIRED_COLUMNS[family].includes(criterion.column.columnId ?? ""));
    retained.splice(Math.max(0, selectorIndex + 1), 0, ...dates);
    condition.aggregate.conditions = retained;
  }
  managedColumns(family) {
    switch (family) {
      case "AGGREGATED_SC":
        return /* @__PURE__ */ new Set(["SC_EVENT_NAME", "SC_EVENT_DATE"]);
      case "AGGREGATED_CUSTOM_EVENTS":
        return /* @__PURE__ */ new Set(["EVENT_TYPE_ID", ...CUSTOM_EVENT_DATE_COLUMNS]);
      case "AGGREGATED_ACTIVITY":
        return /* @__PURE__ */ new Set(["ACTIVITY_EVENT_ID", "ACTIVITY_DATE"]);
      case "AGGREGATED_WIDGET_ACTIVITY":
        return /* @__PURE__ */ new Set(["ACTIVITY_EVENT_ID", "ACTIVITY_DATE", "ACTIVITY_MEDIA_TYPE"]);
      case "AGGREGATED_PUSH":
        return /* @__PURE__ */ new Set(["PUSH_APPLICATION_ID"]);
      case "AGGREGATED_TOKEN":
        return /* @__PURE__ */ new Set(["TOKEN_APPLICATION_ID"]);
      case "AGGREGATED_CUSTOMER_LIFECYCLE":
        return /* @__PURE__ */ new Set(["LIFECYCLE_SCHEMA_ID", "LIFECYCLE_STATE_ID"]);
      case "AGGREGATED_CUSTOMER_DATA":
        return /* @__PURE__ */ new Set();
    }
  }
  criterionContext(entry) {
    return isAggregate3(entry.value) ? this.aggregateContext(entry.value) : {};
  }
  aggregateContext(condition) {
    return inferFamily(condition) === "AGGREGATED_CUSTOM_EVENTS" ? { event: selectedCustomEvent(condition) } : {};
  }
  assertCriterionAvailable(aggregateEntry, criterion, replacingId) {
    if (!isAggregate3(aggregateEntry.value)) throw new SegmentSdkError("Criterion parent is invalid.");
    const family = inferFamily(aggregateEntry.value);
    const columnId = criterion.column.columnId;
    if (typeof columnId === "string" && this.managedColumns(family).has(columnId)) {
      throw new SegmentSdkError(`${columnId} is managed by the aggregate editor and cannot be added as a nested criterion.`, [
        issue("SYSTEM_CRITERION", `Use updateCondition() on the aggregate for its UI-managed ${columnId} value.`)
      ]);
    }
    const existing = this.tree.allConditions().filter(
      (candidate2) => candidate2.aggregateId === aggregateEntry.id && candidate2.id !== replacingId && isSimple2(candidate2.value)
    ).map((candidate2) => candidate2.value);
    const ids = existing.map((item) => item.column.columnId);
    if (columnId === "EVENT_COUNT" && ids.includes(columnId)) {
      throw new SegmentSdkError("Only one EVENT_COUNT criterion is allowed in an event aggregate.");
    }
    if (columnId === "ACTIVITY_COUNT" && ids.includes(columnId)) {
      throw new SegmentSdkError("Only one ACTIVITY_COUNT criterion is allowed in an activity aggregate.");
    }
    if (columnId === "PUSH_TOKEN" && ids.includes(columnId)) {
      throw new SegmentSdkError("Only one PUSH_TOKEN criterion is allowed in a push aggregate.");
    }
    if (typeof columnId === "string" && ACTIVITY_OCCURRENCE_COLUMNS2.has(columnId) && ids.some((id) => typeof id === "string" && ACTIVITY_OCCURRENCE_COLUMNS2.has(id))) {
      throw new SegmentSdkError("Activity count/rate/response occurrence controls are mutually exclusive in the frontend.");
    }
    const candidate = clone3(aggregateEntry.value);
    if (replacingId !== void 0) {
      const old = this.tree.getCondition(replacingId);
      const oldIndex = candidate.aggregate.conditions.findIndex((item) => sameJson2(item, old.value));
      if (oldIndex >= 0) candidate.aggregate.conditions.splice(oldIndex, 1);
    }
    candidate.aggregate.conditions.push(clone3(criterion));
    reconcileFrontendAggregate(candidate, this.catalog);
    if (!candidate.aggregate.conditions.some((item) => sameJson2(item, criterion))) {
      throw new SegmentSdkError(`${columnId ?? "The criterion"} is not offered for the aggregate's current selection.`, [
        issue("CRITERION_NOT_AVAILABLE", "Change the aggregate selection or choose a criterion shown by that selection.")
      ]);
    }
  }
  withDerivedParameters(model) {
    const next = clone3(model);
    const existing = /* @__PURE__ */ new Map();
    for (const parameter of next.parameters ?? []) {
      if (typeof parameter.name === "string") existing.set(parameter.name, clone3(parameter));
    }
    const ordered = /* @__PURE__ */ new Map();
    const issues = [];
    const visitSimple = (condition, family, path, context = {}) => {
      if (typeof condition.value !== "string") return;
      const match = /^\$\{([A-Za-z]+)\}$/.exec(condition.value);
      if (match === null) return;
      let type;
      try {
        type = this.catalog.parameterType(condition, family, context);
      } catch {
        return;
      }
      const previous = ordered.get(match[1]);
      if (previous !== void 0 && previous.type !== type) {
        issues.push(issue("PARAMETER_TYPE_MISMATCH", `Parameter ${match[1]} is used as both ${previous.type} and ${type}.`, path));
      } else if (previous === void 0) {
        ordered.set(match[1], { type, path });
      }
    };
    const visitCondition = (condition, path) => {
      if (isSimple2(condition)) {
        visitSimple(condition, inferFamily(condition), path);
      } else if (isAggregate3(condition)) {
        const family = inferFamily(condition);
        const context = this.aggregateContext(condition);
        condition.aggregate.conditions.forEach(
          (criterion, index) => visitSimple(criterion, family, `${path}.aggregate.conditions[${index}]`, context)
        );
      } else {
        condition.filter.conditions.forEach((child, index) => visitCondition(child, `${path}.filter.conditions[${index}]`));
      }
    };
    const visitNode = (node, path) => {
      node.filter?.conditions.forEach((condition, index) => visitCondition(condition, `${path}.filter.conditions[${index}]`));
      node.segments?.forEach((child, index) => visitNode(child, `${path}.segments[${index}]`));
    };
    for (const branch of ["include", "exclude"]) {
      next[branch]?.segments.forEach((node, index) => visitNode(node, `${branch}.segments[${index}]`));
    }
    next.parameters = [...ordered.entries()].map(([name, usage]) => {
      const prior = existing.get(name);
      if (prior !== void 0 && prior.type !== usage.type) {
        issues.push(issue("PARAMETER_TYPE_MISMATCH", `Parameter ${name} is declared as ${String(prior.type)} but used as ${usage.type}.`, usage.path));
      }
      return prior ?? { name, type: usage.type };
    });
    return { model: next, issues };
  }
  validate(model) {
    const issues = [];
    if (!this.validateSchema(model)) {
      for (const error of this.validateSchema.errors ?? []) {
        issues.push(issue("OUTPUT_SCHEMA", error.message ?? "Output schema validation failed.", error.instancePath || void 0));
      }
    }
    issues.push(...validateFrontendBusinessRules(model, this.catalog));
    return issues;
  }
  matchesQuery(query, kind, value, family) {
    if (query.kind !== void 0 && query.kind !== kind) return false;
    if (query.family !== void 0 && query.family !== family) return false;
    if (query.text !== void 0 && !jsonText(value).includes(query.text.toLowerCase())) return false;
    const simples = isSimple2(value) ? [value] : isAggregate3(value) ? value.aggregate.conditions : [];
    if (query.columnId !== void 0 && !simples.some((item) => item.column.columnId === query.columnId)) return false;
    if (query.profileInputId !== void 0 && !simples.some((item) => item.column.profileInputId === query.profileInputId)) return false;
    if (query.operator !== void 0 && !simples.some((item) => item.operator === query.operator)) return false;
    if (query.value !== void 0 && !simples.some((item) => sameJson2(item.value, query.value))) return false;
    return true;
  }
  mutate(operation) {
    try {
      this.assertOpen();
    } catch (error) {
      return this.failure(error);
    }
    const snapshot = this.tree.snapshot();
    const warningCount = this.warningList.length;
    try {
      const value = operation();
      this.mutationCounter += 1;
      return { ok: true, value, warnings: clone3(this.warningList.slice(warningCount)) };
    } catch (error) {
      this.tree.restore(snapshot);
      this.warningList.splice(warningCount);
      return this.failure(error);
    }
  }
  warn(warning) {
    this.warningList.push(clone3(warning));
  }
  diagnostics() {
    return {
      mutationCount: this.mutationCounter,
      warnings: clone3(this.warningList),
      validation: this.validationState,
      eSngRevision: ESNG_REVISION,
      definitionCount: this.catalog.definitions.length
    };
  }
  failure(error) {
    if (error instanceof SegmentSdkError) return { ok: false, issues: error.issues };
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, issues: [issue("SEGMENT_SDK_ERROR", message)] };
  }
  assertOpen() {
    if (this.sealed) throw new SegmentSdkError("This segment SDK session is sealed after finish().");
  }
};
function createSegmentSdk(options) {
  const session = new SegmentSdkSession(options);
  return Object.freeze({
    getModel: session.getModel.bind(session),
    find: session.find.bind(session),
    addCard: session.addCard.bind(session),
    updateCard: session.updateCard.bind(session),
    addCondition: session.addCondition.bind(session),
    addConditions: session.addConditions.bind(session),
    updateCondition: session.updateCondition.bind(session),
    remove: session.remove.bind(session),
    finish: session.finish.bind(session)
  });
}

// src/backendHydration.ts
var BACKEND_WRAPPED_MULTI_VALUE_COLUMNS = /* @__PURE__ */ new Set([
  "ACTIVITY_MESSAGE_ID",
  "ACTIVITY_CALLOUT_ID",
  "ACTIVITY_IMCALLOUT_ID"
]);
function clone4(value) {
  return structuredClone(value);
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isSimple3(condition) {
  return "column" in condition;
}
function isAggregate4(condition) {
  return "aggregate" in condition;
}
function unwrapBackendMultiValue(value, columnId, path) {
  if (!isRecord(value)) return value;
  const entries = Object.entries(value);
  if (entries.length === 1 && Array.isArray(entries[0][1])) {
    return clone4(entries[0][1]);
  }
  throw new SegmentSdkError(`Cannot hydrate the backend value for ${columnId}.`, [
    issue(
      "BACKEND_MULTI_VALUE_SHAPE",
      `${columnId} must contain one array-valued backend selection wrapper.`,
      `${path}.value`
    )
  ]);
}
function hydrateSimple(condition, catalog, family, context, path) {
  const definition = catalog.resolve({
    columnId: condition.column.columnId ?? void 0,
    profileInputId: condition.column.profileInputId ?? void 0
  }, family, context);
  condition.column = catalog.toColumn(definition);
  delete condition.originOperator;
  delete condition.normalizedValue;
  delete condition.sourceDateFormat;
  const columnId = condition.column.columnId;
  if (typeof columnId === "string" && BACKEND_WRAPPED_MULTI_VALUE_COLUMNS.has(columnId)) {
    condition.value = unwrapBackendMultiValue(condition.value, columnId, path);
  }
}
function hydrateCondition(condition, catalog, path) {
  if (isSimple3(condition)) {
    hydrateSimple(condition, catalog, inferFamily(condition), {}, path);
    return;
  }
  if (isAggregate4(condition)) {
    const family = inferFamily(condition);
    const event = family === "AGGREGATED_CUSTOM_EVENTS" ? condition.aggregate.conditions.find((criterion) => criterion.column.columnId === "EVENT_TYPE_ID")?.value : void 0;
    condition.aggregate.conditions.forEach(
      (criterion, index) => hydrateSimple(criterion, catalog, family, { event }, `${path}.aggregate.conditions[${index}]`)
    );
    if (condition.aggregate.rule != null) {
      throw new SegmentSdkError("A non-null backend aggregate rule cannot be losslessly hydrated.", [
        issue(
          "BACKEND_RULE_HYDRATION_UNSUPPORTED",
          "Convert this aggregate rule to the matching UI occurrence criterion before updating the segment.",
          `${path}.aggregate.rule`
        )
      ]);
    }
    delete condition.aggregate.rule;
    return;
  }
  condition.filter.conditions.forEach(
    (child, index) => hydrateCondition(child, catalog, `${path}.filter.conditions[${index}]`)
  );
}
function hydrateNode(node, catalog, path) {
  node.filter?.conditions.forEach(
    (condition, index) => hydrateCondition(condition, catalog, `${path}.filter.conditions[${index}]`)
  );
  node.segments?.forEach((child, index) => hydrateNode(child, catalog, `${path}.segments[${index}]`));
}
function hydrateBackendSegmentModel(model, definitions, uiContext = {}) {
  const hydrated = clone4(model);
  const catalog = new DefinitionCatalog(definitions, uiContext);
  for (const branch of ["include", "exclude"]) {
    hydrated[branch]?.segments.forEach(
      (node, index) => hydrateNode(node, catalog, `${branch}.segments[${index}]`)
    );
  }
  return hydrated;
}
export {
  ESNG_REVISION,
  SegmentFinishError,
  SegmentSdkError,
  createSegmentSdk,
  hydrateBackendSegmentModel
};
//# sourceMappingURL=index.js.map
