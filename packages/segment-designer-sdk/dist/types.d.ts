export type Branch = "include" | "exclude";
export type Relation = "AND" | "OR";
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = {
    [key: string]: JsonValue;
};
export type ConditionValueIntent = JsonValue | {
    parameter: string;
};
export interface UiColumnIdentifier {
    columnId?: string | null;
    type?: string | null;
    profileInputId?: number | null;
}
export interface UiSimpleCondition {
    column: UiColumnIdentifier;
    index?: number | null;
    value?: JsonValue;
    label?: string | null;
    operator: string;
    originOperator?: string | null;
    negation?: boolean;
    isValid?: boolean;
}
export interface UiAggregateHolder {
    collection: AggregateCollection;
    negation?: boolean | null;
    conditions: UiSimpleCondition[];
    rule?: UiAggregateRule | null;
}
export interface UiAggregateRule {
    function: string;
    operator: string;
    originOperator?: string | null;
    negation?: boolean;
    value?: JsonValue;
    system?: boolean;
}
export interface UiAggregateCondition {
    aggregate: UiAggregateHolder;
    [key: string]: unknown;
}
export interface UiCompositeFilterCondition {
    filter: UiFilter;
    [key: string]: unknown;
}
export type UiCondition = UiSimpleCondition | UiAggregateCondition | UiCompositeFilterCondition;
export interface UiFilter {
    filterCompositeName?: string;
    relation: Relation;
    negation?: boolean | null;
    conditions: UiCondition[];
}
export interface UiSegmentNode {
    relation?: Relation | null;
    filter?: UiFilter | null;
    segments?: UiSegmentNode[] | null;
    custom?: boolean;
    [key: string]: unknown;
}
export interface UiSchemaItem {
    relation: Relation;
    negation?: boolean | null;
    segments: UiSegmentNode[];
    custom?: boolean;
    [key: string]: unknown;
}
export interface UiSegmentSchema {
    include: UiSchemaItem | null;
    exclude: UiSchemaItem | null;
    sort?: JsonObject | null;
    parameters?: JsonObject[];
    [key: string]: unknown;
}
export type AggregateCollection = "CUSTOMER_DATA" | "SC_EVENTS" | "PUSH_SUBSCRIPTIONS" | "EVENTS" | "ACTIVITY" | "TOKEN_SUBSCRIPTIONS" | "CUSTOMER_LIFECYCLE";
export type AggregateFamily = "AGGREGATED_SC" | "AGGREGATED_PUSH" | "AGGREGATED_TOKEN" | "AGGREGATED_ACTIVITY" | "AGGREGATED_WIDGET_ACTIVITY" | "AGGREGATED_CUSTOM_EVENTS" | "AGGREGATED_CUSTOMER_DATA" | "AGGREGATED_CUSTOMER_LIFECYCLE";
export type ConditionFamily = "FIELDS" | "PREDICTED_SC" | AggregateFamily;
declare const refBrand: unique symbol;
export type NodeRef<K extends string> = Readonly<{
    kind: K;
    id: string;
    readonly [refBrand]: K;
}>;
export type CardRef = NodeRef<"card">;
export type ConditionRef = NodeRef<"condition">;
export type AggregateRef = NodeRef<"aggregate">;
export type CriterionRef = NodeRef<"criterion">;
export type ConditionNodeRef = ConditionRef | AggregateRef | CriterionRef;
export interface DefinitionSelector {
    columnId?: string;
    profileInputId?: number;
    type?: string;
}
export interface FieldIntent {
    kind: "field";
    definition: DefinitionSelector;
    operator: string;
    value?: ConditionValueIntent;
    negated?: boolean;
    label?: string | null;
}
export interface PredictedIntent {
    kind: "predicted";
    definition: DefinitionSelector;
    negated?: boolean;
}
export type PeriodIntent = {
    kind: "all-time";
} | {
    kind: "relative";
    operator: string;
    value?: string | number;
} | {
    kind: "between";
    from: string;
    to: string;
    dateColumnId?: string;
};
interface AggregateIntentBase {
    kind: "aggregate";
    negated?: boolean;
    criteria?: CriterionIntent[];
    occurrence?: OccurrenceIntent;
}
export interface SoftCubeAggregateIntent extends AggregateIntentBase {
    family: "AGGREGATED_SC";
    event: string | string[];
    period?: PeriodIntent;
}
export interface CustomEventAggregateIntent extends AggregateIntentBase {
    family: "AGGREGATED_CUSTOM_EVENTS";
    event: string | number;
    period?: PeriodIntent;
    dateColumnId?: "EVENT_DATE" | "EVENT_FIRST_DATE" | "EVENT_LAST_DATE";
}
export interface ActivityAggregateIntent extends AggregateIntentBase {
    family: "AGGREGATED_ACTIVITY" | "AGGREGATED_WIDGET_ACTIVITY";
    event: string | string[];
    period?: PeriodIntent;
}
export interface PushAggregateIntent extends AggregateIntentBase {
    family: "AGGREGATED_PUSH";
    applicationId: string | number;
}
export interface TokenAggregateIntent extends AggregateIntentBase {
    family: "AGGREGATED_TOKEN";
    applicationId: string | number;
}
export interface CustomerDataAggregateIntent extends AggregateIntentBase {
    family: "AGGREGATED_CUSTOMER_DATA";
    source: CriterionIntent;
}
export interface CustomerLifecycleAggregateIntent extends AggregateIntentBase {
    family: "AGGREGATED_CUSTOMER_LIFECYCLE";
    schemaId: string | number;
    state: {
        operator: string;
        value: ConditionValueIntent;
        negated?: boolean;
        label?: string | null;
    };
}
export type AggregateIntent = SoftCubeAggregateIntent | CustomEventAggregateIntent | ActivityAggregateIntent | PushAggregateIntent | TokenAggregateIntent | CustomerDataAggregateIntent | CustomerLifecycleAggregateIntent;
export type AggregateSelection = Pick<SoftCubeAggregateIntent, "family" | "event"> | Pick<CustomEventAggregateIntent, "family" | "event" | "dateColumnId"> | Pick<ActivityAggregateIntent, "family" | "event"> | Pick<PushAggregateIntent, "family" | "applicationId"> | Pick<TokenAggregateIntent, "family" | "applicationId"> | Pick<CustomerDataAggregateIntent, "family" | "source"> | Pick<CustomerLifecycleAggregateIntent, "family" | "schemaId" | "state">;
export type ConditionIntent = FieldIntent | PredictedIntent | AggregateIntent;
export interface CriterionIntent {
    definition: DefinitionSelector;
    operator: string;
    value?: ConditionValueIntent;
    negated?: boolean;
    label?: string | null;
}
export type OccurrenceIntent = {
    kind: "exists";
} | {
    kind: "not-exists";
} | {
    kind: "count";
    operator: string;
    value: ConditionValueIntent;
    negated?: boolean;
} | {
    kind: "rate";
    criterion: CriterionIntent;
};
export interface AddCardCreateInput {
    mode?: "create";
    relation?: Relation;
    conditionRelation?: Relation;
    negated?: boolean;
    firstCondition?: ConditionIntent;
}
export interface AddCardCopyInput {
    mode: "copy";
    copyFrom: CardRef;
    relation?: Relation;
}
export type AddCardInput = AddCardCreateInput | AddCardCopyInput;
export interface CardPatch {
    relation?: Relation;
    conditionRelation?: Relation;
    negated?: boolean;
}
export interface SimpleConditionUpdate {
    definition?: DefinitionSelector;
    operator?: string;
    value?: ConditionValueIntent;
    clearValue?: boolean;
    negated?: boolean;
    label?: string | null;
}
export interface AggregateConditionUpdate {
    negated?: boolean;
    period?: PeriodIntent;
    selection?: AggregateSelection;
    occurrence?: OccurrenceIntent | null;
}
export interface ReplaceConditionUpdate {
    replaceWith: ConditionIntent | CriterionIntent;
}
export type ConditionUpdate = SimpleConditionUpdate | AggregateConditionUpdate | ReplaceConditionUpdate;
export interface FindQuery {
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
export interface SegmentNodeView {
    ref: CardRef | ConditionNodeRef;
    kind: "card" | "condition" | "aggregate" | "criterion";
    branch: Branch;
    card: CardRef;
    parent?: CardRef | AggregateRef;
    family?: ConditionFamily;
    value: UiFilter | UiCondition;
}
export interface MutationIssue {
    code: string;
    message: string;
    path?: string;
}
export type MutationResult<T> = {
    ok: true;
    value: T;
    warnings: readonly MutationIssue[];
} | {
    ok: false;
    issues: readonly MutationIssue[];
};
export interface CardResult {
    card: CardRef;
    conditions: readonly ConditionNodeRef[];
}
export interface SegmentDiagnostics {
    mutationCount: number;
    warnings: readonly MutationIssue[];
    validation: "pending" | "passed" | "failed";
    eSngRevision: string;
    definitionCount: number;
}
export interface FinishResult {
    model: UiSegmentSchema;
    formula: {
        include: string;
        exclude: string;
    };
    diagnostics: SegmentDiagnostics;
}
export interface RawDefinitionOperator {
    name: string;
    type: string;
    requestURL?: string | null;
    isSupported?: boolean;
    [key: string]: unknown;
}
export interface RawDefinitionOption {
    id?: string | number;
    profileInputOptionId?: string | number;
    value?: JsonValue;
    name?: string;
    label?: string;
    description?: string | null;
    index?: number;
    sequenceIndex?: number;
    category?: string;
    isSupported?: boolean;
    inUse?: boolean;
    params?: RawConditionDefinition[];
    [key: string]: unknown;
}
export interface RawConditionDefinition {
    columnId?: string | null;
    type: string;
    group?: string | null;
    groupType?: string;
    conditionType?: string;
    categoryType?: string;
    operators: RawDefinitionOperator[];
    options?: RawDefinitionOption[] | null;
    requestURL?: string | null;
    profileInputMetadata?: {
        profileInputId: number;
        name?: string;
        description?: string;
        options?: RawDefinitionOption[];
        [key: string]: unknown;
    } | null;
    isSupported?: boolean;
    [key: string]: unknown;
}
export interface SegmentUiContext {
    timeZone?: string;
    /** eSNG group editor mode. Parameters are offered only by PARAMETRIC groups. */
    groupType?: "DYNAMIC" | "PARAMETRIC";
    mobilePushApplicationIds?: readonly (string | number)[];
    /** Resolved frontend feature decisions, not raw organization option/level values. */
    enabledFeatures?: Readonly<Record<string, boolean>>;
    /** Fail closed when a feature decision needed by the authored model is absent. */
    requireResolvedFeatures?: boolean;
    scEventDateValidPeriodDays?: number;
}
export interface CreateSegmentSdkOptions {
    model?: UiSegmentSchema;
    definitions: readonly RawConditionDefinition[];
    outputSchema: object;
    uiContext?: SegmentUiContext;
}
export interface SegmentSDK {
    getModel(): UiSegmentSchema;
    find(query: FindQuery): SegmentNodeView[];
    addCard(branch: Branch, input: AddCardInput): MutationResult<CardResult>;
    updateCard(card: CardRef, patch: CardPatch): MutationResult<CardRef>;
    addCondition(parent: CardRef | AggregateRef, intent: ConditionIntent | CriterionIntent): MutationResult<ConditionNodeRef>;
    /** Add a group of conditions atomically, with a single rollback snapshot. */
    addConditions(parent: CardRef | AggregateRef, intents: readonly (ConditionIntent | CriterionIntent)[]): MutationResult<ConditionNodeRef[]>;
    updateCondition(condition: ConditionNodeRef, update: ConditionUpdate): MutationResult<ConditionNodeRef>;
    remove(target: CardRef | ConditionNodeRef): MutationResult<void>;
    finish(): Promise<FinishResult>;
}
export {};
