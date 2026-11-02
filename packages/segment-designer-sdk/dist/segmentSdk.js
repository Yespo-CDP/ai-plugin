import { Ajv2020 } from "ajv/dist/2020.js";
import { activityPeriodConditions, applyOccurrence, buildAggregate, buildCriterion, buildField, buildPredicted, customEventPeriodConditions, ESNG_REVISION, inferFamily, REQUIRED_COLUMNS, scPeriodConditions, } from "./conditionFactory.js";
import { DefinitionCatalog } from "./definitionCatalog.js";
import { SegmentFinishError, SegmentSdkError, issue } from "./errors.js";
import { reconcileFrontendAggregate, validateFrontendBusinessRules } from "./businessRules.js";
import { SegmentTree } from "./tree.js";
const CUSTOM_EVENT_DATE_COLUMNS = new Set(["EVENT_DATE", "EVENT_FIRST_DATE", "EVENT_LAST_DATE"]);
const ACTIVITY_OCCURRENCE_COLUMNS = new Set([
    "ACTIVITY_COUNT",
    "ACTIVITY_CTOR",
    "ACTIVITY_CTR",
    "ACTIVITY_OPEN_RATE",
    "ACTIVITY_DELIVERY_RATE",
    "ACTIVITY_RESPONSE_MINUTES",
]);
function clone(value) {
    return structuredClone(value);
}
function isAggregate(value) {
    return "aggregate" in value;
}
function isSimple(value) {
    return "column" in value && typeof value.column === "object" && value.column !== null &&
        "operator" in value && typeof value.operator === "string";
}
function isReplaceUpdate(update) {
    return "replaceWith" in update;
}
function sameJson(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}
function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
}
function refId(ref, expected) {
    if (ref === null || typeof ref !== "object" || typeof ref.id !== "string" || !expected.includes(ref.kind)) {
        throw new SegmentSdkError(`Expected a ${expected.join(" or ")} reference.`, [
            issue("INVALID_REFERENCE", `Expected reference kind ${expected.join(" or ")}.`),
        ]);
    }
    return ref.id;
}
function aggregateFamily(entry) {
    if (!isAggregate(entry.value))
        throw new SegmentSdkError("Reference does not point to an aggregate.");
    return inferFamily(entry.value);
}
function selectorFrom(condition) {
    return {
        columnId: condition.column.columnId ?? undefined,
        profileInputId: condition.column.profileInputId ?? undefined,
        type: condition.column.type ?? undefined,
    };
}
function jsonText(value) {
    return JSON.stringify(value).toLowerCase();
}
function splitRange(value) {
    const parts = Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(",") : [];
    return parts.length === 2 ? [parts[0].trim(), parts[1].trim()] : undefined;
}
function extractPeriod(condition, family) {
    const conditions = condition.aggregate.conditions;
    if (family === "AGGREGATED_SC") {
        const dates = conditions.filter((criterion) => criterion.column.columnId === "SC_EVENT_DATE");
        const from = dates.find((criterion) => criterion.operator === "GREATER_THAN_OR_EQUAL")?.value;
        const to = dates.find((criterion) => criterion.operator === "LESS_THAN_OR_EQUAL")?.value;
        if (from === "01/01/2010 00:00" && to === "01/01/2050 00:00")
            return { kind: "all-time" };
        if (typeof from === "string" && typeof to === "string")
            return { kind: "between", from, to };
        const relative = dates[0];
        if (relative !== undefined) {
            return typeof relative.value === "string" || typeof relative.value === "number"
                ? { kind: "relative", operator: relative.operator, value: relative.value }
                : { kind: "relative", operator: relative.operator };
        }
    }
    if (family === "AGGREGATED_CUSTOM_EVENTS") {
        const date = conditions.find((criterion) => CUSTOM_EVENT_DATE_COLUMNS.has(criterion.column.columnId ?? ""));
        if (date === undefined)
            return { kind: "all-time" };
        const range = splitRange(date.value);
        if (date.operator === "BETWEEN" && range !== undefined) {
            return { kind: "between", from: range[0], to: range[1], dateColumnId: date.column.columnId ?? undefined };
        }
        return typeof date.value === "string" || typeof date.value === "number"
            ? { kind: "relative", operator: date.operator, value: date.value }
            : { kind: "relative", operator: date.operator };
    }
    if (family === "AGGREGATED_ACTIVITY" || family === "AGGREGATED_WIDGET_ACTIVITY") {
        const dates = conditions.filter((criterion) => criterion.column.columnId === "ACTIVITY_DATE");
        if (dates.length === 0)
            return { kind: "all-time" };
        const from = dates.find((criterion) => criterion.operator === "GREATER_THAN_OR_EQUAL")?.value;
        const to = dates.find((criterion) => criterion.operator === "LESS_THAN_OR_EQUAL")?.value;
        if (typeof from === "string" && typeof to === "string")
            return { kind: "between", from, to };
        const relative = dates[0];
        return typeof relative.value === "string" || typeof relative.value === "number"
            ? { kind: "relative", operator: relative.operator, value: relative.value }
            : { kind: "relative", operator: relative.operator };
    }
    return undefined;
}
function selectedCustomEvent(condition) {
    return condition.aggregate.conditions.find((criterion) => criterion.column.columnId === "EVENT_TYPE_ID")?.value;
}
class SegmentSdkSession {
    tree;
    catalog;
    validateSchema;
    sealed = false;
    mutationCounter = 0;
    warningList = [];
    validationState = "pending";
    constructor(options) {
        if (!Array.isArray(options.definitions))
            throw new SegmentSdkError("definitions must be the full definition-endpoint array.");
        if (options.outputSchema === null || typeof options.outputSchema !== "object") {
            throw new SegmentSdkError("outputSchema is required so finish() can always run structural validation.");
        }
        this.tree = new SegmentTree(options.model);
        this.catalog = new DefinitionCatalog(options.definitions, options.uiContext);
        const ajv = new Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true });
        this.validateSchema = ajv.compile(options.outputSchema);
    }
    getModel() {
        return this.withDerivedParameters(this.tree.toModel()).model;
    }
    find(query) {
        const result = [];
        const limit = query.limit === undefined ? Number.POSITIVE_INFINITY : Math.max(0, query.limit);
        for (const location of this.tree.allCards(query.branch)) {
            const cardRef = this.tree.cardRef(location.card.id);
            if (query.parent === undefined && query.aggregate === undefined && (query.kind === undefined || query.kind === "card")) {
                const value = clone(location.card.filter);
                if (this.matchesQuery(query, "card", value)) {
                    result.push({ ref: cardRef, kind: "card", branch: location.branch, card: cardRef, value });
                    if (result.length >= limit)
                        return result;
                }
            }
            for (const entry of this.tree.allConditions().filter((candidate) => candidate.cardId === location.card.id)) {
                if (query.kind !== undefined && query.kind !== entry.kind)
                    continue;
                const family = entry.kind === "criterion"
                    ? aggregateFamily(this.tree.getCondition(entry.aggregateId ?? ""))
                    : isSimple(entry.value) || isAggregate(entry.value)
                        ? inferFamily(entry.value)
                        : undefined;
                const parent = entry.kind === "criterion"
                    ? this.tree.conditionRef(this.tree.getCondition(entry.aggregateId ?? ""))
                    : cardRef;
                if (query.parent !== undefined && (query.parent.kind !== parent.kind || query.parent.id !== parent.id))
                    continue;
                if (query.aggregate !== undefined && entry.aggregateId !== query.aggregate.id && entry.id !== query.aggregate.id)
                    continue;
                const value = clone(entry.value);
                if (!this.matchesQuery(query, entry.kind, value, family))
                    continue;
                result.push({
                    ref: this.tree.conditionRef(entry),
                    kind: entry.kind,
                    branch: location.branch,
                    card: cardRef,
                    parent,
                    family,
                    value,
                });
                if (result.length >= limit)
                    return result;
            }
        }
        return result;
    }
    addCard(branch, input = {}) {
        return this.mutate(() => {
            if (branch !== "include" && branch !== "exclude")
                throw new SegmentSdkError("branch must be include or exclude.");
            if (input.mode === "copy") {
                const sourceId = refId(input.copyFrom, ["card"]);
                if (this.tree.getCard(sourceId).branch !== branch) {
                    throw new SegmentSdkError("The UI copies a card within its current include/exclude branch.");
                }
                const card = this.tree.copyCard(sourceId, input.relation ?? "OR");
                return { card, conditions: this.tree.cardConditionRefs(card.id) };
            }
            const card = this.tree.addCard(branch, {
                relation: input.conditionRelation ?? "AND",
                negation: input.negated ?? false,
                conditions: [],
            }, input.relation ?? "AND");
            if (input.firstCondition !== undefined)
                this.addTopLevelCondition(card.id, input.firstCondition);
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
            if (!("kind" in intent))
                throw new SegmentSdkError("A card accepts a field, predicted, or aggregate intent.");
            return this.tree.conditionRef(this.addTopLevelCondition(cardId, intent));
        }
        const aggregateId = refId(parent, ["aggregate"]);
        if ("kind" in intent)
            throw new SegmentSdkError("An aggregate accepts only a CriterionIntent.");
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
            if (isReplaceUpdate(update))
                return this.replaceNode(entry, update.replaceWith);
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
                const columnId = isSimple(entry.value) ? entry.value.column.columnId : undefined;
                if (typeof columnId === "string" && this.managedColumns(family).has(columnId)) {
                    throw new SegmentSdkError(`${columnId} is controlled by the aggregate editor and cannot be removed independently.`);
                }
                if (family === "AGGREGATED_CUSTOMER_DATA" && isAggregate(aggregate.value) && aggregate.value.aggregate.conditions.length === 1) {
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
            model: clone(derived.model),
            formula: {
                include: this.tree.formula("include"),
                exclude: this.tree.formula("exclude", includeCount),
            },
            diagnostics: this.diagnostics(),
        };
    }
    addTopLevelCondition(cardId, intent) {
        const condition = intent.kind === "field"
            ? buildField(this.catalog, intent)
            : intent.kind === "predicted"
                ? buildPredicted(this.catalog, intent)
                : buildAggregate(this.catalog, intent);
        if (isAggregate(condition)) {
            const warnings = reconcileFrontendAggregate(condition, this.catalog);
            if (warnings.length > 0) {
                throw new SegmentSdkError("One or more requested aggregate criteria are not offered for the selected parent value.", warnings);
            }
        }
        return this.tree.addTopLevelCondition(cardId, condition);
    }
    updateSimple(entry, update) {
        if (!isSimple(entry.value))
            throw new SegmentSdkError("Composite filter conditions cannot be patched as simple conditions.");
        const current = entry.value;
        const parentFamily = entry.kind === "criterion"
            ? aggregateFamily(this.tree.getCondition(entry.aggregateId ?? ""))
            : inferFamily(current);
        const columnId = current.column.columnId;
        const editableLifecycleState = parentFamily === "AGGREGATED_CUSTOMER_LIFECYCLE" && columnId === "LIFECYCLE_STATE_ID";
        if (editableLifecycleState && update.definition !== undefined) {
            throw new SegmentSdkError("The lifecycle state definition is structural; update its operator/value or the aggregate selection.");
        }
        if (entry.kind === "criterion" && typeof columnId === "string") {
            const managed = this.managedColumns(parentFamily).has(columnId);
            if (managed && !editableLifecycleState) {
                throw new SegmentSdkError(`${columnId} is controlled by the aggregate editor; update the aggregate instead.`);
            }
        }
        if (parentFamily === "PREDICTED_SC" &&
            (update.definition !== undefined || update.operator !== undefined || update.value !== undefined ||
                update.clearValue || hasOwn(update, "label"))) {
            throw new SegmentSdkError("Predicted SoftCube operator and value are fixed by the frontend; only negation can be changed.");
        }
        const selector = update.definition ?? selectorFrom(current);
        const operator = update.operator ?? current.operator;
        let value = current.value;
        const suppliedValue = hasOwn(update, "value");
        if (update.clearValue)
            value = undefined;
        else if (suppliedValue)
            value = update.value;
        const aggregateEntry = entry.kind === "criterion" ? this.tree.getCondition(entry.aggregateId ?? "") : undefined;
        const context = aggregateEntry === undefined ? {} : this.criterionContext(aggregateEntry);
        if (!update.clearValue && !suppliedValue &&
            (update.definition !== undefined || update.operator !== undefined)) {
            const currentDefinition = this.catalog.resolve(selectorFrom(current), parentFamily, context);
            const nextDefinition = this.catalog.resolve(selector, parentFamily, context);
            const currentType = this.catalog.resolveOperator(currentDefinition, current.operator).type;
            const nextType = this.catalog.resolveOperator(nextDefinition, operator).type;
            if (update.definition !== undefined || currentType !== nextType || update.operator !== undefined) {
                value = undefined;
                this.warn(issue("UI_VALUE_RESET", "The value was cleared because the selected definition/operator changed its frontend control.", undefined));
            }
        }
        let label = hasOwn(update, "label") ? update.label : current.label;
        if (parentFamily === "AGGREGATED_CUSTOMER_DATA" && update.definition !== undefined && !hasOwn(update, "label")) {
            label = this.catalog.resolve(selector, parentFamily, context).categoryType ?? label;
        }
        const next = this.catalog.createSimpleCondition(selector, operator, value, {
            family: parentFamily,
            negated: update.negated ?? current.negation,
            label,
            context,
            valueMode: suppliedValue ? "intent" : "stored",
            allowParameter: false,
        });
        if (current.index !== undefined)
            next.index = current.index;
        if (aggregateEntry !== undefined && !editableLifecycleState)
            this.assertCriterionAvailable(aggregateEntry, next, entry.id);
        this.tree.replaceCondition(entry.id, next);
        return this.tree.conditionRef(this.tree.getCondition(entry.id));
    }
    replaceNode(entry, replacement) {
        if (entry.kind === "criterion") {
            if ("kind" in replacement)
                throw new SegmentSdkError("A nested criterion can only be replaced by another CriterionIntent.");
            const aggregate = this.tree.getCondition(entry.aggregateId ?? "");
            const family = aggregateFamily(aggregate);
            const currentColumn = isSimple(entry.value) ? entry.value.column.columnId : undefined;
            if (typeof currentColumn === "string" && this.managedColumns(family).has(currentColumn)) {
                throw new SegmentSdkError(`${currentColumn} is controlled by the aggregate editor and cannot be replaced directly.`);
            }
            const next = buildCriterion(this.catalog, replacement, family, this.criterionContext(aggregate));
            this.assertCriterionAvailable(aggregate, next, entry.id);
            this.tree.replaceCondition(entry.id, next);
            return this.tree.conditionRef(this.tree.getCondition(entry.id));
        }
        if (!("kind" in replacement))
            throw new SegmentSdkError("A card condition must be replaced by a ConditionIntent.");
        const next = replacement.kind === "field"
            ? buildField(this.catalog, replacement)
            : replacement.kind === "predicted"
                ? buildPredicted(this.catalog, replacement)
                : buildAggregate(this.catalog, replacement);
        this.tree.replaceCondition(entry.id, next);
        return this.tree.conditionRef(this.tree.getCondition(entry.id));
    }
    updateAggregate(entry, update) {
        if (!isAggregate(entry.value))
            throw new SegmentSdkError("Reference does not point to an aggregate.");
        let next = clone(entry.value);
        let family = inferFamily(next);
        if (update.selection !== undefined) {
            if (update.selection.family !== family) {
                throw new SegmentSdkError("Changing aggregate family is a condition replacement; use replaceWith with a full AggregateIntent.");
            }
            const preservesNestedCriteria = family === "AGGREGATED_SC" || family === "AGGREGATED_ACTIVITY" || family === "AGGREGATED_WIDGET_ACTIVITY";
            const discarded = preservesNestedCriteria ? [] : next.aggregate.conditions.filter((criterion) => !this.managedColumns(family).has(criterion.column.columnId ?? ""));
            next = this.rebuildSelection(next, update.selection, update.period);
            if (discarded.length > 0) {
                this.warn(issue("UI_DEPENDENCY_RESET", `${discarded.map((criterion) => criterion.column.columnId ?? "criterion").join(", ")} was reset because this frontend selection replaces the aggregate payload.`));
            }
            family = inferFamily(next);
        }
        if (update.negated !== undefined)
            next.aggregate.negation = update.negated;
        if (update.period !== undefined)
            this.replacePeriod(next, family, update.period);
        let requestedOccurrenceColumn;
        if (hasOwn(update, "occurrence")) {
            applyOccurrence(this.catalog, next, family, update.occurrence ?? null, this.aggregateContext(next));
            if (update.occurrence?.kind === "count" || update.occurrence?.kind === "exists" || update.occurrence?.kind === "not-exists") {
                requestedOccurrenceColumn = family === "AGGREGATED_CUSTOM_EVENTS" ? "EVENT_COUNT" : "ACTIVITY_COUNT";
            }
            else if (update.occurrence?.kind === "rate") {
                requestedOccurrenceColumn = next.aggregate.conditions.at(-1)?.column.columnId ?? undefined;
            }
        }
        const reconciliation = reconcileFrontendAggregate(next, this.catalog);
        if (requestedOccurrenceColumn !== undefined && !next.aggregate.conditions.some((criterion) => criterion.column.columnId === requestedOccurrenceColumn)) {
            throw new SegmentSdkError(`${requestedOccurrenceColumn} is not offered for the aggregate's current selection.`, reconciliation);
        }
        for (const warning of reconciliation)
            this.warn(warning);
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
                const currentEvents = (current.aggregate.conditions.find((criterion) => criterion.column.columnId === "SC_EVENT_NAME")?.value ?? "")
                    .toString().split(",").map((item) => item.trim());
                const special = new Set(["Probability", "Possible buyers", "Possible visitors"]);
                const crossesSpecialMode = nextEvents.some((event) => special.has(event)) || currentEvents.some((event) => special.has(event));
                const period = periodOverride ?? (crossesSpecialMode ? undefined : currentPeriod);
                intent = { kind: "aggregate", family: selection.family, event: selection.event, period, negated };
                break;
            }
            case "AGGREGATED_CUSTOM_EVENTS": {
                const period = periodOverride;
                if (selection.dateColumnId !== undefined && selection.dateColumnId !== "EVENT_DATE" && period?.kind === "all-time") {
                    throw new SegmentSdkError("First/last-event mode requires a period so its date basis is representable in UI-mode JSON.");
                }
                intent = {
                    kind: "aggregate",
                    family: selection.family,
                    event: selection.event,
                    dateColumnId: selection.dateColumnId ?? "EVENT_DATE",
                    period,
                    negated,
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
                    negated,
                };
                break;
        }
        const rebuilt = buildAggregate(this.catalog, intent);
        if (family === "AGGREGATED_SC" || family === "AGGREGATED_ACTIVITY" || family === "AGGREGATED_WIDGET_ACTIVITY") {
            const managed = this.managedColumns(family);
            const optional = current.aggregate.conditions.filter((criterion) => !managed.has(criterion.column.columnId ?? ""));
            rebuilt.aggregate.conditions.push(...clone(optional));
        }
        return rebuilt;
    }
    replacePeriod(condition, family, period) {
        const periodFamilies = new Set([
            "AGGREGATED_SC",
            "AGGREGATED_CUSTOM_EVENTS",
            "AGGREGATED_ACTIVITY",
            "AGGREGATED_WIDGET_ACTIVITY",
        ]);
        if (!periodFamilies.has(family))
            throw new SegmentSdkError(`${family} has no period control in the frontend.`);
        const dateIds = family === "AGGREGATED_SC"
            ? new Set(["SC_EVENT_DATE"])
            : family === "AGGREGATED_CUSTOM_EVENTS"
                ? CUSTOM_EVENT_DATE_COLUMNS
                : new Set(["ACTIVITY_DATE"]);
        const currentDateId = condition.aggregate.conditions.find((criterion) => typeof criterion.column.columnId === "string" && dateIds.has(criterion.column.columnId))?.column.columnId ?? "EVENT_DATE";
        const retained = condition.aggregate.conditions.filter((criterion) => typeof criterion.column.columnId !== "string" || !dateIds.has(criterion.column.columnId));
        const dates = family === "AGGREGATED_SC"
            ? scPeriodConditions(this.catalog, period)
            : family === "AGGREGATED_CUSTOM_EVENTS"
                ? customEventPeriodConditions(this.catalog, period, currentDateId)
                : activityPeriodConditions(this.catalog, period, family);
        const selectorIndex = retained.findIndex((criterion) => REQUIRED_COLUMNS[family].includes(criterion.column.columnId ?? ""));
        retained.splice(Math.max(0, selectorIndex + 1), 0, ...dates);
        condition.aggregate.conditions = retained;
    }
    managedColumns(family) {
        switch (family) {
            case "AGGREGATED_SC": return new Set(["SC_EVENT_NAME", "SC_EVENT_DATE"]);
            case "AGGREGATED_CUSTOM_EVENTS": return new Set(["EVENT_TYPE_ID", ...CUSTOM_EVENT_DATE_COLUMNS]);
            case "AGGREGATED_ACTIVITY": return new Set(["ACTIVITY_EVENT_ID", "ACTIVITY_DATE"]);
            case "AGGREGATED_WIDGET_ACTIVITY": return new Set(["ACTIVITY_EVENT_ID", "ACTIVITY_DATE", "ACTIVITY_MEDIA_TYPE"]);
            case "AGGREGATED_PUSH": return new Set(["PUSH_APPLICATION_ID"]);
            case "AGGREGATED_TOKEN": return new Set(["TOKEN_APPLICATION_ID"]);
            case "AGGREGATED_CUSTOMER_LIFECYCLE": return new Set(["LIFECYCLE_SCHEMA_ID", "LIFECYCLE_STATE_ID"]);
            case "AGGREGATED_CUSTOMER_DATA": return new Set();
        }
    }
    criterionContext(entry) {
        return isAggregate(entry.value) ? this.aggregateContext(entry.value) : {};
    }
    aggregateContext(condition) {
        return inferFamily(condition) === "AGGREGATED_CUSTOM_EVENTS"
            ? { event: selectedCustomEvent(condition) }
            : {};
    }
    assertCriterionAvailable(aggregateEntry, criterion, replacingId) {
        if (!isAggregate(aggregateEntry.value))
            throw new SegmentSdkError("Criterion parent is invalid.");
        const family = inferFamily(aggregateEntry.value);
        const columnId = criterion.column.columnId;
        if (typeof columnId === "string" && this.managedColumns(family).has(columnId)) {
            throw new SegmentSdkError(`${columnId} is managed by the aggregate editor and cannot be added as a nested criterion.`, [
                issue("SYSTEM_CRITERION", `Use updateCondition() on the aggregate for its UI-managed ${columnId} value.`),
            ]);
        }
        const existing = this.tree.allConditions().filter((candidate) => candidate.aggregateId === aggregateEntry.id && candidate.id !== replacingId && isSimple(candidate.value)).map((candidate) => candidate.value);
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
        if (typeof columnId === "string" && ACTIVITY_OCCURRENCE_COLUMNS.has(columnId) &&
            ids.some((id) => typeof id === "string" && ACTIVITY_OCCURRENCE_COLUMNS.has(id))) {
            throw new SegmentSdkError("Activity count/rate/response occurrence controls are mutually exclusive in the frontend.");
        }
        const candidate = clone(aggregateEntry.value);
        if (replacingId !== undefined) {
            const old = this.tree.getCondition(replacingId);
            const oldIndex = candidate.aggregate.conditions.findIndex((item) => sameJson(item, old.value));
            if (oldIndex >= 0)
                candidate.aggregate.conditions.splice(oldIndex, 1);
        }
        candidate.aggregate.conditions.push(clone(criterion));
        reconcileFrontendAggregate(candidate, this.catalog);
        if (!candidate.aggregate.conditions.some((item) => sameJson(item, criterion))) {
            throw new SegmentSdkError(`${columnId ?? "The criterion"} is not offered for the aggregate's current selection.`, [
                issue("CRITERION_NOT_AVAILABLE", "Change the aggregate selection or choose a criterion shown by that selection."),
            ]);
        }
    }
    withDerivedParameters(model) {
        const next = clone(model);
        const existing = new Map();
        for (const parameter of next.parameters ?? []) {
            if (typeof parameter.name === "string")
                existing.set(parameter.name, clone(parameter));
        }
        const ordered = new Map();
        const issues = [];
        const visitSimple = (condition, family, path, context = {}) => {
            if (typeof condition.value !== "string")
                return;
            const match = /^\$\{([A-Za-z]+)\}$/.exec(condition.value);
            if (match === null)
                return;
            let type;
            try {
                type = this.catalog.parameterType(condition, family, context);
            }
            catch {
                return;
            }
            const previous = ordered.get(match[1]);
            if (previous !== undefined && previous.type !== type) {
                issues.push(issue("PARAMETER_TYPE_MISMATCH", `Parameter ${match[1]} is used as both ${previous.type} and ${type}.`, path));
            }
            else if (previous === undefined) {
                ordered.set(match[1], { type, path });
            }
        };
        const visitCondition = (condition, path) => {
            if (isSimple(condition)) {
                visitSimple(condition, inferFamily(condition), path);
            }
            else if (isAggregate(condition)) {
                const family = inferFamily(condition);
                const context = this.aggregateContext(condition);
                condition.aggregate.conditions.forEach((criterion, index) => visitSimple(criterion, family, `${path}.aggregate.conditions[${index}]`, context));
            }
            else {
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
            if (prior !== undefined && prior.type !== usage.type) {
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
                issues.push(issue("OUTPUT_SCHEMA", error.message ?? "Output schema validation failed.", error.instancePath || undefined));
            }
        }
        issues.push(...validateFrontendBusinessRules(model, this.catalog));
        return issues;
    }
    matchesQuery(query, kind, value, family) {
        if (query.kind !== undefined && query.kind !== kind)
            return false;
        if (query.family !== undefined && query.family !== family)
            return false;
        if (query.text !== undefined && !jsonText(value).includes(query.text.toLowerCase()))
            return false;
        const simples = isSimple(value)
            ? [value]
            : isAggregate(value)
                ? value.aggregate.conditions
                : [];
        if (query.columnId !== undefined && !simples.some((item) => item.column.columnId === query.columnId))
            return false;
        if (query.profileInputId !== undefined && !simples.some((item) => item.column.profileInputId === query.profileInputId))
            return false;
        if (query.operator !== undefined && !simples.some((item) => item.operator === query.operator))
            return false;
        if (query.value !== undefined && !simples.some((item) => sameJson(item.value, query.value)))
            return false;
        return true;
    }
    mutate(operation) {
        try {
            this.assertOpen();
        }
        catch (error) {
            return this.failure(error);
        }
        const snapshot = this.tree.snapshot();
        const warningCount = this.warningList.length;
        try {
            const value = operation();
            this.mutationCounter += 1;
            return { ok: true, value, warnings: clone(this.warningList.slice(warningCount)) };
        }
        catch (error) {
            this.tree.restore(snapshot);
            this.warningList.splice(warningCount);
            return this.failure(error);
        }
    }
    warn(warning) {
        this.warningList.push(clone(warning));
    }
    diagnostics() {
        return {
            mutationCount: this.mutationCounter,
            warnings: clone(this.warningList),
            validation: this.validationState,
            eSngRevision: ESNG_REVISION,
            definitionCount: this.catalog.definitions.length,
        };
    }
    failure(error) {
        if (error instanceof SegmentSdkError)
            return { ok: false, issues: error.issues };
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, issues: [issue("SEGMENT_SDK_ERROR", message)] };
    }
    assertOpen() {
        if (this.sealed)
            throw new SegmentSdkError("This segment SDK session is sealed after finish().");
    }
}
export function createSegmentSdk(options) {
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
        finish: session.finish.bind(session),
    });
}
//# sourceMappingURL=segmentSdk.js.map