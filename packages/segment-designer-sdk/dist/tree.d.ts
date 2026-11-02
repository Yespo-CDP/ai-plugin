import type { Branch, CardRef, ConditionNodeRef, Relation, UiAggregateCondition, UiCondition, UiFilter, UiSegmentSchema, UiSimpleCondition } from "./types.js";
export interface InternalCard {
    kind: "card";
    id: string;
    filter: UiFilter;
}
interface InternalGroup {
    kind: "group";
    relation: Relation;
    children: InternalExpression[];
    custom?: boolean;
}
type InternalExpression = InternalCard | InternalGroup;
export interface ConditionEntry {
    id: string;
    kind: "condition" | "aggregate" | "criterion";
    value: UiCondition | UiSimpleCondition;
    cardId: string;
    aggregateId?: string;
}
export interface CardLocation {
    card: InternalCard;
    branch: Branch;
}
export interface TreeSnapshot {
    branches: Record<Branch, InternalGroup>;
    cards: Map<string, CardLocation>;
    conditions: Map<string, ConditionEntry>;
    counters: {
        card: number;
        condition: number;
        aggregate: number;
        criterion: number;
    };
    extras: Omit<UiSegmentSchema, "include" | "exclude">;
}
export declare class SegmentTree {
    private branches;
    private readonly cards;
    private readonly conditions;
    private counters;
    private extras;
    constructor(model?: UiSegmentSchema);
    snapshot(): TreeSnapshot;
    restore(snapshot: TreeSnapshot): void;
    toModel(): UiSegmentSchema;
    cardRef(id: string): CardRef;
    conditionRef(entry: ConditionEntry): ConditionNodeRef;
    allCards(branch?: Branch): CardLocation[];
    allConditions(): ConditionEntry[];
    getCard(id: string): CardLocation;
    getCondition(id: string): ConditionEntry;
    addCard(branch: Branch, filter: UiFilter, relation: Relation): CardRef;
    copyCard(sourceId: string, relation?: Relation): CardRef;
    cardConditionRefs(cardId: string): ConditionNodeRef[];
    updateCard(id: string, patch: {
        relation?: Relation;
        conditionRelation?: Relation;
        negated?: boolean;
    }): void;
    addTopLevelCondition(cardId: string, condition: UiCondition): ConditionEntry;
    addCriterion(aggregateId: string, criterion: UiSimpleCondition): ConditionEntry;
    replaceCondition(id: string, next: UiSimpleCondition | UiAggregateCondition): void;
    removeCard(id: string): void;
    removeCondition(id: string): void;
    formula(branch: Branch, labelOffset?: number): string;
    private parseBranch;
    private parseNode;
    private serializeBranch;
    private registerTopLevelCondition;
    private unregisterCondition;
    private requireCard;
    private changeRelationBefore;
    private nextId;
    private cardLabel;
}
export {};
