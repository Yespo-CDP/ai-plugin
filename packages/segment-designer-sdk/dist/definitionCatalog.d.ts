import { issue } from "./errors.js";
import type { ConditionFamily, ConditionValueIntent, DefinitionSelector, JsonValue, RawConditionDefinition, RawDefinitionOperator, RawDefinitionOption, SegmentUiContext, UiColumnIdentifier, UiSimpleCondition } from "./types.js";
interface DefinitionResolutionContext {
    event?: unknown;
}
export interface SimpleConditionOptions {
    family?: ConditionFamily;
    negated?: boolean;
    label?: string | null;
    context?: DefinitionResolutionContext;
    /** Existing UI JSON must not be normalized a second time during an unrelated update. */
    valueMode?: "intent" | "stored";
    /** Parameters are a creation-only context-menu feature in eSNG. */
    allowParameter?: boolean;
}
export declare class DefinitionCatalog {
    readonly definitions: readonly RawConditionDefinition[];
    readonly context: SegmentUiContext;
    private readonly entries;
    constructor(definitions: readonly RawConditionDefinition[], context?: SegmentUiContext);
    resolve(selector: DefinitionSelector, family?: ConditionFamily, context?: DefinitionResolutionContext): RawConditionDefinition;
    resolveColumn(columnId: string, family?: ConditionFamily, context?: DefinitionResolutionContext): RawConditionDefinition;
    resolveOperator(definition: RawConditionDefinition, operatorName: string): RawDefinitionOperator;
    toColumn(definition: RawConditionDefinition, operator?: RawDefinitionOperator): UiColumnIdentifier;
    findOption(definition: RawConditionDefinition, value: unknown): RawDefinitionOption | undefined;
    optionStoredValue(definition: RawConditionDefinition, value: unknown, preference?: "id" | "value"): JsonValue;
    optionUiValue(definition: RawConditionDefinition, value: unknown, multiple?: boolean): JsonValue;
    parameterType(condition: UiSimpleCondition, family?: ConditionFamily, context?: DefinitionResolutionContext): string;
    createSimpleCondition(selector: DefinitionSelector, operatorName: string, value: ConditionValueIntent | undefined, options?: SimpleConditionOptions): UiSimpleCondition;
    validateSimpleCondition(condition: UiSimpleCondition, path: string, family?: ConditionFamily, context?: DefinitionResolutionContext): ReturnType<typeof issue>[];
    private normalizeValue;
    private normalizeListAtom;
    private normalizeAutocompleteLabel;
    private normalizeTime;
    private validateValueShape;
    private validateSyntheticSelect;
    private validateOptions;
    private validateFeatureDecision;
    private toUtcDateTime;
}
export {};
