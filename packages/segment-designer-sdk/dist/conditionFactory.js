import { SegmentSdkError, issue } from "./errors.js";
export const ESNG_REVISION = "535e60a314b93d3d3f23b2f8faa8a2bfb9901bc8";
export const SOFT_CUBE_PREDICTED_IDS = new Set([
    "SURE_BUYERS",
    "POTENTIAL_BUYERS",
    "UNLIKELY_BUYERS",
    "UNDECIDED_BUYERS",
    "SC_RECALL",
]);
export const REQUIRED_COLUMNS = {
    AGGREGATED_SC: ["SC_EVENT_NAME", "SC_EVENT_DATE"],
    AGGREGATED_CUSTOM_EVENTS: ["EVENT_TYPE_ID"],
    AGGREGATED_ACTIVITY: ["ACTIVITY_EVENT_ID"],
    AGGREGATED_WIDGET_ACTIVITY: ["ACTIVITY_EVENT_ID", "ACTIVITY_MEDIA_TYPE"],
    AGGREGATED_PUSH: ["PUSH_APPLICATION_ID"],
    AGGREGATED_TOKEN: ["TOKEN_APPLICATION_ID"],
    AGGREGATED_CUSTOMER_DATA: [],
    AGGREGATED_CUSTOMER_LIFECYCLE: ["LIFECYCLE_SCHEMA_ID", "LIFECYCLE_STATE_ID"],
};
function eventList(value) {
    return Array.isArray(value) ? value.join(",") : value;
}
function assertAvailableOptions(catalog, definition, values, label) {
    if ((definition.options?.length ?? 0) === 0 && (definition.profileInputMetadata?.options?.length ?? 0) === 0)
        return;
    const missing = values.filter((value) => catalog.findOption(definition, value) === undefined);
    if (missing.length > 0) {
        throw new SegmentSdkError(`${label} is not available in the current frontend definitions.`, [
            issue("OPTION_NOT_AVAILABLE", `${missing.map(String).join(", ")} cannot be selected for ${definition.columnId ?? label}.`),
        ]);
    }
}
export function periodOrDefault(family, event, period) {
    if (period !== undefined)
        return period;
    if (family === "AGGREGATED_SC") {
        if (event === "Possible buyers")
            return { kind: "relative", operator: "NEXT_DAYS", value: 30 };
        if (event === "Possible visitors")
            return { kind: "relative", operator: "NEXT_DAYS", value: 7 };
        if (event === "Probability")
            return { kind: "relative", operator: "NEXT_DAYS", value: 90 };
    }
    if (family === "AGGREGATED_CUSTOM_EVENTS")
        return { kind: "relative", operator: "TODAY" };
    return { kind: "relative", operator: "LAST_WEEKS", value: 1 };
}
function simple(catalog, columnId, operator, value, family, context = {}, stored = false) {
    return catalog.createSimpleCondition({ columnId }, operator, value, {
        family,
        context,
        valueMode: stored ? "stored" : "intent",
    });
}
export function scPeriodConditions(catalog, period) {
    if (period.kind === "all-time") {
        const from = simple(catalog, "SC_EVENT_DATE", "GREATER_THAN_OR_EQUAL", "01/01/2010 00:00", "AGGREGATED_SC");
        const to = simple(catalog, "SC_EVENT_DATE", "LESS_THAN_OR_EQUAL", "01/01/2050 00:00", "AGGREGATED_SC");
        // eSNG's external SC mapper writes these sentinel values verbatim rather than applying user-timezone conversion.
        from.value = "01/01/2010 00:00";
        to.value = "01/01/2050 00:00";
        return [from, to];
    }
    if (period.kind === "between") {
        return [
            simple(catalog, "SC_EVENT_DATE", "GREATER_THAN_OR_EQUAL", period.from, "AGGREGATED_SC"),
            simple(catalog, "SC_EVENT_DATE", "LESS_THAN_OR_EQUAL", period.to, "AGGREGATED_SC"),
        ];
    }
    return [simple(catalog, "SC_EVENT_DATE", period.operator, period.value, "AGGREGATED_SC")];
}
export function customEventPeriodConditions(catalog, period, dateColumnId) {
    if (period.kind === "all-time") {
        if (dateColumnId !== "EVENT_DATE") {
            throw new SegmentSdkError("All time is available only for the regular custom-event date mode.", [
                issue("ALL_TIME_WITH_FIRST_OR_LAST", "First/last-event modes require an explicit period."),
            ]);
        }
        return [];
    }
    if (period.kind === "between") {
        return [simple(catalog, period.dateColumnId ?? dateColumnId, "BETWEEN", `${period.from},${period.to}`, "AGGREGATED_CUSTOM_EVENTS")];
    }
    return [simple(catalog, dateColumnId, period.operator, period.value, "AGGREGATED_CUSTOM_EVENTS")];
}
export function activityPeriodConditions(catalog, period, family) {
    if (period.kind === "all-time")
        return [];
    if (period.kind === "between") {
        return [
            simple(catalog, "ACTIVITY_DATE", "GREATER_THAN_OR_EQUAL", period.from, family),
            simple(catalog, "ACTIVITY_DATE", "LESS_THAN_OR_EQUAL", period.to, family),
        ];
    }
    return [simple(catalog, "ACTIVITY_DATE", period.operator, period.value, family)];
}
export function buildField(catalog, intent) {
    return catalog.createSimpleCondition(intent.definition, intent.operator, intent.value, {
        family: "FIELDS",
        negated: intent.negated,
        label: intent.label,
        allowParameter: true,
    });
}
export function buildPredicted(catalog, intent) {
    const definition = catalog.resolve(intent.definition, "PREDICTED_SC");
    if (definition.columnId === null || definition.columnId === undefined || !SOFT_CUBE_PREDICTED_IDS.has(definition.columnId)) {
        throw new SegmentSdkError("The selected definition is not a predicted SoftCube condition.", [
            issue("PREDICTED_DEFINITION_REQUIRED", "Predicted conditions are limited to the frontend SoftCube predicted definition set."),
        ]);
    }
    return catalog.createSimpleCondition(intent.definition, "NEXT_DAYS", "30", {
        family: "PREDICTED_SC",
        negated: intent.negated,
    });
}
export function buildCriterion(catalog, intent, family, context = {}) {
    const definition = catalog.resolve(intent.definition, family, context);
    const label = family === "AGGREGATED_CUSTOMER_DATA"
        ? (definition.categoryType ?? intent.label)
        : intent.label;
    return catalog.createSimpleCondition(intent.definition, intent.operator, intent.value, {
        family,
        negated: intent.negated,
        label,
        context,
        allowParameter: true,
    });
}
function applyAggregateExtras(catalog, intent, condition, context = {}) {
    if (intent.family === "AGGREGATED_CUSTOMER_LIFECYCLE" && (intent.criteria?.length ?? 0) > 0) {
        throw new SegmentSdkError("Customer lifecycle exposes only its schema and state controls in the frontend.");
    }
    const managedColumns = {
        AGGREGATED_SC: new Set(["SC_EVENT_NAME", "SC_EVENT_DATE"]),
        AGGREGATED_CUSTOM_EVENTS: new Set(["EVENT_TYPE_ID", "EVENT_DATE", "EVENT_FIRST_DATE", "EVENT_LAST_DATE"]),
        AGGREGATED_ACTIVITY: new Set(["ACTIVITY_EVENT_ID", "ACTIVITY_DATE"]),
        AGGREGATED_WIDGET_ACTIVITY: new Set(["ACTIVITY_EVENT_ID", "ACTIVITY_DATE", "ACTIVITY_MEDIA_TYPE"]),
        AGGREGATED_PUSH: new Set(["PUSH_APPLICATION_ID"]),
        AGGREGATED_TOKEN: new Set(["TOKEN_APPLICATION_ID"]),
        AGGREGATED_CUSTOMER_DATA: new Set(),
        AGGREGATED_CUSTOMER_LIFECYCLE: new Set(["LIFECYCLE_SCHEMA_ID", "LIFECYCLE_STATE_ID"]),
    };
    const activityOccurrenceColumns = new Set([
        "ACTIVITY_COUNT", "ACTIVITY_CTOR", "ACTIVITY_CTR", "ACTIVITY_OPEN_RATE",
        "ACTIVITY_DELIVERY_RATE", "ACTIVITY_RESPONSE_MINUTES",
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
        if (activityOccurrenceColumns.has(columnId) && existingIds.some((id) => typeof id === "string" && activityOccurrenceColumns.has(id))) {
            throw new SegmentSdkError("Activity count/rate/response occurrence controls are mutually exclusive in the frontend.");
        }
        condition.aggregate.conditions.push(criterion);
    }
    if (intent.occurrence !== undefined) {
        const ids = condition.aggregate.conditions.map((criterion) => criterion.column.columnId ?? "");
        if (ids.includes("EVENT_COUNT") || ids.some((id) => activityOccurrenceColumns.has(id))) {
            throw new SegmentSdkError("Specify occurrence once, either through occurrence or through a nested criterion.");
        }
        applyOccurrence(catalog, condition, intent.family, intent.occurrence, context);
    }
    return condition;
}
export function applyOccurrence(catalog, condition, family, occurrence, context = {}) {
    const occurrenceColumns = family === "AGGREGATED_CUSTOM_EVENTS"
        ? new Set(["EVENT_COUNT"])
        : family === "AGGREGATED_ACTIVITY" || family === "AGGREGATED_WIDGET_ACTIVITY"
            ? new Set(["ACTIVITY_COUNT", "ACTIVITY_CTOR", "ACTIVITY_CTR", "ACTIVITY_OPEN_RATE", "ACTIVITY_DELIVERY_RATE", "ACTIVITY_RESPONSE_MINUTES"])
            : new Set();
    condition.aggregate.conditions = condition.aggregate.conditions.filter((criterion) => !occurrenceColumns.has(criterion.column.columnId ?? ""));
    if (occurrence === null)
        return;
    if (occurrence.kind === "exists" || occurrence.kind === "not-exists") {
        const countColumn = family === "AGGREGATED_CUSTOM_EVENTS"
            ? "EVENT_COUNT"
            : family === "AGGREGATED_ACTIVITY" || family === "AGGREGATED_WIDGET_ACTIVITY"
                ? "ACTIVITY_COUNT"
                : undefined;
        if (countColumn === undefined)
            throw new SegmentSdkError(`${family} has no exists/not-exists occurrence control in the frontend.`);
        if (family === "AGGREGATED_CUSTOM_EVENTS" && condition.aggregate.conditions.some((criterion) => criterion.column.columnId === "EVENT_FIRST_DATE" || criterion.column.columnId === "EVENT_LAST_DATE")) {
            throw new SegmentSdkError("Event occurrence is not offered for first/last-event date modes.", [
                issue("EVENT_COUNT_WITH_FIRST_OR_LAST", "Select the regular event date mode before choosing occurred/did not occur."),
            ]);
        }
        condition.aggregate.conditions.push(simple(catalog, countColumn, occurrence.kind === "exists" ? "GREATER_THAN" : "EQUALS", "0", family, context));
        return;
    }
    if (occurrence.kind === "rate") {
        if (family !== "AGGREGATED_ACTIVITY" && family !== "AGGREGATED_WIDGET_ACTIVITY") {
            throw new SegmentSdkError("Rate occurrence controls are offered only by activity aggregates.");
        }
        const rate = buildCriterion(catalog, occurrence.criterion, family, context);
        const rateColumns = new Set([
            "ACTIVITY_CTOR",
            "ACTIVITY_CTR",
            "ACTIVITY_OPEN_RATE",
            "ACTIVITY_DELIVERY_RATE",
            "ACTIVITY_RESPONSE_MINUTES",
        ]);
        if (!rateColumns.has(rate.column.columnId ?? "")) {
            throw new SegmentSdkError("A rate occurrence must use one of the activity rate/response controls offered by the frontend.");
        }
        condition.aggregate.conditions.push(rate);
        return;
    }
    const countColumn = family === "AGGREGATED_CUSTOM_EVENTS"
        ? "EVENT_COUNT"
        : family === "AGGREGATED_ACTIVITY" || family === "AGGREGATED_WIDGET_ACTIVITY"
            ? "ACTIVITY_COUNT"
            : undefined;
    if (countColumn === undefined) {
        throw new SegmentSdkError(`${family} has no count occurrence control in the frontend.`);
    }
    if (family === "AGGREGATED_CUSTOM_EVENTS" && condition.aggregate.conditions.some((criterion) => criterion.column.columnId === "EVENT_FIRST_DATE" || criterion.column.columnId === "EVENT_LAST_DATE")) {
        throw new SegmentSdkError("EVENT_COUNT is not offered for first/last-event date modes.", [
            issue("EVENT_COUNT_WITH_FIRST_OR_LAST", "Select the regular event date mode before adding a count occurrence."),
        ]);
    }
    condition.aggregate.conditions.push(simple(catalog, countColumn, occurrence.operator, occurrence.value, family, context));
}
export function buildAggregate(catalog, intent) {
    const conditions = [];
    switch (intent.family) {
        case "AGGREGATED_SC": {
            const event = eventList(intent.event);
            const eventDefinition = catalog.resolveColumn("SC_EVENT_NAME", intent.family);
            assertAvailableOptions(catalog, eventDefinition, Array.isArray(intent.event) ? intent.event : [intent.event], "SoftCube event");
            const stored = Array.isArray(intent.event)
                ? intent.event.map((item) => catalog.optionStoredValue(eventDefinition, item, "value")).join(",")
                : catalog.optionStoredValue(eventDefinition, intent.event, "value");
            conditions.push(simple(catalog, "SC_EVENT_NAME", Array.isArray(intent.event) ? "ONE_OF" : "EQUALS", stored, intent.family, {}, true));
            conditions.push(...scPeriodConditions(catalog, periodOrDefault(intent.family, event, intent.period)));
            return applyAggregateExtras(catalog, intent, {
                aggregate: { collection: "SC_EVENTS", negation: intent.negated ?? false, conditions },
            });
        }
        case "AGGREGATED_CUSTOM_EVENTS": {
            const eventDefinition = catalog.resolveColumn("EVENT_TYPE_ID", intent.family);
            const eventOption = catalog.findOption(eventDefinition, intent.event);
            assertAvailableOptions(catalog, eventDefinition, [intent.event], "Custom event");
            const eventSelection = eventOption?.id ?? eventOption?.value ?? intent.event;
            const eventName = eventOption?.name ?? String(intent.event);
            const eventCondition = simple(catalog, "EVENT_TYPE_ID", "EQUALS", eventSelection, intent.family);
            conditions.push(eventCondition);
            const dateColumnId = intent.dateColumnId ?? "EVENT_DATE";
            conditions.push(...customEventPeriodConditions(catalog, periodOrDefault(intent.family, eventName, intent.period), dateColumnId));
            return applyAggregateExtras(catalog, intent, {
                aggregate: { collection: "EVENTS", negation: intent.negated ?? false, conditions },
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
            conditions.push(simple(catalog, "ACTIVITY_EVENT_ID", eventItems.length > 1 ? "ONE_OF" : "EQUALS", eventValue, intent.family, {}, true));
            conditions.push(...activityPeriodConditions(catalog, periodOrDefault(intent.family, eventList(intent.event), intent.period), intent.family));
            const result = applyAggregateExtras(catalog, intent, {
                aggregate: { collection: "ACTIVITY", negation: intent.negated ?? false, conditions },
            });
            if (intent.family === "AGGREGATED_WIDGET_ACTIVITY") {
                // The external widget mapper appends this discriminator after the initially selected criterion.
                result.aggregate.conditions.push(simple(catalog, "ACTIVITY_MEDIA_TYPE", "EQUALS", "WIDGET", intent.family, {}, true));
            }
            return result;
        }
        case "AGGREGATED_PUSH": {
            const definition = catalog.resolveColumn("PUSH_APPLICATION_ID", intent.family);
            if ((definition.options?.length ?? 0) > 0 && catalog.findOption(definition, intent.applicationId) === undefined) {
                throw new SegmentSdkError("The push application is not available in PUSH_APPLICATION_ID options.", [
                    issue("PUSH_APPLICATION_NOT_AVAILABLE", `Push application ${intent.applicationId} is not available.`),
                ]);
            }
            const applicationId = catalog.optionStoredValue(definition, intent.applicationId, "value");
            conditions.push(simple(catalog, "PUSH_APPLICATION_ID", "EQUALS", String(applicationId), intent.family, {}, true));
            return applyAggregateExtras(catalog, intent, {
                aggregate: { collection: "PUSH_SUBSCRIPTIONS", negation: intent.negated ?? false, conditions },
            });
        }
        case "AGGREGATED_TOKEN": {
            const definition = catalog.resolveColumn("TOKEN_APPLICATION_ID", intent.family);
            if ((definition.options?.length ?? 0) > 0 && catalog.findOption(definition, intent.applicationId) === undefined) {
                throw new SegmentSdkError("The token application is not available in TOKEN_APPLICATION_ID options.", [
                    issue("TOKEN_APPLICATION_NOT_AVAILABLE", `Token application ${intent.applicationId} is not available.`),
                ]);
            }
            const applicationId = catalog.optionStoredValue(definition, intent.applicationId, "value");
            conditions.push(simple(catalog, "TOKEN_APPLICATION_ID", "EQUALS", String(applicationId), intent.family, {}, true));
            return applyAggregateExtras(catalog, intent, {
                aggregate: { collection: "TOKEN_SUBSCRIPTIONS", negation: intent.negated ?? false, conditions },
            });
        }
        case "AGGREGATED_CUSTOMER_DATA": {
            conditions.push(buildCriterion(catalog, intent.source, intent.family));
            return applyAggregateExtras(catalog, intent, {
                aggregate: { collection: "CUSTOMER_DATA", negation: intent.negated ?? false, conditions },
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
                allowParameter: true,
            });
            conditions.push(state);
            return applyAggregateExtras(catalog, intent, {
                aggregate: { collection: "CUSTOMER_LIFECYCLE", negation: intent.negated ?? false, conditions },
            });
        }
    }
}
export function inferFamily(condition) {
    if (!("aggregate" in condition)) {
        return condition.column.columnId !== null && condition.column.columnId !== undefined &&
            SOFT_CUBE_PREDICTED_IDS.has(condition.column.columnId)
            ? "PREDICTED_SC"
            : "FIELDS";
    }
    switch (condition.aggregate.collection) {
        case "SC_EVENTS": return "AGGREGATED_SC";
        case "PUSH_SUBSCRIPTIONS": return "AGGREGATED_PUSH";
        case "TOKEN_SUBSCRIPTIONS": return "AGGREGATED_TOKEN";
        case "EVENTS": return "AGGREGATED_CUSTOM_EVENTS";
        case "CUSTOMER_DATA": return "AGGREGATED_CUSTOMER_DATA";
        case "CUSTOMER_LIFECYCLE": return "AGGREGATED_CUSTOMER_LIFECYCLE";
        case "ACTIVITY": {
            return condition.aggregate.conditions.some((criterion) => criterion.column.columnId === "ACTIVITY_MEDIA_TYPE" && criterion.value === "WIDGET") ? "AGGREGATED_WIDGET_ACTIVITY" : "AGGREGATED_ACTIVITY";
        }
    }
}
//# sourceMappingURL=conditionFactory.js.map