import type { RawConditionDefinition, SegmentUiContext, UiSegmentSchema } from "./types.js";
/**
 * Convert the backend representation returned by get_segment into the UI-mode
 * model accepted by the SDK. This belongs at the trusted runner boundary; the
 * public mutation API intentionally continues to reject backend-only fields.
 */
export declare function hydrateBackendSegmentModel(model: UiSegmentSchema, definitions: readonly RawConditionDefinition[], uiContext?: SegmentUiContext): UiSegmentSchema;
