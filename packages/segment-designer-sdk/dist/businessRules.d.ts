import { DefinitionCatalog } from "./definitionCatalog.js";
import type { MutationIssue, UiAggregateCondition, UiSegmentSchema } from "./types.js";
/** Apply the same dependent-control pruning performed when an eSNG aggregate selection changes. */
export declare function reconcileFrontendAggregate(condition: UiAggregateCondition, catalog: DefinitionCatalog): MutationIssue[];
export declare function validateFrontendBusinessRules(model: UiSegmentSchema, catalog: DefinitionCatalog): MutationIssue[];
