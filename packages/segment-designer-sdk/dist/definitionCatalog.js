import moment from "moment-timezone";
import { SegmentSdkError, issue } from "./errors.js";
const DATE_FORMAT = "DD/MM/YYYY";
const DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm";
const NUMBER_TYPES = new Set(["INTEGER", "DOUBLE"]);
const MULTI_OPERATORS = new Set(["ONE_OF", "CONTAINS_ONE_OF"]);
const SYSTEM_COMMA_COLUMNS = new Set(["SC_EVENT_NAME", "ACTIVITY_EVENT_ID"]);
const ACTIVITY_MESSAGE_COLUMNS = new Set(["ACTIVITY_MESSAGE_ID", "ACTIVITY_CALLOUT_ID", "ACTIVITY_IMCALLOUT_ID"]);
const SHORT_YEAR_COLUMNS = new Set(["CREATED_DATE_YEAR", "UPDATED_DATE_YEAR", "PUSH_SUBSCRIBED_DATE_YEAR"]);
const PARAMETER_TYPES = {
    STRING: "TEXT", EMAIL: "TEXT", TEXT_AREA: "TEXT_AREA", INTEGER: "INTEGER", DOUBLE: "FLOAT", DATE: "DATE",
};
const SANITIZE_PATTERN = /[%^*|~{};"<>]/;
function clone(value) { return structuredClone(value); }
function scalarEquals(a, b) {
    if (a === b)
        return true;
    if (a == null || b == null)
        return false;
    return String(a) === String(b);
}
function familyMatches(definition, family) {
    if (family === undefined)
        return true;
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
    return definition.conditionType === undefined || definition.conditionType === family;
}
function flattenDefinitions(definitions) {
    const result = [];
    const visit = (definition, eventIdentities) => {
        result.push({ definition, eventIdentities });
        for (const option of [...(definition.options ?? []), ...(definition.profileInputMetadata?.options ?? [])]) {
            const identities = [option.id, option.profileInputOptionId, option.value, option.name, option.label, option.description]
                .filter((item) => item !== undefined);
            for (const parameter of option.params ?? [])
                visit(parameter, identities);
        }
    };
    definitions.forEach((definition) => visit(clone(definition)));
    return result;
}
function parameterName(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value) || !("parameter" in value))
        return undefined;
    return typeof value.parameter === "string" ? value.parameter.trim() : undefined;
}
function asAtoms(value) {
    if (Array.isArray(value))
        return clone(value);
    if (typeof value === "string")
        return value.split(",").map((item) => item.trim());
    return [clone(value)];
}
function scalarText(value) { return String(value).trim(); }
function usesMultiInput(definition, operator) {
    return MULTI_OPERATORS.has(operator.name) && definition.type !== "TIME" &&
        ["STRING", "INTEGER", "SELECT", "AUTOCOMPLETE"].includes(operator.type);
}
function optionLabel(option) {
    return String(option.label ?? option.description ?? option.name ?? option.value ?? option.id ?? option.profileInputOptionId ?? "");
}
function usesDefaultScalarAutocompleteMapper(definition) {
    const columnId = definition.columnId;
    return typeof columnId === "string" &&
        (columnId.startsWith("EVENT_PARAMS.") || columnId.startsWith("SC_EVENT_PARAMS."));
}
export class DefinitionCatalog {
    definitions;
    context;
    entries;
    constructor(definitions, context = {}) {
        if (context.timeZone !== undefined && moment.tz.zone(context.timeZone) === null) {
            throw new SegmentSdkError(`${context.timeZone} is not a valid IANA time zone.`);
        }
        if (context.groupType !== undefined && !["DYNAMIC", "PARAMETRIC"].includes(context.groupType)) {
            throw new SegmentSdkError(`${String(context.groupType)} is not a supported frontend group type.`);
        }
        if (context.enabledFeatures !== undefined && Object.values(context.enabledFeatures).some((value) => typeof value !== "boolean")) {
            throw new SegmentSdkError("uiContext.enabledFeatures must contain resolved boolean decisions.");
        }
        if (context.requireResolvedFeatures !== undefined && typeof context.requireResolvedFeatures !== "boolean") {
            throw new SegmentSdkError("uiContext.requireResolvedFeatures must be a boolean.");
        }
        if (context.scEventDateValidPeriodDays !== undefined &&
            (!Number.isSafeInteger(context.scEventDateValidPeriodDays) || context.scEventDateValidPeriodDays < 0)) {
            throw new SegmentSdkError("uiContext.scEventDateValidPeriodDays must be a non-negative integer.");
        }
        if (context.mobilePushApplicationIds !== undefined &&
            context.mobilePushApplicationIds.some((id) => typeof id !== "string" && typeof id !== "number")) {
            throw new SegmentSdkError("uiContext.mobilePushApplicationIds must contain only string or number IDs.");
        }
        this.entries = Object.freeze(flattenDefinitions(definitions));
        this.definitions = Object.freeze(this.entries.map((entry) => entry.definition));
        this.context = clone(context);
    }
    resolve(selector, family, context = {}) {
        const candidates = this.entries.filter(({ definition, eventIdentities }) => {
            if (definition.isSupported === false || !familyMatches(definition, family))
                return false;
            if (selector.columnId !== undefined && definition.columnId !== selector.columnId)
                return false;
            if (selector.profileInputId !== undefined && definition.profileInputMetadata?.profileInputId !== selector.profileInputId)
                return false;
            if (selector.type !== undefined && definition.type !== selector.type)
                return false;
            if (selector.columnId?.startsWith("EVENT_PARAMS") && context.event !== undefined) {
                return eventIdentities?.some((identity) => scalarEquals(identity, context.event)) ?? false;
            }
            return selector.columnId !== undefined || selector.profileInputId !== undefined;
        });
        if (candidates.length === 0) {
            throw new SegmentSdkError("Condition definition was not found or is unsupported.", [
                issue("DEFINITION_NOT_FOUND", `No supported definition matches ${JSON.stringify(selector)}.`),
            ]);
        }
        const unique = new Map(candidates.map(({ definition }) => [
            `${definition.columnId ?? "profile"}:${definition.profileInputMetadata?.profileInputId ?? ""}:${definition.type}:${definition.conditionType ?? ""}`,
            definition,
        ]));
        if (unique.size > 1) {
            throw new SegmentSdkError("Condition definition is ambiguous.", [
                issue("DEFINITION_AMBIGUOUS", `More than one supported definition matches ${JSON.stringify(selector)}; add type.`),
            ]);
        }
        return clone([...unique.values()][0]);
    }
    resolveColumn(columnId, family, context = {}) {
        return this.resolve({ columnId }, family, context);
    }
    resolveOperator(definition, operatorName) {
        const operator = definition.operators?.find((item) => item.name === operatorName && item.isSupported !== false);
        if (operator === undefined) {
            throw new SegmentSdkError("Operator is not available for the selected definition.", [
                issue("OPERATOR_NOT_SUPPORTED", `Operator ${operatorName} is not supported by ${definition.columnId ?? `profileInputId ${definition.profileInputMetadata?.profileInputId}`}.`),
            ]);
        }
        // These aggregate editors use minute datetimes even when the live catalog
        // advertises DATE controls for their absolute bounds.
        const aggregateDate = (definition.columnId === "SC_EVENT_DATE" && definition.conditionType === "AGGREGATED_SC") ||
            (definition.columnId === "ACTIVITY_DATE" && ["AGGREGATED_ACTIVITY", "AGGREGATED_CONTACT_ACTIVITY", "AGGREGATED_WIDGET_ACTIVITY"].includes(definition.conditionType ?? ""));
        if (aggregateDate && definition.type === "DATETIME" && operator.type === "DATE" &&
            ["GREATER_THAN_OR_EQUAL", "LESS_THAN_OR_EQUAL"].includes(operator.name)) {
            return { ...clone(operator), type: "DATETIME" };
        }
        return clone(operator);
    }
    toColumn(definition, operator) {
        if (definition.columnId != null) {
            return {
                columnId: definition.columnId,
                type: definition.type,
                profileInputId: null,
            };
        }
        const profileInputId = definition.profileInputMetadata?.profileInputId;
        if (profileInputId === undefined)
            throw new SegmentSdkError("Definition has neither columnId nor profileInputId.");
        return { columnId: null, type: definition.type, profileInputId };
    }
    findOption(definition, value) {
        return [...(definition.options ?? []), ...(definition.profileInputMetadata?.options ?? [])].find((option) => option.isSupported !== false && [option.id, definition.profileInputMetadata != null ? option.profileInputOptionId : undefined, option.value, option.name, option.label, option.description]
            .some((candidate) => scalarEquals(candidate, value)));
    }
    optionStoredValue(definition, value, preference = "value") {
        const option = this.findOption(definition, value);
        if (option === undefined)
            return value;
        const preferred = preference === "id" ? option.id : option.value;
        const fallback = preference === "id" ? option.value : (option.id ?? option.profileInputOptionId);
        return (preferred ?? fallback ?? option.profileInputOptionId ?? option.name ?? option.label ?? option.description ?? value);
    }
    optionUiValue(definition, value, multiple = false) {
        const option = this.findOption(definition, value);
        if (option === undefined)
            return multiple ? value : String(value);
        // Standard catalog options carry placeholder profile IDs, commonly zero.
        const profileOptionId = definition.profileInputMetadata != null ? option.profileInputOptionId : undefined;
        const raw = profileOptionId ?? option.value ?? option.id ?? option.name ?? option.label ?? option.description ?? value;
        return multiple ? raw : String(raw);
    }
    parameterType(condition, family, context = {}) {
        const definition = this.resolve({ columnId: condition.column.columnId ?? undefined, profileInputId: condition.column.profileInputId ?? undefined, type: condition.column.type ?? undefined }, family, context);
        const control = PARAMETER_TYPES[this.resolveOperator(definition, condition.operator).type];
        if (control === undefined)
            throw new SegmentSdkError("This frontend control does not support a schema parameter.");
        return control;
    }
    createSimpleCondition(selector, operatorName, value, options = {}) {
        const definition = this.resolve(selector, options.family, options.context);
        const operator = this.resolveOperator(definition, operatorName);
        const normalized = options.valueMode === "stored"
            ? { value: value, label: options.label }
            : this.normalizeValue(definition, operator, value, options);
        const condition = { column: this.toColumn(definition, operator), operator: operator.name, negation: options.negated ?? false, isValid: true };
        if (normalized.value !== undefined)
            condition.value = normalized.value;
        if (normalized.label !== undefined)
            condition.label = normalized.label;
        return condition;
    }
    validateSimpleCondition(condition, path, family, context = {}) {
        const issues = [];
        let definition;
        let operator;
        try {
            definition = this.resolve({ columnId: condition.column.columnId ?? undefined, profileInputId: condition.column.profileInputId ?? undefined, type: condition.column.type ?? undefined }, family, context);
            operator = this.resolveOperator(definition, condition.operator);
        }
        catch (error) {
            if (error instanceof SegmentSdkError)
                return error.issues.map((entry) => ({ ...entry, path }));
            throw error;
        }
        this.validateFeatureDecision(definition, path, issues);
        const value = condition.value;
        if (operator.type === "VOID") {
            if (value != null && value !== "")
                issues.push(issue("VOID_OPERATOR_HAS_VALUE", `${condition.operator} must not carry a value.`, `${path}.value`));
            return issues;
        }
        if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
            issues.push(issue("VALUE_REQUIRED", `${condition.operator} requires a value.`, `${path}.value`));
            return issues;
        }
        if (typeof value === "string" && /^\$\{[A-Za-z]+\}$/.test(value)) {
            if (this.context.groupType !== "PARAMETRIC")
                issues.push(issue("PARAMETER_NOT_ALLOWED", "Schema parameters are available only in PARAMETRIC groups.", `${path}.value`));
            if (PARAMETER_TYPES[operator.type] === undefined)
                issues.push(issue("PARAMETER_CONTROL_NOT_SUPPORTED", `${operator.type} is not a parameter-capable frontend control.`, `${path}.value`));
            return issues;
        }
        this.validateValueShape(definition, operator, condition, path, issues);
        this.validateOptions(definition, operator, value, path, issues);
        return issues;
    }
    normalizeValue(definition, operator, value, options) {
        if (operator.type === "VOID")
            return { label: options.label };
        const parameter = parameterName(value);
        if (parameter !== undefined) {
            if (!options.allowParameter || this.context.groupType !== "PARAMETRIC") {
                throw new SegmentSdkError("Schema parameters are available only while creating a condition in a PARAMETRIC group.", [issue("PARAMETER_NOT_ALLOWED", "Use a literal value, or create the condition in PARAMETRIC group context.")]);
            }
            if (!/^[A-Za-z]+$/.test(parameter))
                throw new SegmentSdkError("Parameter names may contain Latin letters only.");
            if (PARAMETER_TYPES[operator.type] === undefined)
                throw new SegmentSdkError(`${operator.type} is not a parameter-capable frontend control.`);
            return { value: `\${${parameter}}`, label: options.label };
        }
        if (value === undefined)
            return { label: options.label };
        if (usesMultiInput(definition, operator) && typeof value === "object" && value !== null && !Array.isArray(value)) {
            throw new SegmentSdkError(`${definition.columnId ?? "This condition"} requires a flat multi-value selection.`, [
                issue("MULTI_VALUE_ARRAY_REQUIRED", "Pass an array or comma-separated scalar values; backend wrapper objects are not valid SDK intent."),
            ]);
        }
        let next = clone(value);
        let label = options.label;
        const customField = definition.profileInputMetadata != null;
        if (operator.type === "DATETIME")
            next = customField ? scalarText(next) : this.toUtcDateTime(next);
        else if (operator.type === "DATE")
            next = scalarText(next);
        else if (operator.type === "DATE_TIME_RANGE")
            next = asAtoms(next).map((item) => customField ? scalarText(item) : this.toUtcDateTime(item)).join(",");
        else if (operator.type === "RANGE")
            next = asAtoms(next).map(scalarText).join(",");
        else if (definition.type === "TIME") {
            const normalized = this.normalizeTime(next);
            next = normalized.value;
            label ??= normalized.label;
        }
        else if (usesMultiInput(definition, operator)) {
            const values = asAtoms(next);
            next = values.map((item) => this.normalizeListAtom(definition, operator, item));
            if (operator.type === "AUTOCOMPLETE")
                label = this.normalizeAutocompleteLabel(definition, next, label, true);
        }
        else if (["SELECT", "SELECT_DAY", "SELECT_MONTH", "SELECT_YEAR", "SELECT_PERCENT", "CHECKBOX_GROUP"].includes(operator.type)) {
            next = this.optionUiValue(definition, next, false);
        }
        else if (operator.type === "AUTOCOMPLETE") {
            next = definition.columnId === "GROUP" ? Number(next) : scalarText(next);
            label = this.normalizeAutocompleteLabel(definition, next, label, false);
        }
        else if (["STRING", "EMAIL", "TEXT_AREA", "INTEGER", "DOUBLE"].includes(operator.type)) {
            next = scalarText(next);
            if (definition.columnId === "SMS" && next.startsWith("+"))
                next = next.slice(1);
        }
        return { value: next, label };
    }
    normalizeListAtom(definition, operator, value) {
        if (["SELECT", "CHECKBOX_GROUP"].includes(operator.type))
            return this.optionUiValue(definition, value, true);
        if (operator.type === "AUTOCOMPLETE" && definition.columnId === "GROUP")
            return Number(value);
        if (["STRING", "INTEGER", "AUTOCOMPLETE"].includes(operator.type))
            return scalarText(value);
        return clone(value);
    }
    normalizeAutocompleteLabel(definition, value, label, multiple) {
        if (label !== undefined) {
            if (definition.columnId === "GROUP" || ACTIVITY_MESSAGE_COLUMNS.has(definition.columnId ?? "")) {
                if (typeof label !== "string")
                    throw new SegmentSdkError(`${definition.columnId} requires its autocomplete selection label as JSON.`);
                try {
                    JSON.parse(label);
                }
                catch {
                    throw new SegmentSdkError(`${definition.columnId} requires its autocomplete selection label as JSON.`);
                }
            }
            return label;
        }
        const values = Array.isArray(value) ? value : [value];
        const matched = values.map((item) => this.findOption(definition, item));
        if (matched.every((item) => item !== undefined)) {
            const selections = matched.map((item, index) => ({ value: values[index], label: optionLabel(item) }));
            return definition.columnId === "GROUP" || ACTIVITY_MESSAGE_COLUMNS.has(definition.columnId ?? "")
                ? JSON.stringify(selections) : (multiple ? JSON.stringify(selections) : selections[0].label);
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
            if (previous !== undefined && hour < previous)
                hour += 24;
            if (start === undefined)
                start = hour;
            if ((previous !== undefined && hour - previous > 1) || last) {
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
        if (["STRING", "EMAIL", "TEXT_AREA"].includes(operator.type) && !usesMultiInput(definition, operator) && typeof value !== "string")
            issues.push(issue("VALUE_TYPE", `${operator.type} requires a string value.`, `${path}.value`));
        if (NUMBER_TYPES.has(operator.type)) {
            if (values.some((item) => typeof item === "boolean" || !Number.isFinite(Number(item))))
                issues.push(issue("VALUE_TYPE", `${operator.type} requires numeric value(s).`, `${path}.value`));
            if (operator.type === "INTEGER" && values.some((item) => !Number.isInteger(Number(item))))
                issues.push(issue("INTEGER_REQUIRED", "The frontend integer control rejects decimal values.", `${path}.value`));
        }
        if (operator.type === "BOOLEAN" && ![true, false, "true", "false"].includes(value))
            issues.push(issue("VALUE_TYPE", "BOOLEAN requires true or false.", `${path}.value`));
        if (typeof value === "string" && !["DATETIME", "DATE_TIME_RANGE", "RANGE"].includes(operator.type) && SANITIZE_PATTERN.test(value))
            issues.push(issue("UNSAFE_CHARACTERS", "The value contains characters rejected by the frontend sanitizer.", `${path}.value`));
        if (definition.columnId === "SMS" && (typeof value !== "string" || !/^\d+$/.test(value)))
            issues.push(issue("SMS_FORMAT", "SMS accepts digits only; a leading + is stripped by the frontend.", `${path}.value`));
        if (operator.type === "RANGE") {
            const atoms = typeof value === "string" ? value.split(",") : [];
            const numbers = atoms.map(Number);
            if (atoms.length !== 2 || numbers.some((item) => !Number.isFinite(item)))
                issues.push(issue("VALUE_TYPE", "RANGE requires exactly two numeric values.", `${path}.value`));
            else {
                const custom = definition.groupType === "CUSTOM";
                if (!custom && numbers.some((item) => !Number.isInteger(item) || item < 0))
                    issues.push(issue("RANGE_INTEGER", "Standard frontend ranges use non-negative integers.", `${path}.value`));
                if (numbers[1] <= numbers[0])
                    issues.push(issue("RANGE_ORDER", "Range end must be greater than range start.", `${path}.value`));
            }
        }
        if (operator.type === "DATETIME" && (typeof value !== "string" || !moment(value, DATE_TIME_FORMAT, true).isValid()))
            issues.push(issue("VALUE_TYPE", `DATETIME requires ${DATE_TIME_FORMAT}.`, `${path}.value`));
        if (operator.type === "DATE" && (typeof value !== "string" || !moment(value, DATE_FORMAT, true).isValid()))
            issues.push(issue("VALUE_TYPE", `DATE requires ${DATE_FORMAT}.`, `${path}.value`));
        if (operator.type === "DATE_TIME_RANGE") {
            const dates = typeof value === "string" ? value.split(",").map((item) => moment(item.trim(), DATE_TIME_FORMAT, true)) : [];
            if (dates.length !== 2 || dates.some((item) => !item.isValid()))
                issues.push(issue("VALUE_TYPE", `DATE_TIME_RANGE requires two ${DATE_TIME_FORMAT} values.`, `${path}.value`));
        }
        if (definition.type === "TIME") {
            if (!Array.isArray(value) || value.length === 0 || value.some((item) => !Number.isInteger(Number(item)) || Number(item) < 0 || Number(item) > 23))
                issues.push(issue("TIME_RANGE", "TIME requires one or more UTC hours from 0 through 23.", `${path}.value`));
            if (typeof condition.label !== "string")
                issues.push(issue("TIME_LABEL_REQUIRED", "TIME requires the frontend display-hours label.", `${path}.label`));
        }
        if (usesMultiInput(definition, operator) && !SYSTEM_COMMA_COLUMNS.has(definition.columnId ?? "") && !Array.isArray(value)) {
            issues.push(issue("VALUE_TYPE", `${operator.name} stores an array in UI JSON.`, `${path}.value`));
        }
        if (operator.type === "AUTOCOMPLETE" && (definition.requestURL != null || operator.requestURL != null)) {
            if (typeof condition.label !== "string" || condition.label.trim() === "")
                issues.push(issue("AUTOCOMPLETE_LABEL_REQUIRED", "Autocomplete selections require the display label returned by the frontend lookup.", `${path}.label`));
            if ((definition.columnId === "GROUP" || ACTIVITY_MESSAGE_COLUMNS.has(definition.columnId ?? "")) && typeof condition.label === "string") {
                try {
                    const parsed = JSON.parse(condition.label);
                    if (!Array.isArray(parsed))
                        throw new Error("not an array");
                    if (definition.columnId === "GROUP") {
                        const selected = Array.isArray(value) ? value : [value];
                        const labelsValid = parsed.every((item) => typeof item === "object" && item !== null &&
                            "value" in item && "label" in item && typeof item.label === "string");
                        const labelValues = parsed.map((item) => item.value);
                        if (!labelsValid || selected.length !== labelValues.length || selected.some((item) => !labelValues.some((candidate) => scalarEquals(item, candidate)))) {
                            throw new Error("selection mismatch");
                        }
                    }
                    else if (!parsed.every((item) => typeof item === "object" && item !== null && typeof item.selectedOption === "string")) {
                        throw new Error("missing selectedOption");
                    }
                }
                catch {
                    issues.push(issue("AUTOCOMPLETE_LABEL_FORMAT", `${definition.columnId} stores matching selection metadata as a JSON array.`, `${path}.label`));
                }
            }
        }
        if (/STREAK$/.test(operator.name) && Number(value) < 2)
            issues.push(issue("VALUE_MIN", "Streak duration must be at least 2.", `${path}.value`));
        if (["REGULAR_DATE", "DATE", "DATETIME"].includes(definition.type) && NUMBER_TYPES.has(operator.type) && Number(value) < 1)
            issues.push(issue("VALUE_MIN", "Date duration must be at least 1.", `${path}.value`));
        this.validateSyntheticSelect(operator, value, definition, path, issues);
        const metadata = definition.profileInputMetadata;
        const properties = metadata?.controlTypeProperties ?? definition.controlTypeProperties;
        if (NUMBER_TYPES.has(operator.type) && properties !== undefined) {
            const numeric = Number(values[0]);
            const min = Number(properties.MIN_VALUE ?? properties.minValue);
            const max = Number(properties.MAX_VALUE ?? properties.maxValue);
            if (Number.isFinite(min) && numeric < min)
                issues.push(issue("VALUE_MIN", `Value must be at least ${min}.`, `${path}.value`));
            if (Number.isFinite(max) && numeric > max)
                issues.push(issue("VALUE_MAX", `Value must be at most ${max}.`, `${path}.value`));
        }
    }
    validateSyntheticSelect(operator, value, definition, path, issues) {
        const number = Number(value);
        if (operator.type === "SELECT_DAY" && (!Number.isInteger(number) || number < 1 || number > 31))
            issues.push(issue("OPTION_NOT_AVAILABLE", "Day must be from 1 through 31.", `${path}.value`));
        if (operator.type === "SELECT_MONTH" && (!Number.isInteger(number) || number < 1 || number > 12))
            issues.push(issue("OPTION_NOT_AVAILABLE", "Month must be from 1 through 12.", `${path}.value`));
        if (operator.type === "SELECT_PERCENT" && (!Number.isInteger(number) || number < 1 || number > 100))
            issues.push(issue("OPTION_NOT_AVAILABLE", "Percent must be from 1 through 100.", `${path}.value`));
        if (operator.type === "SELECT_YEAR") {
            const current = moment().year();
            const short = SHORT_YEAR_COLUMNS.has(definition.columnId ?? "");
            const min = short ? 2011 : current - 80;
            const max = short ? current : current + 5;
            if (!Number.isInteger(number) || number < min || number > max)
                issues.push(issue("OPTION_NOT_AVAILABLE", `Year must be from ${min} through ${max}.`, `${path}.value`));
        }
    }
    validateOptions(definition, operator, value, path, issues) {
        const options = [...(definition.options ?? []), ...(definition.profileInputMetadata?.options ?? [])];
        if (options.length === 0 || operator.requestURL != null || definition.requestURL != null || !["SELECT", "CHECKBOX_GROUP"].includes(operator.type))
            return;
        const atoms = SYSTEM_COMMA_COLUMNS.has(definition.columnId ?? "") && typeof value === "string"
            ? value.split(",").map((item) => item.trim())
            : Array.isArray(value) ? value : [value];
        for (const atom of atoms) {
            const option = this.findOption(definition, atom);
            const unavailable = option === undefined || (operator.name !== "ONE_OF" && option.inUse === false) || (operator.type === "CHECKBOX_GROUP" && option.inUse === false);
            if (unavailable)
                issues.push(issue("OPTION_NOT_AVAILABLE", `${JSON.stringify(atom)} is not an available option of ${definition.columnId}.`, `${path}.value`));
        }
    }
    validateFeatureDecision(definition, path, issues) {
        if (definition.categoryType !== "LOCATION")
            return;
        const decision = this.context.enabledFeatures?.GEOMARKETING_UI;
        if (decision === false)
            issues.push(issue("FEATURE_NOT_AVAILABLE", "Location conditions are hidden by the frontend organization configuration.", path));
        if (decision === undefined && this.context.requireResolvedFeatures === true)
            issues.push(issue("FEATURE_CONTEXT_REQUIRED", "GEOMARKETING_UI must be resolved to validate location UI availability.", path));
    }
    toUtcDateTime(value) {
        const text = scalarText(value);
        const parsed = moment.tz(text, DATE_TIME_FORMAT, true, this.context.timeZone ?? "UTC");
        return parsed.isValid() ? parsed.utc().format(DATE_TIME_FORMAT) : text;
    }
}
//# sourceMappingURL=definitionCatalog.js.map