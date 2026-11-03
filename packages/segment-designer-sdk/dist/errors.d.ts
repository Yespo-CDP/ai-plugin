import type { MutationIssue } from "./types.js";
export declare class SegmentSdkError extends Error {
    readonly issues: readonly MutationIssue[];
    constructor(message: string, issues?: readonly MutationIssue[]);
}
export declare class SegmentFinishError extends SegmentSdkError {
    constructor(issues: readonly MutationIssue[]);
}
export declare function issue(code: string, message: string, path?: string): MutationIssue;
