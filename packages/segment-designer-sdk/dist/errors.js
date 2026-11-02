export class SegmentSdkError extends Error {
    issues;
    constructor(message, issues = [{ code: "SEGMENT_SDK_ERROR", message }]) {
        super(message);
        this.name = "SegmentSdkError";
        this.issues = issues;
    }
}
export class SegmentFinishError extends SegmentSdkError {
    constructor(issues) {
        super(`Segment validation failed with ${issues.length} issue(s).`, issues);
        this.name = "SegmentFinishError";
    }
}
export function issue(code, message, path) {
    return path === undefined ? { code, message } : { code, message, path };
}
//# sourceMappingURL=errors.js.map