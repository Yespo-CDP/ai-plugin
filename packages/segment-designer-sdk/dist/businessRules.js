import moment from "moment-timezone";
import { inferFamily, REQUIRED_COLUMNS } from "./conditionFactory.js";
import { issue } from "./errors.js";
const SC_RULES = new Map([
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
    ["SC_RECALL", { supportedEvents: ["Possible buyers", "Possible visitors"] }],
]);
const SC_PREDICTION_IDS = new Set(["SC_PURCHASE_PROBABILITY", "SC_CHURN_PROBABILITY"]);
const SC_PREDICTED_BUYER_IDS = new Set(["SURE_BUYERS", "POTENTIAL_BUYERS", "UNLIKELY_BUYERS", "UNDECIDED_BUYERS", "SC_RECALL"]);
const SC_SPECIAL_PERIODS = new Map([
    ["Probability", 90],
    ["Possible buyers", 30],
    ["Possible visitors", 7],
]);
const CA_SUPPORT = new Map([
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
    ["ACTIVITY_URL", ["COUNT_CLICKED"]],
]);
const CA_ALWAYS = new Set([
    "ACTIVITY_MESSAGE_TYPE",
    "ACTIVITY_TAG",
    "ACTIVITY_MESSAGE_ID",
    "ACTIVITY_CALLOUT_ID",
    "ACTIVITY_IMCALLOUT_ID",
    "ACTIVITY_WORKFLOW_ID",
    "ACTIVITY_SUBSCRIPTION_CATEGORY_ID",
    "ACTIVITY_STRATEGY_GROUPID",
    "ACTIVITY_EMAIL_DOMAIN",
]);
const WIDGET_SUPPORT = new Map([
    ["ACTIVITY_COUNT", ["COUNT_OPENED", "COUNT_CLICKED"]],
    ["ACTIVITY_CTOR", ["COUNT_CLICKED"]],
    ["ACTIVITY_WIDGET_TYPE", ["COUNT_OPENED", "COUNT_CLICKED"]],
    ["ACTIVITY_LANGUAGE", ["COUNT_OPENED", "COUNT_CLICKED"]],
    ["ACTIVITY_MESSAGE_ID", ["COUNT_OPENED", "COUNT_CLICKED"]],
]);
const ALL_MESSAGE_EVENTS = new Set([
    "COUNT_SENT", "COUNT_DELIVERED", "COUNT_FAILED", "COUNT_OPENED", "COUNT_CLICKED",
    "COUNT_UNSUBSCRIBED", "COUNT_UNSENT", "COUNT_SPAM",
]);
const MEDIA_EVENT_SUPPORT = new Map([
    ["EMAIL", ALL_MESSAGE_EVENTS],
    ["SMS", ALL_MESSAGE_EVENTS],
    ["WEB_PUSH", ALL_MESSAGE_EVENTS],
    ["MOBILE_PUSH", ALL_MESSAGE_EVENTS],
    ["VIBER", ALL_MESSAGE_EVENTS],
    ["PULL", ALL_MESSAGE_EVENTS],
    ["PLUTO", ALL_MESSAGE_EVENTS],
    ["TELEGRAM_BOT", new Set(["COUNT_SENT", "COUNT_CLICKED", "COUNT_DELIVERED", "COUNT_FAILED"])],
    ["IN_APP", new Set(["COUNT_OPENED", "COUNT_CLICKED", "COUNT_FAILED"])],
]);
const ACTIVITY_OCCURRENCE_COLUMNS = new Set([
    "ACTIVITY_COUNT",
    "ACTIVITY_CTOR",
    "ACTIVITY_CTR",
    "ACTIVITY_OPEN_RATE",
    "ACTIVITY_DELIVERY_RATE",
    "ACTIVITY_RESPONSE_MINUTES",
]);
const ACTIVITY_MESSAGE_COLUMNS = new Set(["ACTIVITY_MESSAGE_ID", "ACTIVITY_CALLOUT_ID", "ACTIVITY_IMCALLOUT_ID"]);
const DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm";
function isSimple(value) {
    return "column" in value;
}
function isAggregate(value) {
    return "aggregate" in value;
}
function columnIds(condition) {
    return condition.aggregate.conditions
        .map((criterion) => criterion.column.columnId)
        .filter((value) => typeof value === "string");
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
    if (explicit !== undefined)
        return explicit.some((id) => String(id) === String(value));
    return Boolean(catalog.findOption(definition, value)?.index);
}
function validateSc(condition, catalog, path) {
    const issues = [];
    const events = eventValues(condition, "SC_EVENT_NAME");
    const specialEvents = events.filter((event) => SC_SPECIAL_PERIODS.has(event));
    if (specialEvents.length > 0 && events.length !== 1) {
        issues.push(issue("SC_SPECIAL_EVENT_MUST_BE_SINGLE", "Probability and possible-buyer/visitor selections are single-event choices in the frontend.", path));
    }
    const optional = condition.aggregate.conditions.filter((criterion) => !["SC_EVENT_NAME", "SC_EVENT_DATE"].includes(criterion.column.columnId ?? ""));
    if (specialEvents.length === 1 && optional.length === 0) {
        issues.push(issue("SC_SPECIAL_CRITERION_REQUIRED", `${specialEvents[0]} has no All option; choose one criterion offered by the frontend.`, path));
    }
    for (const [index, criterion] of condition.aggregate.conditions.entries()) {
        const id = criterion.column.columnId;
        if (typeof id !== "string" || id === "SC_EVENT_NAME" || id === "SC_EVENT_DATE")
            continue;
        if (events[0] === "Probability" && !SC_PREDICTION_IDS.has(id)) {
            issues.push(issue("SC_CRITERION_EVENT_MISMATCH", `${id} is not offered for Probability.`, `${path}.aggregate.conditions[${index}]`));
        }
        else if (["Possible buyers", "Possible visitors"].includes(events[0]) && !SC_PREDICTED_BUYER_IDS.has(id)) {
            issues.push(issue("SC_CRITERION_EVENT_MISMATCH", `${id} is not offered for ${events[0]}.`, `${path}.aggregate.conditions[${index}]`));
        }
        else if (!SC_SPECIAL_PERIODS.has(events[0]) && (SC_PREDICTION_IDS.has(id) || SC_PREDICTED_BUYER_IDS.has(id))) {
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
            }
            catch {
                definition = undefined;
            }
            const allowed = (definition?.group === "Product" && id === "SC_CATEGORY_KEY") || definition?.group === "Auditory";
            if (!allowed)
                issues.push(issue("SC_CATEGORY_PAGE_CRITERION", `${id} is outside the CategoryPage-only Product/Auditory menu.`, `${path}.aggregate.conditions[${index}]`));
        }
        const rule = SC_RULES.get(id);
        if (rule?.supportedEvents !== undefined && !events.some((event) => rule.supportedEvents?.includes(event))) {
            issues.push(issue("SC_CRITERION_EVENT_MISMATCH", `${id} is not available for event ${events.join(", ")}.`, `${path}.aggregate.conditions[${index}]`));
        }
        if (rule?.unsupportedEvents !== undefined && events.length > 0 &&
            events.every((event) => rule.unsupportedEvents?.includes(event))) {
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
        const specialPeriod = events.length === 1 ? SC_SPECIAL_PERIODS.get(events[0]) : undefined;
        if (specialPeriod !== undefined && (date.operator !== "NEXT_DAYS" || Number(date.value) !== specialPeriod)) {
            issues.push(issue("SC_SPECIAL_PERIOD_FIXED", `${events[0]} uses the frontend's fixed NEXT_DAYS ${specialPeriod} period.`, `${path}.aggregate.conditions[${index + 1}]`));
        }
        if (specialPeriod === undefined && date.operator === "NEXT_DAYS") {
            issues.push(issue("SC_NEXT_DAYS_NOT_AVAILABLE", "NEXT_DAYS is offered only for predictive SoftCube events.", `${path}.aggregate.conditions[${index + 1}]`));
        }
    }
    const validDays = Number.isFinite(catalog.context.scEventDateValidPeriodDays)
        ? Math.max(0, Number(catalog.context.scEventDateValidPeriodDays))
        : 60;
    if (typeof from === "string" && typeof to === "string" && !isAllTime) {
        const start = moment(from, DATE_TIME_FORMAT, true);
        const end = moment(to, DATE_TIME_FORMAT, true);
        if (start.isValid() && end.isValid()) {
            if (start.isAfter(end)) {
                issues.push(issue("SC_PERIOD_ORDER", "SoftCube period start must not be after its end.", path));
            }
            else if (end.diff(start, "minutes", true) > validDays * 24 * 60) {
                issues.push(issue("SC_PERIOD_TOO_LONG", `SoftCube custom period cannot exceed ${validDays} days.`, path));
            }
        }
    }
    for (const [index, date] of dates.entries()) {
        if (events.length === 1 && SC_SPECIAL_PERIODS.has(events[0]))
            continue;
        if (typeof date.value !== "number" && typeof date.value !== "string")
            continue;
        const numeric = Number(date.value);
        if (!Number.isFinite(numeric))
            continue;
        const maximum = date.operator.includes("WEEKS")
            ? Math.floor(validDays / 7)
            : date.operator.includes("HOURS")
                ? Math.floor(validDays * 24)
                : validDays;
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
    if (dateId !== undefined && ids.includes("EVENT_COUNT")) {
        issues.push(issue("EVENT_COUNT_WITH_FIRST_OR_LAST", "EVENT_COUNT is not offered for first/last-event date modes.", path));
    }
    const eventValue = condition.aggregate.conditions.find((criterion) => criterion.column.columnId === "EVENT_TYPE_ID")?.value;
    let eventDefinition;
    try {
        eventDefinition = catalog.resolveColumn("EVENT_TYPE_ID", "AGGREGATED_CUSTOM_EVENTS");
    }
    catch {
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
    const managed = family === "AGGREGATED_WIDGET_ACTIVITY"
        ? new Set(["ACTIVITY_EVENT_ID", "ACTIVITY_DATE", "ACTIVITY_MEDIA_TYPE"])
        : new Set(["ACTIVITY_EVENT_ID", "ACTIVITY_DATE"]);
    if (!condition.aggregate.conditions.some((criterion) => !managed.has(criterion.column.columnId ?? ""))) {
        issues.push(issue("ACTIVITY_CRITERION_REQUIRED", "The activity frontend has no All option; select at least one activity criterion.", path));
    }
    for (const [index, criterion] of condition.aggregate.conditions.entries()) {
        const id = criterion.column.columnId;
        if (typeof id !== "string" || ["ACTIVITY_EVENT_ID", "ACTIVITY_DATE"].includes(id))
            continue;
        if (family === "AGGREGATED_WIDGET_ACTIVITY" && id === "ACTIVITY_MEDIA_TYPE" && criterion.value === "WIDGET")
            continue;
        const supportedEvents = supportMap.get(id);
        if (supportedEvents === undefined && !(family === "AGGREGATED_ACTIVITY" && CA_ALWAYS.has(id))) {
            issues.push(issue("ACTIVITY_CRITERION_NOT_OFFERED", `${id} is not offered by the ${family} frontend menu.`, `${path}.aggregate.conditions[${index}]`));
        }
        else if (supportedEvents !== undefined && !events.some((event) => supportedEvents.includes(event))) {
            issues.push(issue("ACTIVITY_CRITERION_EVENT_MISMATCH", `${id} is not supported by event ${events.join(", ")}.`, `${path}.aggregate.conditions[${index}]`));
        }
        if (family === "AGGREGATED_ACTIVITY" && id === "ACTIVITY_MEDIA_TYPE") {
            const mediaValues = String(criterion.value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
            for (const media of mediaValues) {
                const supported = MEDIA_EVENT_SUPPORT.get(media);
                if (supported !== undefined && events.some((event) => !supported.has(event))) {
                    issues.push(issue("ACTIVITY_MEDIA_EVENT_MISMATCH", `${media} does not support every selected activity event.`, `${path}.aggregate.conditions[${index}]`));
                }
            }
        }
        if (ACTIVITY_MESSAGE_COLUMNS.has(id ?? "") && typeof criterion.label === "string") {
            try {
                const selections = JSON.parse(criterion.label);
                if (!Array.isArray(selections))
                    throw new Error("not an array");
                for (const selection of selections) {
                    const media = typeof selection?.selectedOption === "string" ? selection.selectedOption : undefined;
                    if (media === undefined)
                        continue;
                    const supported = media === undefined ? undefined : MEDIA_EVENT_SUPPORT.get(media);
                    if (supported === undefined || events.some((event) => !supported.has(event))) {
                        issues.push(issue("ACTIVITY_MEDIA_EVENT_MISMATCH", "The autocomplete media type in the stored label is not offered for every selected event.", `${path}.aggregate.conditions[${index}].label`));
                    }
                }
            }
            catch {
                // The common autocomplete validator reports malformed label JSON.
            }
        }
    }
    if (family === "AGGREGATED_WIDGET_ACTIVITY" && events.some((event) => !["COUNT_OPENED", "COUNT_CLICKED"].includes(event))) {
        issues.push(issue("WIDGET_EVENT_NOT_AVAILABLE", "Widget activity only offers COUNT_OPENED and COUNT_CLICKED.", path));
    }
    const occurrenceCount = columnIds(condition).filter((id) => ACTIVITY_OCCURRENCE_COLUMNS.has(id)).length;
    if (occurrenceCount > 1) {
        issues.push(issue("ACTIVITY_OCCURRENCE_MUTUALLY_EXCLUSIVE", "The activity editor offers count/rate/response occurrence controls as one mutually exclusive choice.", path));
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
    }
    catch {
        return issues;
    }
    if (mobile && condition.aggregate.conditions.every((criterion) => criterion.column.columnId === "PUSH_APPLICATION_ID")) {
        issues.push(issue("MOBILE_PUSH_CRITERION_REQUIRED", "Mobile push has no All option; select at least one nested criterion.", path));
    }
    const forbidden = mobile
        ? new Set(["PUSH_BROWSER"])
        : new Set(["PUSH_APP_VERSION", "PUSH_DEVICE_MODEL", "PUSH_TOKEN"]);
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
            }
            catch {
                // The definition validator reports missing/unsupported definitions separately.
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
    const prefixes = new Set(condition.aggregate.conditions
        .map((criterion) => criterion.column.columnId)
        .filter((id) => typeof id === "string")
        .map((id) => id.split(".")[0]));
    if (prefixes.size > 1)
        issues.push(issue("CUSTOMER_DATA_SOURCE_MISMATCH", "All criteria in one CUSTOMER_DATA aggregate must come from the same data source.", path));
    condition.aggregate.conditions.forEach((criterion, index) => {
        try {
            const definition = catalog.resolve({ columnId: criterion.column.columnId ?? undefined, profileInputId: criterion.column.profileInputId ?? undefined, type: criterion.column.type ?? undefined }, "AGGREGATED_CUSTOMER_DATA");
            if (definition.categoryType != null && criterion.label !== definition.categoryType) {
                issues.push(issue("CUSTOMER_DATA_LABEL", `Customer-data mapper stores ${definition.categoryType} as the condition label.`, `${path}.aggregate.conditions[${index}].label`));
            }
        }
        catch {
            // The common definition validator reports the missing definition.
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
        AGGREGATED_CUSTOMER_LIFECYCLE: "LIFECYCLE_SCHEMA_ID",
    };
    const first = firstByFamily[family];
    if (first !== undefined && ids[0] !== first) {
        issues.push(issue("SYSTEM_CRITERION_ORDER", `${first} must be first, as emitted by the frontend external mapper.`, `${path}.aggregate.conditions`));
    }
    const ensureDatePrefix = (dateId, maximum) => {
        const indices = ids.flatMap((id, index) => id === dateId ? [index] : []);
        if (indices.length > maximum || indices.some((index, offset) => index !== offset + 1)) {
            issues.push(issue("SYSTEM_CRITERION_ORDER", `${dateId} conditions must immediately follow the selector in frontend order.`, `${path}.aggregate.conditions`));
        }
    };
    if (family === "AGGREGATED_SC")
        ensureDatePrefix("SC_EVENT_DATE", 2);
    if (family === "AGGREGATED_ACTIVITY" || family === "AGGREGATED_WIDGET_ACTIVITY")
        ensureDatePrefix("ACTIVITY_DATE", 2);
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
    if (events.length === 1 && events[0] === "Probability")
        return SC_PREDICTION_IDS.has(id);
    if (events.length === 1 && ["Possible buyers", "Possible visitors"].includes(events[0]))
        return SC_PREDICTED_BUYER_IDS.has(id);
    if (events.some((event) => SC_SPECIAL_PERIODS.has(event)))
        return false;
    if (SC_PREDICTION_IDS.has(id) || SC_PREDICTED_BUYER_IDS.has(id))
        return false;
    const rule = SC_RULES.get(id);
    if (rule?.supportedEvents !== undefined && !events.some((event) => rule.supportedEvents?.includes(event)))
        return false;
    if (rule?.unsupportedEvents !== undefined && events.length > 0 &&
        events.every((event) => rule.unsupportedEvents?.includes(event)))
        return false;
    return true;
}
function activityCriterionSupported(criterion, family, events) {
    const id = criterion.column.columnId;
    if (typeof id !== "string" || ["ACTIVITY_EVENT_ID", "ACTIVITY_DATE"].includes(id))
        return true;
    if (family === "AGGREGATED_WIDGET_ACTIVITY" && id === "ACTIVITY_MEDIA_TYPE" && criterion.value === "WIDGET")
        return true;
    const supportMap = family === "AGGREGATED_WIDGET_ACTIVITY" ? WIDGET_SUPPORT : CA_SUPPORT;
    const supportedEvents = supportMap.get(id);
    if (supportedEvents === undefined && !(family === "AGGREGATED_ACTIVITY" && CA_ALWAYS.has(id)))
        return false;
    if (supportedEvents !== undefined && !events.some((event) => supportedEvents.includes(event)))
        return false;
    if (family === "AGGREGATED_ACTIVITY" && id === "ACTIVITY_MEDIA_TYPE") {
        const mediaValues = String(criterion.value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
        return mediaValues.every((media) => {
            const supported = MEDIA_EVENT_SUPPORT.get(media);
            return supported === undefined || events.every((event) => supported.has(event));
        });
    }
    return true;
}
/** Apply the same dependent-control pruning performed when an eSNG aggregate selection changes. */
export function reconcileFrontendAggregate(condition, catalog) {
    const family = inferFamily(condition);
    const removed = [];
    let keep = () => true;
    if (family === "AGGREGATED_SC") {
        const events = eventValues(condition, "SC_EVENT_NAME");
        keep = (criterion) => {
            const id = criterion.column.columnId;
            if (typeof id !== "string" || REQUIRED_COLUMNS[family].includes(id))
                return true;
            if (events.length === 1 && events[0] === "CategoryPage") {
                let definition;
                try {
                    definition = catalog.resolveColumn(id, family);
                }
                catch {
                    return false;
                }
                return ((definition.group === "Product" && id === "SC_CATEGORY_KEY") || definition.group === "Auditory") && scCriterionSupported(id, events);
            }
            return scCriterionSupported(id, events);
        };
    }
    else if (family === "AGGREGATED_CUSTOM_EVENTS") {
        const selectedEvent = condition.aggregate.conditions.find((criterion) => criterion.column.columnId === "EVENT_TYPE_ID")?.value;
        let eventDefinition;
        try {
            eventDefinition = catalog.resolveColumn("EVENT_TYPE_ID", family);
        }
        catch {
            eventDefinition = undefined;
        }
        const eventOption = eventDefinition === undefined ? undefined : catalog.findOption(eventDefinition, selectedEvent);
        const parameterIds = new Set((eventOption?.params ?? []).map((definition) => definition.columnId).filter(Boolean));
        const firstOrLast = condition.aggregate.conditions.some((criterion) => criterion.column.columnId === "EVENT_FIRST_DATE" || criterion.column.columnId === "EVENT_LAST_DATE");
        keep = (criterion) => {
            const id = criterion.column.columnId;
            if (id === "EVENT_COUNT" && firstOrLast)
                return false;
            return typeof id !== "string" || !id.includes("EVENT_PARAMS") || parameterIds.has(id);
        };
    }
    else if (family === "AGGREGATED_ACTIVITY" || family === "AGGREGATED_WIDGET_ACTIVITY") {
        const events = eventValues(condition, "ACTIVITY_EVENT_ID");
        keep = (criterion) => activityCriterionSupported(criterion, family, events);
    }
    else if (family === "AGGREGATED_PUSH") {
        const selectedApp = condition.aggregate.conditions.find((criterion) => criterion.column.columnId === "PUSH_APPLICATION_ID")?.value;
        let appDefinition;
        try {
            appDefinition = catalog.resolveColumn("PUSH_APPLICATION_ID", family);
        }
        catch {
            appDefinition = undefined;
        }
        const mobile = appDefinition === undefined ? false : isMobilePushApplication(catalog, appDefinition, selectedApp);
        const forbidden = mobile
            ? new Set(["PUSH_BROWSER"])
            : new Set(["PUSH_APP_VERSION", "PUSH_DEVICE_MODEL", "PUSH_TOKEN"]);
        keep = (criterion) => {
            const id = criterion.column.columnId ?? "";
            if (forbidden.has(id))
                return false;
            if (mobile && id === "PUSH_OS") {
                try {
                    const definition = catalog.resolveColumn("PUSH_OS", family);
                    const values = Array.isArray(criterion.value) ? criterion.value : String(criterion.value ?? "").split(",");
                    return values.every((value) => catalog.findOption(definition, value)?.index === 1);
                }
                catch {
                    return true;
                }
            }
            return true;
        };
    }
    else if (family === "AGGREGATED_CUSTOMER_DATA") {
        const first = condition.aggregate.conditions[0]?.column.columnId?.split(".")[0];
        keep = (criterion, index) => index === 0 || first === undefined || criterion.column.columnId?.split(".")[0] === first;
    }
    condition.aggregate.conditions = condition.aggregate.conditions.filter((criterion, index) => {
        const retained = keep(criterion, index);
        if (!retained)
            removed.push(criterion.column.columnId ?? `criterion ${index + 1}`);
        return retained;
    });
    return removed.map((columnId) => issue("UI_DEPENDENCY_RESET", `${columnId} was removed because the controlling aggregate selection no longer offers it.`));
}
function validateAggregate(condition, catalog, path) {
    const issues = [];
    const family = inferFamily(condition);
    const features = catalog.context.enabledFeatures ?? {};
    const requireFeature = (name, relevant) => {
        if (relevant && catalog.context.requireResolvedFeatures === true && features[name] === undefined) {
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
    if (family === "AGGREGATED_CUSTOMER_LIFECYCLE" &&
        features.TMP_SHOW_CUSTOMER_LIFECYCLE_IN_CONTACTS_ANALYTICS === false) {
        issues.push(issue("FEATURE_NOT_AVAILABLE", "Customer lifecycle is hidden by the frontend organization configuration.", path));
    }
    const ids = columnIds(condition);
    issues.push(...validateAggregateOrder(condition, family, path));
    for (const required of REQUIRED_COLUMNS[family]) {
        if (!ids.includes(required))
            issues.push(issue("REQUIRED_CRITERION_MISSING", `${family} requires ${required}.`, path));
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
    const selectedCustomEvent = family === "AGGREGATED_CUSTOM_EVENTS"
        ? condition.aggregate.conditions.find((criterion) => criterion.column.columnId === "EVENT_TYPE_ID")?.value
        : undefined;
    for (const [index, criterion] of condition.aggregate.conditions.entries()) {
        issues.push(...catalog.validateSimpleCondition(criterion, `${path}.aggregate.conditions[${index}]`, family, { event: selectedCustomEvent }));
        if (criterion.originOperator != null) {
            issues.push(issue("DB_FIELD_IN_UI_MODEL", "originOperator is produced by UI-to-DB conversion and is not authored by the frontend editor.", `${path}.aggregate.conditions[${index}].originOperator`));
        }
    }
    if (family === "AGGREGATED_SC")
        issues.push(...validateSc(condition, catalog, path));
    if (family === "AGGREGATED_CUSTOM_EVENTS")
        issues.push(...validateCustomEvent(condition, catalog, path));
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
    if (family === "AGGREGATED_PUSH")
        issues.push(...validatePush(condition, catalog, path));
    if (family === "AGGREGATED_CUSTOMER_DATA")
        issues.push(...validateCustomerData(condition, catalog, path));
    if (features.PRODUCT_EVENTS_VISIBILITY === false) {
        if (family === "AGGREGATED_CUSTOMER_DATA" && condition.aggregate.conditions.some((criterion) => criterion.column.columnId?.split(".")[0].toUpperCase() === "ORDERS")) {
            issues.push(issue("FEATURE_NOT_AVAILABLE", "ORDERS customer-data conditions are hidden when product events are disabled.", path));
        }
        if (family === "AGGREGATED_SC") {
            const eventDefinition = (() => {
                try {
                    return catalog.resolveColumn("SC_EVENT_NAME", family);
                }
                catch {
                    return undefined;
                }
            })();
            const productSelected = eventValues(condition, "SC_EVENT_NAME").some((event) => {
                const option = eventDefinition === undefined ? undefined : catalog.findOption(eventDefinition, event);
                return option?.category === "PRODUCTS_EVENTS" || option?.group === "PRODUCTS_EVENTS";
            });
            if (productSelected)
                issues.push(issue("FEATURE_NOT_AVAILABLE", "Product SoftCube events are hidden when product events are disabled.", path));
        }
    }
    const productVisibilityRelevant = (family === "AGGREGATED_CUSTOMER_DATA" && condition.aggregate.conditions.some((criterion) => criterion.column.columnId?.split(".")[0].toUpperCase() === "ORDERS")) ||
        (family === "AGGREGATED_SC" && (() => {
            let definition;
            try {
                definition = catalog.resolveColumn("SC_EVENT_NAME", family);
            }
            catch {
                return false;
            }
            return eventValues(condition, "SC_EVENT_NAME").some((event) => {
                const option = catalog.findOption(definition, event);
                return option?.category === "PRODUCTS_EVENTS" || option?.group === "PRODUCTS_EVENTS";
            });
        })());
    requireFeature("PRODUCT_EVENTS_VISIBILITY", productVisibilityRelevant);
    return issues;
}
function validateCondition(condition, catalog, path) {
    if (isSimple(condition)) {
        const issues = catalog.validateSimpleCondition(condition, path, inferFamily(condition));
        if (condition.originOperator != null)
            issues.push(issue("DB_FIELD_IN_UI_MODEL", "originOperator is produced by UI-to-DB conversion and is not authored by the frontend editor.", `${path}.originOperator`));
        return issues;
    }
    if (isAggregate(condition)) {
        const issues = validateAggregate(condition, catalog, path);
        if (condition.aggregate.rule != null)
            issues.push(issue("DB_FIELD_IN_UI_MODEL", "aggregate.rule belongs to converted/backend JSON, not frontend UI-mode JSON.", `${path}.aggregate.rule`));
        return issues;
    }
    const issues = [];
    for (const [index, child] of condition.filter.conditions.entries()) {
        issues.push(...validateCondition(child, catalog, `${path}.filter.conditions[${index}]`));
    }
    return issues;
}
function validateNode(node, catalog, path) {
    if (node.filter !== null && node.filter !== undefined) {
        const issues = [];
        if (node.filter.conditions.length === 0)
            issues.push(issue("EMPTY_CARD", "A segment card must contain at least one condition.", `${path}.filter.conditions`));
        for (const [index, condition] of node.filter.conditions.entries()) {
            issues.push(...validateCondition(condition, catalog, `${path}.filter.conditions[${index}]`));
        }
        return issues;
    }
    const issues = [];
    for (const [index, child] of (node.segments ?? []).entries()) {
        issues.push(...validateNode(child, catalog, `${path}.segments[${index}]`));
    }
    return issues;
}
function validateBranch(branch, catalog, path) {
    if (branch === null)
        return [];
    const issues = [];
    for (const [index, node] of branch.segments.entries()) {
        issues.push(...validateNode(node, catalog, `${path}.segments[${index}]`));
    }
    return issues;
}
export function validateFrontendBusinessRules(model, catalog) {
    const issues = [
        ...validateBranch(model.include, catalog, "include"),
        ...validateBranch(model.exclude, catalog, "exclude"),
    ];
    const hasCards = (model.include?.segments.length ?? 0) > 0 || (model.exclude?.segments.length ?? 0) > 0;
    if (!hasCards)
        issues.unshift(issue("SEGMENT_EMPTY", "At least one include or exclude card is required."));
    return issues;
}
//# sourceMappingURL=businessRules.js.map