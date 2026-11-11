import { DefinitionCatalog } from "./definitionCatalog.js";
import type { AggregateFamily, AggregateIntent, ConditionFamily, CriterionIntent, FieldIntent, PeriodIntent, PredictedIntent, OccurrenceIntent, UiAggregateCondition, UiSimpleCondition } from "./types.js";
export declare const ESNG_REVISION = "535e60a314b93d3d3f23b2f8faa8a2bfb9901bc8";
export declare const SOFT_CUBE_PREDICTED_IDS: Set<string>;
export declare const REQUIRED_COLUMNS: Readonly<Record<AggregateFamily, readonly string[]>>;
export declare function periodOrDefault(family: AggregateFamily, event: string, period?: PeriodIntent): PeriodIntent;
export declare function scPeriodConditions(catalog: DefinitionCatalog, period: PeriodIntent): UiSimpleCondition[];
export declare function customEventPeriodConditions(catalog: DefinitionCatalog, period: PeriodIntent, dateColumnId: string): UiSimpleCondition[];
export declare function activityPeriodConditions(catalog: DefinitionCatalog, period: PeriodIntent, family: "AGGREGATED_ACTIVITY" | "AGGREGATED_WIDGET_ACTIVITY"): UiSimpleCondition[];
export declare function buildField(catalog: DefinitionCatalog, intent: FieldIntent): UiSimpleCondition;
export declare function buildPredicted(catalog: DefinitionCatalog, intent: PredictedIntent): UiSimpleCondition;
export declare function buildCriterion(catalog: DefinitionCatalog, intent: CriterionIntent, family: AggregateFamily, context?: {
    event?: unknown;
}): UiSimpleCondition;
export declare function applyOccurrence(catalog: DefinitionCatalog, condition: UiAggregateCondition, family: AggregateFamily, occurrence: OccurrenceIntent | null, context?: {
    event?: unknown;
}): void;
export declare function buildAggregate(catalog: DefinitionCatalog, intent: AggregateIntent): UiAggregateCondition;
export declare function inferFamily(condition: UiSimpleCondition | UiAggregateCondition): ConditionFamily;
