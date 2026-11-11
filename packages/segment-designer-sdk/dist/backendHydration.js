import { inferFamily } from "./conditionFactory.js";
import { DefinitionCatalog } from "./definitionCatalog.js";
import { SegmentSdkError, issue } from "./errors.js";
const BACKEND_WRAPPED_MULTI_VALUE_COLUMNS = new Set([
    "ACTIVITY_MESSAGE_ID",
    "ACTIVITY_CALLOUT_ID",
    "ACTIVITY_IMCALLOUT_ID",
]);
function clone(value) {
    return structuredClone(value);
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isSimple(condition) {
    return "column" in condition;
}
function isAggregate(condition) {
    return "aggregate" in condition;
}
function unwrapBackendMultiValue(value, columnId, path) {
    if (!isRecord(value))
        return value;
    const entries = Object.entries(value);
    if (entries.length === 1 && Array.isArray(entries[0][1])) {
        return clone(entries[0][1]);
    }
    throw new SegmentSdkError(`Cannot hydrate the backend value for ${columnId}.`, [
        issue("BACKEND_MULTI_VALUE_SHAPE", `${columnId} must contain one array-valued backend selection wrapper.`, `${path}.value`),
    ]);
}
function hydrateSimple(condition, catalog, family, context, path) {
    const definition = catalog.resolve({
        columnId: condition.column.columnId ?? undefined,
        profileInputId: condition.column.profileInputId ?? undefined,
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
    if (isSimple(condition)) {
        hydrateSimple(condition, catalog, inferFamily(condition), {}, path);
        return;
    }
    if (isAggregate(condition)) {
        const family = inferFamily(condition);
        const event = family === "AGGREGATED_CUSTOM_EVENTS"
            ? condition.aggregate.conditions.find((criterion) => criterion.column.columnId === "EVENT_TYPE_ID")?.value
            : undefined;
        condition.aggregate.conditions.forEach((criterion, index) => hydrateSimple(criterion, catalog, family, { event }, `${path}.aggregate.conditions[${index}]`));
        if (condition.aggregate.rule != null) {
            throw new SegmentSdkError("A non-null backend aggregate rule cannot be losslessly hydrated.", [
                issue("BACKEND_RULE_HYDRATION_UNSUPPORTED", "Convert this aggregate rule to the matching UI occurrence criterion before updating the segment.", `${path}.aggregate.rule`),
            ]);
        }
        delete condition.aggregate.rule;
        return;
    }
    condition.filter.conditions.forEach((child, index) => hydrateCondition(child, catalog, `${path}.filter.conditions[${index}]`));
}
function hydrateNode(node, catalog, path) {
    node.filter?.conditions.forEach((condition, index) => hydrateCondition(condition, catalog, `${path}.filter.conditions[${index}]`));
    node.segments?.forEach((child, index) => hydrateNode(child, catalog, `${path}.segments[${index}]`));
}
/**
 * Convert the backend representation returned by get_segment into the UI-mode
 * model accepted by the SDK. This belongs at the trusted runner boundary; the
 * public mutation API intentionally continues to reject backend-only fields.
 */
export function hydrateBackendSegmentModel(model, definitions, uiContext = {}) {
    const hydrated = clone(model);
    const catalog = new DefinitionCatalog(definitions, uiContext);
    for (const branch of ["include", "exclude"]) {
        hydrated[branch]?.segments.forEach((node, index) => hydrateNode(node, catalog, `${branch}.segments[${index}]`));
    }
    return hydrated;
}
//# sourceMappingURL=backendHydration.js.map