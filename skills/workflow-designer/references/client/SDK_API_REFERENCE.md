# Workflow SDK — API Reference

This document is the single reference for the JS-side Workflow SDK that runs inside the browser editor sandbox. It covers both building workflows from scratch and modifying existing ones.

## Sandbox Scope

Code executes via `WorkflowExecutor.execute(code)` inside a `CodeExecutionSandbox`. These current SDK symbols are used for workflow authoring:


| Symbol                             | Type          | Description                                                      |
| ---------------------------------- | ------------- | ---------------------------------------------------------------- |
| `sdk`                              | `WorkflowSDK` | Pre-instantiated SDK bound to the live canvas                    |
| `ShapeType`                        | `enum`        | All available shape type constants                               |
| `WorkflowStopConfigurationAdapter` | `class`       | Converts schema-shaped stop-config records into `StopWorkflowConfigurationI` |


**Constraints:**

- No `import`/`require` — the sandbox is a `new Function(...)` scope
- The SDK has a 10-second asynchronous timeout. The remote service also enforces a hard process timeout, including synchronous infinite loops.
- On success, canvas changes are kept; on failure, the canvas is silently rolled back to the pre-execution snapshot
- All SDK errors are caught and returned as structured `ExecutionResultI` objects (not thrown to the caller)
- For workflow start configuration, pass the active `WorkflowStartConfiguration` catalog object directly to `sdk.setStartConfiguration(...)`, or pass `null` to clear it
- For workflow stop configuration, build a schema-shaped record, convert it with `WorkflowStopConfigurationAdapter.fromRecord(...)`, then pass the result to `sdk.setStopConfiguration(...)`
- `isExitFromWorkflow` is only the stop-config enabled flag
- Order-based windows such as "7 days" are explicit stop-config fields, not hidden `userData` details

**Every mutating script must call `sdk.finish()` as its last statement.** This validates the workflow graph and returns the final model.  

---

## SDK Execution Rules

This section is the operational source of truth for agent-authored SDK scripts.

### Shape and graph rules

- The Start block already exists on the canvas. Never create a new Start block.
- For new workflows and new paths, terminate every path at an End block. The current graph validator temporarily permits a workflow with no End blocks at all, but when at least one End exists it requires every shape to have a path to an End.
- Preserve untouched portions of an existing workflow unless the user explicitly asks otherwise.
- Never fabricate IDs for new shapes; capture them from shape creation return values.
- For existing shapes, use known existing IDs from the current task context, or locate shapes with `sdk.findShapes()`.

### SDK code rules

- Use the current SDK globals only: `sdk`, `ShapeType`, and `WorkflowStopConfigurationAdapter`.
- Do not use `import`, `require`, DOM APIs, timers, file-system access, or network access.
- Use `ShapeType` enum members such as `ShapeType.SEND_EMAIL`, never raw shape type strings.
- Every mutating script must call `sdk.finish()` as the last statement.

### Start/stop configuration rules

- Build start configuration in the same active shape returned by `get_workflow_state.startConfig` and emitted by the `WorkflowStartConfiguration` catalog schema.
- Build stop configuration records from the `WorkflowStopConfiguration` catalog schema and organisation data.
- Convert stop config records through `WorkflowStopConfigurationAdapter.fromRecord(...)` before `sdk.setStopConfiguration(...)`.
- Pass current start config catalog output directly to `sdk.setStartConfiguration(...)`.
- Do not pass raw schema-shaped stop config records directly into `sdk.setStopConfiguration(...)`.

### Reference entity validation rules
- Do not guess IDs from names, labels, or user wording. Use IDs from the current workflow state, catalog/context data, or prior SDK return values.
- If a user names an entity but the current context does not include a matching ID, either create a skeleton block without that field or ask for the missing entity. Do not invent a numeric ID.
- Resolve concrete references through organization-scoped MCP reads before using them. The packaged editor may retain unresolved IDs without display names; successful SDK execution is not proof that a reference exists.
- Message IDs are display-resolved asynchronously by the editor. A send block may persist a valid `messageId` without an incoming `messageName`; the editor attempts to fill `messageName` after SDK execution.
- Empty or omitted reference fields are not treated as unresolved IDs. They remain missing configuration and may be reported by `getShapeConfigurationState()`.
- During shape creation and `updateShape()`, unresolved placeholder references such as `${messageId}` may be treated as skeleton/draft input and omitted from persisted business configuration when safe. Start configuration and stop configuration remain strict.
- Dynamic parameters such as `${messageId}` or `${appId}` are persisted only when the editor resolver recognizes them.

### Preferred edit patterns

- Use `addShape()` for new shapes.
- Use `selectShape()` when you need to continue from a specific existing branch point.
- Use `connect()` when wiring two already existing shapes.
- Use `insertBetween()` for creating new inline shape(s) between directly connected shapes.
- Use `insertExistingBetween()` only when moving a detached shape that is already present on the canvas into a direct connection.
- Use `updateShape()` for targeted parameter edits.
- Use `bypassShape()` when removing a pass-through or merge shape while preserving its incoming paths to its single downstream target.
- Use `removeShape()` directly only when the attached paths should also be removed, or when you will perform a fully specified custom rewire that does not depend on private connection metadata.

An empty name or description does not make a block redundant. In particular, an unnamed Check point may merge several incoming paths. Remove a Check point only when the user explicitly selected it for removal and its topology satisfies `bypassShape()`; never infer removability from `checkPointName === ''` alone.

---

## Interfaces

These are the TypeScript interfaces that describe the shapes of objects returned by SDK methods.

### WorkflowEditorShapeI

Returned by `addShape()`, `findShapes()`, `insertBetween()`, and `insertExistingBetween()`. This is a live draw2d figure reference — a proxy over the canvas element.

```ts
interface WorkflowEditorShapeI {
  NAME: ShapeType;                                       // e.g. 'esputnik.shape.SendEmail'
  id: string;                                            // unique canvas ID, e.g. '_dec501ec1b48aec02aa91c43ac846659'
  getId: () => string;
  getBlockDescription: () => string;
  getShapeStatus: () => WorkflowEditorShapeStatus;       // 'VALID' | 'INVALID' | 'WARNING'
  setValidationStatus: (status: WorkflowEditorShapeStatus) => void;
  userData?: ShapeUserDataI;
  setUserData: (data: ShapeDataI[]) => void;
  parent: { id: string };
  [key: string]: any;                                    // index signature — live draw2d figures also expose
                                                         // getPersistentAttributes(), getOutputPort(n),
                                                         // getInputPort(n), and shape-specific fields
}

enum WorkflowEditorShapeStatus {
  VALID = 'VALID',
  INVALID = 'INVALID',
  WARNING = 'WARNING',
}
```

The `[key: string]: any` index signature means the live figure object also exposes draw2d runtime methods like `getPersistentAttributes()`, `getOutputPort(index)`, `getInputPort(index)`, etc. The SDK uses these internally (e.g., `getShapeParams()` calls `getPersistentAttributes()` and filters out standard draw2d fields).

### ShapeUserDataI

Metadata bag attached to shapes and connections.

```ts
interface ShapeUserDataI {
  increment: number;
  size: number;
  asArray?: () => ShapeDataI[];
  data?: ShapeDataI[];
}
```

### ShapeDataI

Single key-value entry inside `ShapeUserDataI.data`.

```ts
interface ShapeDataI {
  name: string;      // e.g. 'eventTypeId', 'duration', 'sendInTimeRange'
  type: string;      // e.g. 'EventTypeId', 'String', 'boolean', 'Hours'
  value: any;
  title?: string;
  required?: boolean;
}
```

### ConnectionRefI

Returned by `connect()` and `findConnections()`.

```ts
interface ConnectionRefI {
  id: string;
  getSource: () => WorkflowEditorShapeI;
  getTarget: () => WorkflowEditorShapeI;
  sourcePort: ConnectionRefPortI;
  targetPort: ConnectionRefPortI;
}
```

### ConnectionRefPortI

Port descriptor inside `ConnectionRefI`.

```ts
interface ConnectionRefPortI {
  name: string;            // e.g. 'output0', 'input0'
  parent: { id: string };  // owning shape ID
}
```

### ConnectionParamsI

Optional params object for `connect()`.

```ts
interface ConnectionParamsI {
  connectionType?: 'YES' | 'NO' | 'OTHER' | 'PERCENT';
  label?: string;
  percentage?: number;     // 0–100; required for explicit PERCENT connections
  sourcePort?: string;     // default: 'output0'
  targetPort?: string;     // default: 'input0'
}
```

### ValidationResultI

Returned by `validate()`.

```ts
interface ValidationResultI {
  valid: boolean;
  errors: Array<{
    shapeId?: string;
    code: string;
    message: string;
  }>;
}
```

### ExecutionResultI

Returned by the executor wrapping your script (not directly available in sandbox code, but describes the shape of structured responses the agent receives).

`startConfiguration` is SDK-facing and active-trigger-only. The editor keeps inactive trigger defaults internally for UI state, but they are not emitted back to the agent.

```ts
interface ExecutionResultI {
  success: boolean;
  result?: {
    shapesCount: number;
    connectionsCount: number;
    shapeTypes: ShapeType[];
    startConfiguration?: ActiveStartWorkflowConfigI | null;
    stopConfiguration: StopWorkflowConfigurationI | null;
    stopConfigurationInspection?: WorkflowStopConfigurationInspectionI;
  };
  incompleteParameterizedShapes?: WorkflowSDKConfigurationRequestI[]; // incomplete shapes created with business params
  incompleteSkeletonShapes?: WorkflowSDKConfigurationRequestI[]; // retained for compatibility; currently empty
  incompleteStartConfiguration?: WorkflowSDKConfigurationRequestI[]; // incomplete workflow start configuration
  incompleteStopConfiguration?: WorkflowSDKConfigurationRequestI[]; // incomplete workflow stop configuration
  message?: string; // concatenated advisory text when grouped configuration state is non-empty
  error?: {
    type: 'syntax' | 'timeout' | 'validation' | 'runtime';
    message: string;
    details?: any;   // for 'validation': { code: SDKErrorCode, ... }
  };
}
```

After a successful mutating standalone-runner execution, the executor always returns `result.stopConfiguration`. It returns `result.startConfiguration` only when that SDK run explicitly updated the start configuration. Use the executor result to confirm what the just-run script produced. 
`incompleteParameterizedShapes`, `incompleteStartConfiguration`, and `incompleteStopConfiguration` are advisory. A successful script can still create valid shapes or workflow-level start/stop configuration that is not fully configured for launch; in that case, the executor keeps the canvas changes and returns the parameters that should be requested from the user next. Skeleton blocks are intentionally omitted from advisory output.

### ActiveStartWorkflowConfigI

Accepted by `sdk.setStartConfiguration(...)` and returned by `sdk.getStartConfiguration()`, `result.startConfiguration`, and workflow state snapshots exposed to the agent.

The setter input uses the same top-level shape as `get_workflow_state.startConfig`. Read `WorkflowStartConfiguration` from its `Catalog File Path` for the exact payload schema, trigger-specific fields, examples, and validation notes. Disabled start configuration is represented externally as `null`.

### WorkflowStopConfigurationInspectionI

Present only when the executor detects Start-shape stop fields that cannot be cleanly converted into the canonical SDK stop configuration.

```ts
interface WorkflowStopConfigurationInspectionI {
  configuration: StopWorkflowConfigurationI | null;
  rawConfiguration: Record<string, unknown> | null;
  issues: Array<{
    kind: 'validation' | 'unsupported';
    path: string;
    message: string;
    value?: unknown;
  }>;
}
```

### WorkflowSDKConfigurationRequestI

Advisory item returned by `sdk.getShapeConfigurationState()` and successful executor responses when shapes or workflow-level start/stop configuration still need user-provided configuration.

```ts
interface WorkflowSDKConfigurationRequestI {
  shapeId?: string;            // runtime canvas ID of the incomplete shape
  shapeType?: ShapeType;       // e.g. ShapeType.SEND_EMAIL
  configurationType?: 'start' | 'stop'; // present for workflow-level configuration requests
  missingParameters: string[]; // business field names to ask the user for
  message: string;             // readable prompt summary
}
```

Example:

```json
{
  "shapeId": "_email1",
  "shapeType": "esputnik.shape.SendEmail",
  "missingParameters": ["messageId"],
  "message": "Send Email block needs messageId."
}
```

### WorkflowSDKConfigurationStateI

Advisory state returned by `sdk.getShapeConfigurationState()` and used by the executor to populate grouped response fields.

```ts
interface WorkflowSDKConfigurationStateI {
  incompleteParameterizedShapes: WorkflowSDKConfigurationRequestI[]; // incomplete shapes created with business params
  incompleteSkeletonShapes: WorkflowSDKConfigurationRequestI[]; // retained for compatibility; currently empty
  incompleteStartConfiguration: WorkflowSDKConfigurationRequestI[]; // incomplete workflow start configuration
  incompleteStopConfiguration: WorkflowSDKConfigurationRequestI[]; // incomplete workflow stop configuration
}
```

### CampaignShape (serialized model)

Returned by `getModel()` and `finish()`. This is the **serialized** JSON model — a union of all shape types. Every member extends `BaseShapeI`:

```ts
interface BaseShapeI {
  id: string;
  path: string;
  type: ShapeType;
  width: number;
  height: number;
  x: number;
  y: number;
  userData: ShapeUserDataI;
  cssClass: string;
  blockDescription: string;
  sendInTimeRange?: boolean;
  viewMode?: 'PREVIEW' | 'FROZEN';
  validationDisabled?: boolean;
}
```

Connection shapes in the serialized model use `ShapeConnectionI`:

```ts
interface ShapeConnectionI extends BaseShapeI {
  source: { node: string; port: string };
  target: { node: string; port: string };
}
```

`CampaignShape` is a union type: `ShapeStartI | ShapeSendI | ShapeConnectionI | ShapeCustomI | ShapeCustomConditionI | ShapeDateTimerI | ShapeSendToSegmentI | ShapeCheckInGroupI | ShapeSprayI | ShapeCheckPointI | ShapeCurrentTimeI | ShapeWebhookI | ShapeAddContactToGroupI | ShapeDeleteContactToGroupI | ShapeAlternateSendI`.

---

## SDK Methods

### addShape

Create a shape on the live canvas, optionally applying business parameters. **The new shape is automatically connected FROM the currently selected shape** — no explicit `connect()` call is needed for the normal flow.

```ts
sdk.addShape(type: ShapeType, params?: object): WorkflowEditorShapeI
```


| Param    | Type        | Required | Description                                    |
| -------- | ----------- | -------- | ---------------------------------------------- |
| `type`   | `ShapeType` | yes      | Shape type constant (must not be `CONNECTION`) |
| `params` | `object`    | no       | Partial shape-specific business parameters     |


**Returns:** `WorkflowEditorShapeI` — a live draw2d figure reference. See [Interfaces > WorkflowEditorShapeI](#workfloweditorshapei).

**Behavior:**

- **Auto-connect**: The editor automatically creates a connection from the currently selected shape's next available output port to the new shape's input port. After creation, the new shape becomes the current selection. This means sequential creation calls produce a linear chain without any `connect()` calls.
- `sdk.addShape(type)` creates a skeleton shape without business parameters. Missing UI-required params do not block creation and are not reported in `getShapeConfigurationState()` or the executor response payload.
- `sdk.addShape(type, params)` creates a parameterized shape when `params` contains business configuration fields. `params` may be partial; missing UI-required params for parameterized shapes are advisory and do not block creation.
- Calls with no params, `{}`, or metadata-only params such as `{ blockDescription: '...' }` are treated as skeleton creation for advisory purposes.
- Unresolved placeholder values in creation params are treated as skeleton/draft input when they can be safely omitted. The SDK preserves metadata such as `blockDescription` and known topology-only fields such as Branch labels/outputs, but does not write invalid placeholder business configuration. `updateShape()` uses the same skeleton/draft placeholder handling for effective update fields.
- Passing `ShapeType.CONNECTION` throws `UNKNOWN_SHAPE_TYPE` — use `connect()` instead.
- Provided fields are validated against the shape schema and applied via `editorService.updateShapeFields()`.
- Invalid concrete params still fail fast: unknown fields, wrong types, invalid enum values, and invalid percentage-router branch definitions throw `SHAPE_NOT_CONFIGURED`.
- Reference fields such as `messageId`, `groupId`, and `appUUID` require organization-scoped resolution before authoring; do not rely on the packaged editor to reject every unresolved ID.
- The returned `.id` is generated by the canvas and must be captured if you need to reference it later.

**Errors:** `UNKNOWN_SHAPE_TYPE`, `SHAPE_NOT_REGISTERED`, `SHAPE_NOT_CONFIGURED`

---

### connect

Connect two **already existing** shapes by ID. Use this only when you need to wire shapes that were not connected by auto-connect (e.g., implementing an explicitly specified replacement path after `removeShape()`, or wiring a shape's second output port to an existing target). Do not use it to emulate `bypassShape()`. For the normal build flow, rely on auto-connect via `addShape()` instead.

Idempotent — returns the existing connection if the same source/target/ports are already connected.

```ts
sdk.connect(sourceId: string, targetId: string, params?: ConnectionParamsI): ConnectionRefI
```


| Param      | Type                | Required | Description                                                                                                                            |
| ---------- | ------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `sourceId` | `string`            | yes      | ID of the source shape                                                                                                                 |
| `targetId` | `string`            | yes      | ID of the target shape                                                                                                                 |
| `params`   | `ConnectionParamsI` | no       | Connection options — see [Interfaces > ConnectionParamsI](#connectionparamsi) and [Connection Params](#connection-params) for defaults |


**Returns:** `ConnectionRefI` — see [Interfaces > ConnectionRefI](#connectionrefi).

**Defaults:**

- `sourcePort`: `'output0'`
- `targetPort`: `'input0'`
- `connectionType`: `'OTHER'`

**Behavior:**

- Self-connections (`sourceId === targetId`) throw `SELF_CONNECTION`.
- Before creating, checks for an existing connection on the same ports and returns it if found (idempotent).
- When `connectionType` is `'PERCENT'`, the `percentage` value is stored as userData.
- When connecting from a `ShapeType.PERCENTAGE_ROUTER` output port, the SDK derives the branch percentage from the router params, forces the connection metadata to `PERCENT`, and stores that percentage automatically. Use `sourcePort: 'outputN'` to pick the branch.
- When `label` is provided, it is stored as a `condition` userData entry.

**Errors:** `SELF_CONNECTION`, `SHAPE_NOT_FOUND`, `PORT_NOT_FOUND`, `INVALID_CONNECTION_REF`, `SHAPE_NOT_CONFIGURED`

---

### removeShape

Remove a shape from the canvas. This is the low-level destructive deletion operation; use `bypassShape()` instead when the surrounding paths must continue through the removed shape.

```ts
sdk.removeShape(shapeId: string): void
```


| Param     | Type     | Required | Description               |
| --------- | -------- | -------- | ------------------------- |
| `shapeId` | `string` | yes      | ID of the shape to remove |


**Behavior:**

- Start and End shapes cannot be removed — throws `SHAPE_NOT_DELETEABLE`.
- The shape and all attached connections are deleted without reconnecting surrounding shapes. The removal runs as one undoable transaction.
- Use `bypassShape()` for a supported, metadata-preserving rewire. Do not manually reconstruct a multi-incoming bypass from raw connection objects.

**Errors:** `SHAPE_NOT_FOUND`, `SHAPE_NOT_DELETEABLE`

---

### bypassShape

Transactionally remove one pass-through or merge shape and preserve every incoming path to its sole downstream target.

```ts
sdk.bypassShape(shapeId: string): void
```

| Param     | Type     | Required | Description                         |
| --------- | -------- | -------- | ----------------------------------- |
| `shapeId` | `string` | yes      | ID of the shape to remove and bypass |

**Required topology:** at least one incoming connection and exactly one outgoing connection. The sole outgoing connection must not carry a meaningful label or userData, because there is no unambiguous incoming route onto which that metadata can be transferred. The operation also rejects duplicate planned bridges or an equivalent direct connection that already exists.

**Behavior:**

1. Resolves and validates the shape, attached connection endpoints, topology, and outgoing metadata before mutating the canvas.
2. Removes the incoming connections, sole outgoing connection, and shape.
3. Connects every former incoming source shape directly to the former outgoing target shape.
4. Preserves each incoming connection's source port and routing metadata, and uses the former outgoing connection's target port.
5. Runs as one undoable transaction and rolls the transaction back if any replacement connection fails.

Use this operation for an `N incoming → Check point → 1 outgoing` merge, including `N = 1`. It rejects a detached/source-like shape with no incoming connections, zero or multiple outgoing connections, and meaningful outgoing metadata instead of guessing which paths or routing semantics to delete or combine. Start, End, and Connection shapes cannot be bypassed.

Do not implement this operation manually with `findConnections()` + `removeShape()` + `connect()`. Connection metadata is intentionally not exposed as a public reconstruction contract, and raw `getSource()` / `getTarget()` values are ports.

**Errors:** `SHAPE_NOT_FOUND`, `SHAPE_NOT_DELETEABLE`, `INVALID_ARGUMENT`, `INVALID_CONNECTION_REF`, `SELF_CONNECTION`, `PORT_NOT_FOUND`

---

### updateShape

Update business parameters of an existing shape. Only provided fields are changed (partial update).

```ts
sdk.updateShape(shapeId: string, params: object): void
```


| Param     | Type     | Required | Description                     |
| --------- | -------- | -------- | ------------------------------- |
| `shapeId` | `string` | yes      | ID of the shape to update       |
| `params`  | `object` | yes      | Partial map of fields to update |


**Behavior:**

- Cannot be used on connection shapes — throws `TYPE_MISMATCH`.
- Params are resolved through the same skeleton/draft placeholder handling as `addShape()`, then validated against the shape schema in partial mode (only effective fields are checked).
- Unresolved placeholder values are omitted when safe. The SDK preserves metadata such as `blockDescription` and known topology-only fields such as Branch labels/outputs, but does not write invalid placeholder business configuration.
- For `ShapeType.BRANCH`, updating `branches` preserves existing routes for matching branches, but it does not create downstream paths for newly added branch outputs. If the update adds non-default branches, wire each new output path afterward with `sdk.selectShape(branch.id)` and `sdk.addShape(...)`.
- Resolve reference fields such as `messageId`, `groupId`, and `appUUID` through MCP before authoring updates. SDK validation does not establish organization ownership.
- The same ID-only display-field behavior as `addShape()` applies to updates.
- Only fields with non-`undefined` values are sent to the editor service.

**Errors:** `SHAPE_NOT_FOUND`, `TYPE_MISMATCH`, `SHAPE_NOT_CONFIGURED`

---

### findShapes

Query shapes currently on the canvas, optionally filtered by type.

```ts
sdk.findShapes(type?: ShapeType): WorkflowEditorShapeI[]
```


| Param  | Type        | Required | Description                                                  |
| ------ | ----------- | -------- | ------------------------------------------------------------ |
| `type` | `ShapeType` | no       | Filter by shape type. Omit to get all non-connection shapes. |


**Returns:** `WorkflowEditorShapeI[]` — live figure references. Connection shapes are always excluded. See [Interfaces > WorkflowEditorShapeI](#workfloweditorshapei).

---

### findConnections

Query connections on the canvas, optionally filtered by source or target shape ID.

```ts
sdk.findConnections(filter?: { sourceId?: string, targetId?: string }): ConnectionRefI[]
```


| Param             | Type     | Required | Description                                  |
| ----------------- | -------- | -------- | -------------------------------------------- |
| `filter.sourceId` | `string` | no       | Only connections originating from this shape |
| `filter.targetId` | `string` | no       | Only connections targeting this shape        |


**Returns:** `ConnectionRefI[]` — see [Interfaces > ConnectionRefI](#connectionrefi). Pass no filter to get all connections.

---

### getShapeParams

Read the current business parameters of a shape. Filters out draw2d standard fields (`id`, `type`, `x`, `y`, `width`, `height`, `cssClass`, `bgColor`, `stroke`, `alpha`, `opacity`, `selectable`, `draggable`, `angle`, `path`, `validationStatus`, `labels`, `color`, `router`, `policy`, `source`, `target`, `inConnectionCount`, `messageName`, `groupName`, `appName`, `webhookName`, `webhookMethod`).

```ts
sdk.getShapeParams(shapeId: string): ShapeParamsMapI[T] | null
```


| Param     | Type     | Required | Description                |
| --------- | -------- | -------- | -------------------------- |
| `shapeId` | `string` | yes      | ID of the shape to inspect |


**Returns:** A shape-specific params object (keyed by persisted business field names), or `null` if the shape is not found or is a connection. The exact shape depends on the shape type and may include editor-managed serialized fields that are not SDK-authorable inputs. For authoring, use the matching block catalog schema as the source of truth for fields allowed in `addShape(...)` and `updateShape(...)`. For example, for a Clock shape: `{ waitTime: boolean, waitUntilDate: boolean, duration?: string, durationItem?: string, ... }`.

**Custom/CustomCondition normalization:**

- For `ShapeType.CUSTOM` and `ShapeType.CUSTOM_CONDITION`, read params through `sdk.getShapeParams()` if you need the current values.
- The SDK normalizes draw2d runtime fields back into SDK-facing fields:
  - runtime `customTaskId` becomes SDK `taskName`
  - legacy serialized string `taskParams` is parsed into its JSON value when possible
- Prefer the normalized `taskName` / `taskParams` returned by `getShapeParams()` over inspecting raw persistent attributes yourself.

### Custom and CustomCondition task contract

`ShapeType.CUSTOM` and `ShapeType.CUSTOM_CONDITION` use the same SDK-facing task contract:

```ts
interface CustomTaskShapeParamsI {
  blockDescription?: string;
  taskName: string;
  taskParams?: CustomTaskParamI[];
}
```

Task-specific catalog entries such as `CreateContactTask` or `CheckEventTask` are authoring aliases, not literal SDK shape types.

- Generate the real SDK block type declared by the catalog brief `sdk_block_type`
- Copy the alias task name into `taskName`
- Map the alias schema fields into `taskParams` / `blockDescription`
- Pass `taskName`, not `customTaskId`
- Pass `taskParams` as an array of `{ name, value, type? }` entries
- Do not generate serialized string `taskParams`; serialized strings are parsed only for legacy compatibility
- Do not generate object-shaped `taskParams` for normal SDK scripts; unregistered Custom tasks reject objects
- Empty legacy string `taskParams` is normalized to `[]`
- If the runtime has a registered task schema for the chosen `taskName`, schema validation runs after normalization for backward compatibility
- Named workflow tasks such as `transactionalViberMessageTask` are supported through this generic `ShapeType.CUSTOM` contract; do not invent a new shape type for them
- `segmentationTask` / Check values is a `ShapeType.CUSTOM_CONDITION` alias with stricter nested restrictions data. Its `restrictions` task param value must be `{ cards: [{ restrictions: [...] }] }` or a JSON string that parses to that shape. Follow the `SegmentationTask` catalog entry; do not emit `[]`, `{ values: [] }`, missing `cards`, or cards without `restrictions`. For concrete rules, emit `fieldName` and `fieldSource` directly; `fieldId` and `checkType` are accepted only as compatibility aliases.

Example:

```js
sdk.addShape(ShapeType.CUSTOM, {
  taskName: 'createContactTask',
  taskParams: [
    { name: 'email', value: '${email}', type: 'TestVariable' },
    { name: 'phone', value: '${phone}', type: 'TestVariable' },
  ],
  blockDescription: 'Create or enrich the contact before later steps',
});
```

Omit `jsonParam` when the workflow does not include advanced JSON parameters for the task.

---

### selectShape

Programmatically select a shape on the canvas. **This controls the auto-connect target** — the next `addShape()` call will connect from this shape's next available output port.

```ts
sdk.selectShape(shapeId: string): void
```


| Param     | Type     | Required | Description                |
| --------- | -------- | -------- | -------------------------- |
| `shapeId` | `string` | yes      | ID of the shape to select  |


**Behavior:**

- Delegates to `editorService.setCurrentSelection()` — the editor UI handles property pane opening and scroll-into-view.
- **Auto-connect control**: After calling `selectShape(X)`, the next shape creation call will create a connection from shape X to the new shape. This is essential for building branching workflows — see [Auto-Connect Pattern](#auto-connect-pattern).
- Connection shapes cannot be selected via this method (uses `getShapeById` which only resolves figures).
- This is a side-effect-only operation with no return value.

**Errors:** `SHAPE_NOT_FOUND`

---

### insertBetween

Insert one or more new shapes between two connected shapes. Atomic — wrapped in a canvas transaction.

```ts
sdk.insertBetween(
  sourceId: string,
  targetId: string,
  shapeDefs: { type: ShapeType, params?: Record<string, any> } | Array<{ type: ShapeType, params?: Record<string, any> }>
): WorkflowEditorShapeI[]
```


| Param       | Type                                           | Required | Description                       |
| ----------- | ---------------------------------------------- | -------- | --------------------------------- |
| `sourceId`  | `string`                                       | yes      | ID of the upstream shape          |
| `targetId`  | `string`                                       | yes      | ID of the downstream shape        |
| `shapeDefs` | `{ type, params? } \| Array<{ type, params? }>` | yes      | Shape or shapes to insert in order |


**Behavior:**

1. Verifies a direct connection exists from `sourceId` to `targetId`.
2. Removes that connection.
3. Creates each shape in `shapeDefs` order. During this operation, normal selection-based auto-connect is disabled so unrelated current selection does not create extra connections.
4. Wires the chain: `source → shapeDefs[0] → ... → shapeDefs[n] → target`.
5. Preserves the original source-side port and target-side port when replacing the direct connection. Source-side connection metadata such as label/userData is preserved on the replacement source connection.
6. All operations run inside `startTransaction`/`commitTransaction` for atomic undo; failed mutations roll back.

`shapeDefs` may be either a single shape definition or an array. An empty array is invalid.

Use `insertBetween()` only for the endpoints of an existing direct connection; visual order or reachability through intermediate blocks is not enough. Do not manually remove that connection or add replacement connections—the method performs the complete topology-preserving rewire. Even when one shape definition is supplied, the return value is an array.

**Returns:** `WorkflowEditorShapeI[]` — newly created figure references in insertion order. See [Interfaces > WorkflowEditorShapeI](#workfloweditorshapei).

**Errors:** `INVALID_ARGUMENT`, `NOT_DIRECTLY_CONNECTED`, `SHAPE_NOT_FOUND`, `PORT_NOT_FOUND`, plus any errors from shape creation or connection creation

---

### insertExistingBetween

Move one existing detached shape into a direct connection between two shapes. Use this for a block that is already present on the canvas and has no incoming or outgoing connections.

```ts
sdk.insertExistingBetween(
  sourceId: string,
  targetId: string,
  shapeId: string
): WorkflowEditorShapeI
```


| Param      | Type     | Required | Description                        |
| ---------- | -------- | -------- | ---------------------------------- |
| `sourceId` | `string` | yes      | ID of the upstream shape           |
| `targetId` | `string` | yes      | ID of the downstream shape         |
| `shapeId`  | `string` | yes      | ID of the detached shape to insert |


**Behavior:**

1. Verifies a direct connection exists from `sourceId` to `targetId`.
2. Verifies `shapeId` exists, is not the source or target, is not Start/End/Connection, and has no incoming or outgoing connections.
3. Removes the direct connection.
4. Moves the existing shape into the computed inline position.
5. Wires `source → existingShape → target`.
6. Preserves the original source-side port and target-side port when replacing the direct connection. Source-side connection metadata such as label/userData is preserved on the replacement source connection.
7. Selects the inserted existing shape after successful insertion.
8. Runs inside a canvas transaction unless one is already active; failed mutations roll back when this method owns the transaction.

**Returns:** `WorkflowEditorShapeI` — the existing figure reference that was inserted. See [Interfaces > WorkflowEditorShapeI](#workfloweditorshapei).

**Errors:** `INVALID_ARGUMENT`, `SHAPE_NOT_FOUND`, `NOT_DIRECTLY_CONNECTED`, `PORT_NOT_FOUND`

---

### getModel

Return the current canvas state as a serialized JSON array. No validation is performed.

```ts
sdk.getModel(): CampaignShape[]
```

**Returns:** `CampaignShape[]` — serialized model of all shapes and connections. See [Interfaces > CampaignShape](#campaignshape-serialized-model).

---

### Start/stop configuration SDK references

Detailed SDK notes for `WorkflowStartConfiguration` and `WorkflowStopConfiguration` are loaded on demand by reading the config catalog file from its injected `Catalog File Path` when that file includes an `sdk_api_reference` section.
Use the embedded config reference together with the core rules in this document when generating or editing workflow-level start/stop behavior.

Config objects and records may be intentionally incomplete. Those missing values are reported by `sdk.getShapeConfigurationState()` and by successful executor responses. This is the same advisory pattern as `addShape(...)`: incomplete required values do not roll back the SDK run, but malformed values still fail fast.

### getShapeConfigurationState

Return advisory prompts for shapes or workflow-level start/stop configuration that were created successfully but still need UI-required configuration before the workflow can be considered fully configured.

```ts
sdk.getShapeConfigurationState(): WorkflowSDKConfigurationStateI
```

**Returns:** `WorkflowSDKConfigurationStateI`.

**Behavior:**

- Does not validate the graph and does not throw for incomplete blocks.
- `incompleteParameterizedShapes` contains incomplete shapes created with partial business params, such as `recipient` without `messageId`.
- `incompleteSkeletonShapes` is retained for compatibility and is currently always empty. Skeleton shapes, `{}`, and metadata-only shapes are omitted from advisory output.
- `incompleteStartConfiguration` contains missing required values in the active workflow start configuration.
- `incompleteStopConfiguration` contains missing required values in the workflow stop configuration.
- Fully configured shapes and configurations are omitted from grouped arrays.
- Skips connection shapes.
- Uses runtime shape IDs, so each request can be tied back to the canvas block.
- Workflow-level start/stop configuration requests use `configurationType` instead of `shapeId`/`shapeType`.
- Reports business parameter names, not UI labels.
- Treat the returned `missingParameters` array as the authoritative list for the current canvas state.
- Use the matching block schema and any supplemental block reference to interpret those parameter names and gather valid values.

---

### validate

Validate the workflow graph structure. Returns a result object (does not throw).

```ts
sdk.validate(): ValidationResultI
```

**Returns:** `ValidationResultI` — see [Interfaces > ValidationResultI](#validationresulti).

**Side effect:** Cycles through all figures calling `setCurrentSelection()` on each, then resets selection to the first figure. This triggers per-shape validation in the editor UI.

Checks performed:

- Exactly one Start shape
- All shapes reachable from Start
- When at least one End exists, all shapes have a path to an End
- No duplicate IDs
- No disconnected shapes

The missing-End check is currently disabled. Consequently, a graph with no End shapes does not receive `NO_END` or `NO_PATH_TO_END`; continue to create End blocks for every new workflow and path so the workflow is launch-ready and forward-compatible.

---

### finish

Validate the workflow and return the final `CampaignShape[]` model. Throws on validation failure.

```ts
sdk.finish(): CampaignShape[]
```

**Returns:** `CampaignShape[]` — serialized model. See [Interfaces > CampaignShape](#campaignshape-serialized-model).

**Behavior:**

- Calls `autoLayout()` first.
- Calls `validate()` internally.
- If validation fails, throws `WorkflowGraphError` with the first error code and all error messages joined.
- If validation passes, returns the `CampaignShape[]` model.
- Incomplete shape or start/stop configuration advisories do not make `finish()` throw. They are reported through `getShapeConfigurationState()` and the executor advisory fields.

**Every mutating script must end with `sdk.finish()`.** The executor relies on this to finalize the canvas state.

**Errors:** Any validation error code (see [Error Codes](#error-codes))

---

## ShapeType Enum

All values use the `esputnik.shape.`* namespace. Use the `ShapeType` constant (left column) in your code — never hardcode the string.


| Constant                              | Value                                   |
| ------------------------------------- | --------------------------------------- |
| `ShapeType.START`                     | `esputnik.shape.Start`                  |
| `ShapeType.END`                       | `esputnik.shape.End`                    |
| `ShapeType.CLOCK`                     | `esputnik.shape.Clock`                  |
| `ShapeType.DATE_TIMER`                | `esputnik.shape.DateTimer`              |
| `ShapeType.SEND_EMAIL`                | `esputnik.shape.SendEmail`              |
| `ShapeType.SEND_SMS`                  | `esputnik.shape.SendSMS`                |
| `ShapeType.SEND_VIBER`                | `esputnik.shape.SendViber`              |
| `ShapeType.SEND_WEB_PUSH`             | `esputnik.shape.SendPush`               |
| `ShapeType.SEND_MOBILE_PUSH`          | `esputnik.shape.SendMobPush`            |
| `ShapeType.SEND_APP_INBOX`            | `esputnik.shape.SendPull`               |
| `ShapeType.SEND_TELEGRAM_BOT`         | `esputnik.shape.SendTelegramBot`        |
| `ShapeType.ALTERNATE_SEND`            | `esputnik.shape.AlternateSend`          |
| `ShapeType.SEND_GROUP_EMAIL`          | `esputnik.shape.SendGroupEmail`         |
| `ShapeType.SEND_GROUP_SMS`            | `esputnik.shape.SendGroupSMS`           |
| `ShapeType.SEND_GROUP_VIBER`          | `esputnik.shape.SendGroupViber`         |
| `ShapeType.SEND_GROUP_WEB_PUSH`       | `esputnik.shape.SendGroupWebPush`       |
| `ShapeType.SEND_GROUP_MOBILE_PUSH`    | `esputnik.shape.SendGroupMobPush`       |
| `ShapeType.SEND_GROUP_APP_INBOX`      | `esputnik.shape.SendGroupPull`          |
| `ShapeType.CHECK_IN_GROUP`            | `esputnik.shape.CheckInGroup`           |
| `ShapeType.IS_SENT_MESSAGE`           | `esputnik.shape.IsSentEmail`            |
| `ShapeType.DELIVERED_MESSAGE`         | `esputnik.shape.DeliveredMessage`       |
| `ShapeType.READ_EMAIL`                | `esputnik.shape.ReadEmail`              |
| `ShapeType.OPEN_EMAIL_LINK`           | `esputnik.shape.OpenEmailLink`          |
| `ShapeType.CURRENT_TIME`              | `esputnik.shape.CurrentTime`            |
| `ShapeType.CHECK_POINT`               | `esputnik.shape.CheckPoint`             |
| `ShapeType.SPRAYER`                   | `esputnik.shape.Sprayer`                |
| `ShapeType.WEBHOOK_TASK`              | `esputnik.shape.WebhookTask`            |
| `ShapeType.UPDATE_CUSTOM_FIELDS`      | `esputnik.shape.UpdateCustomFields`     |
| `ShapeType.ADD_CONTACT_TO_GROUP`      | `esputnik.shape.AddContactToGroup`      |
| `ShapeType.DELETE_CONTACT_FROM_GROUP` | `esputnik.shape.DeleteContactFromGroup` |
| `ShapeType.PERCENTAGE_ROUTER`         | `esputnik.shape.PercentageRouter`       |
| `ShapeType.BRANCH`                    | `esputnik.shape.WorkflowBranch`         |
| `ShapeType.CUSTOM`                    | `esputnik.shape.Custom`                 |
| `ShapeType.CUSTOM_CONDITION`          | `esputnik.shape.CustomCondition`        |
| `ShapeType.CONNECTION`                | `esputnik.shape.Connection`             |


> `ShapeType.CONNECTION` is listed for completeness. Never pass it to shape creation methods — use `connect()` instead.

---

## Connection Params

Optional object passed as the third argument to `sdk.connect()`.


| Field            | Type                                 | Default     | Description                                                           |
| ---------------- | ------------------------------------ | ----------- | --------------------------------------------------------------------- |
| `connectionType` | `'YES' | 'NO' | 'OTHER' | 'PERCENT'` | `'OTHER'`   | Semantic type of the connection                                       |
| `label`          | `string`                             | —           | Display label on the connection line (stored as `condition` userData) |
| `percentage`     | `number` (0–100)                     | —           | Required for explicit `PERCENT` connections; auto-derived for `PERCENTAGE_ROUTER` source ports |
| `sourcePort`     | `string`                             | `'output0'` | Source port name (e.g., `'output0'`, `'output1'`)                     |
| `targetPort`     | `string`                             | `'input0'`  | Target port name (e.g., `'input0'`)                                   |


Port naming convention: `output{N}` for output ports, `input{N}` for input ports, where N is a zero-based index. Most shapes have a single `output0`/`input0` pair. Branching shapes (Branch, PercentageRouter, condition checks) expose multiple output ports. For `BRANCH`, branches are checked sequentially in `branches` array order: if `branches[0]` matches, routing goes to `output0`; otherwise `branches[1]` is checked and routes to `output1` if it matches; then later branches are checked the same way. For `PERCENTAGE_ROUTER`, `output0` is branch index 0, `output1` is branch index 1, and so on.

Connection colors are assigned automatically by the editor service — there is no SDK-level color parameter.

---

## Block-Specific SDK References

The core SDK reference covers shared execution mechanics, graph rules, alias compilation rules, and common patterns.

Detailed SDK behavior for specific block types is loaded on demand by reading the block catalog file from its injected `Catalog File Path` when that file includes an `sdk_api_reference` section.

When a loaded block catalog file includes an additional `<sdk_api_reference>` section, treat that section and this core SDK reference together as the source of truth for that block.

---
## Auto-Connect Pattern

`addShape()` automatically connects the new shape from the currently selected shape. This is the primary mechanism for building workflows — **do not call `connect()` for the normal flow**.

### How it works

1. Each shape creation call creates a connection from the currently selected shape to the new shape.
2. After `addShape()`, the new shape becomes the current selection.
3. Sequential shape creation calls produce a linear chain automatically.

### When to use `connect()`

Only use `connect()` when you need to wire two **already existing** shapes:
- Reconnecting after `removeShape()`
- Wiring a shape's specific output port to an already existing target (e.g., both YES and NO outputs of a CHECK_IN_GROUP going to the same downstream shape)
- Wiring a specific `PERCENTAGE_ROUTER` branch by port (e.g., `sdk.connect(router.id, target.id, { sourcePort: 'output1' })`)

### Branching shapes (multiple output ports)

Shapes like `BRANCH`, `CHECK_IN_GROUP`, `PERCENTAGE_ROUTER` have multiple output ports. To build each branch:

- For `BRANCH`, the `branches` array defines evaluation order and port mapping. Check `branches[0]` first, otherwise `branches[1]`, then later branches in order, and route through the first matching branch. `outputN` maps to `branches[N]`.

1. Add the branching shape — it becomes the current selection.
2. Call `addShape()` to start the first branch chain. The editor connects from the first available output port.
3. Continue adding shapes to complete that branch (ending with `ShapeType.END` or connecting to an existing shape).
4. Call `sdk.selectShape(branchingShape.id)` to go back to the branching shape.
5. Create another shape — the editor now connects from the next available output port.
6. Repeat steps 3–5 for each branch.

When updating an existing `BRANCH`, `sdk.updateShape(branch.id, { branches })` changes labels/conditions and preserves routes for matching existing branches. It does not create or validate downstream paths for newly added branch outputs; after increasing the number of non-default branches, return to the branch with `sdk.selectShape(branch.id)` and build each new output path.

For `PERCENTAGE_ROUTER`, use `sdk.connect(router.id, target.id, { sourcePort: 'outputN' })` when wiring a branch to a shape that already exists. The SDK derives the branch percentage from the router params and stores it on the connection automatically.

---

## Usage Mode: Build from Scratch

When building a new workflow, all newly created shape IDs come from `sdk.addShape()` return values. In the client editor, the Start block is typically already present on the canvas, so use its existing ID from the current workflow state or `sdk.findShapes(ShapeType.START)`.

### Steps

1. Create shapes sequentially with `sdk.addShape()` — each auto-connects to the previous one.
2. For branching shapes, use `sdk.selectShape()` to return to the branch and build each output path.
3. Use `sdk.connect()` only when wiring two already existing shapes together.
4. Call `sdk.finish()` to validate and finalize.

### Rules

- Every workflow must have exactly one `ShapeType.START` and at least one `ShapeType.END`.
- Every shape must be reachable from Start and must have a path to an End.
- Never hardcode shape IDs — always use the `.id` from shape creation return values.
- Do not call `connect()` to wire shapes that were just created by `addShape()` — auto-connect handles this.

### Example: Linear email sequence with timers

```js
const start = sdk.findShapes(ShapeType.START)[0];
sdk.addShape(ShapeType.SEND_EMAIL);
sdk.addShape(ShapeType.CLOCK, {
  waitTime: true,
  waitUntilDate: false,
  duration: '24',
  durationItem: 'Hours',
});
sdk.addShape(ShapeType.SEND_EMAIL);
sdk.addShape(ShapeType.CLOCK, {
  waitTime: true,
  waitUntilDate: false,
  duration: '24',
  durationItem: 'Hours',
});
sdk.addShape(ShapeType.SEND_EMAIL);
sdk.addShape(ShapeType.END);

sdk.finish();
```

### Example: Branching workflow with selectShape

```js
const start = sdk.findShapes(ShapeType.START)[0];
const branch = sdk.addShape(ShapeType.BRANCH, {
  branches: [
    { label: 'Path A', isDefault: false, ORConditions: [{ ANDConditions: [{ checkType: 1, fieldId: 'email', operator: 'IS_SET', value: '' }] }] },
    { label: 'Path B', isDefault: true, ORConditions: [] },
  ],
});

// Branch output 0: Path A
sdk.addShape(ShapeType.SEND_EMAIL);
sdk.addShape(ShapeType.END);

// Go back to branch for output 1: Path B
sdk.selectShape(branch.id);
sdk.addShape(ShapeType.SEND_SMS);
sdk.addShape(ShapeType.END);

sdk.finish();
```

---

## Usage Mode: Modify Existing Workflow

When modifying a workflow that already exists on the canvas, shapes have stable IDs that you receive in the task context.

### ID Handling Rules

- **Existing shapes**: Use the known IDs directly (provided in the modification request).
- **New shapes**: IDs come from `sdk.addShape()` return values.
- **Never fabricate IDs** — either reference known existing IDs or capture from shape creation return values.

### Diff Analysis Approach

Before writing SDK code, analyze what changed between the current workflow and the desired outcome:

1. **Identify shapes that stay** — existing shapes that remain unchanged need no SDK calls.
2. **Identify shapes to add** — new shapes need `addShape()` or `insertBetween()`.
3. **Identify shapes to remove** — use `bypassShape()` when paths must continue through a removable one-outgoing shape; use `removeShape()` only for intentional path deletion or a separately specified rewire.
4. **Identify shapes to update** — shapes whose parameters changed need `updateShape()`.
5. **Identify detached shapes to move inline** — existing shapes already on canvas need `insertExistingBetween()` only when they are detached and should be placed into a direct connection.
6. **Choose minimal operations** — prefer `insertBetween()` over manual shape creation + `connect()` when creating new shapes between two connected shapes; prefer `insertExistingBetween()` when moving an existing detached shape into that connection.

### Operation Selection Guide


| Scenario                                                        | Preferred Operation                                           |
| --------------------------------------------------------------- | ------------------------------------------------------------- |
| Insert new shape(s) between two connected shapes                | `insertBetween(sourceId, targetId, shapeDefOrShapeDefs)`      |
| Move an existing detached shape between two connected shapes    | `insertExistingBetween(sourceId, targetId, shapeId)`          |
| Add a new branch or parallel path                               | Update Branch params if needed, then `selectShape(branch.id)` + shape creation for each new output |
| Remove a one-outgoing shape while preserving all incoming paths | `bypassShape(id)`                                             |
| Delete a shape and its attached paths intentionally             | `removeShape(id)`                                             |
| Change parameters of an existing shape                          | `updateShape(id, params)`                                     |


### Example: Insert a timer between two shapes

```js
const startId = '_dec501ec1b48aec02aa91c43ac846659';
const email1Id = '_c94deb3b249cd3f2f95f62d33d350f8d';

sdk.insertBetween(startId, email1Id, [
  {
    type: ShapeType.CLOCK,
    params: {
      waitTime: true,
      waitUntilDate: false,
      duration: '2',
      durationItem: 'Hours',
    },
  }
]);

sdk.finish();
```

### Example: Remove a pass-through shape and preserve the path

```js
const clock1Id = '_39c8da6f99b0c7d86bdce3d291007a57';

sdk.bypassShape(clock1Id);

sdk.finish();
```

### Example: Remove explicitly requested unnamed Check points

An empty Check point name is not sufficient evidence that the block is redundant. Use this pattern only after the user explicitly asks to remove unnamed Check points. It preflights every selected block before making changes; if any candidate is not an `N incoming → 1 outgoing` merge/pass-through, the script fails without keeping partial changes.

```js
const checkpoints = sdk.findShapes(ShapeType.CHECK_POINT);
const checkpointIds = [];

for (const checkpoint of checkpoints) {
  const params = sdk.getShapeParams(checkpoint.id) || {};
  const name = String(params.checkPointName || '').trim();

  if (name === '') {
    checkpointIds.push(checkpoint.id);
  }
}

for (const checkpointId of checkpointIds) {
  const incoming = sdk.findConnections({ targetId: checkpointId });
  const outgoing = sdk.findConnections({ sourceId: checkpointId });

  if (incoming.length < 1 || outgoing.length !== 1) {
    throw new Error(
      `Cannot safely bypass Check point '${checkpointId}': expected at least one incoming and exactly one outgoing connection`,
    );
  }
}

for (const checkpointId of checkpointIds) {
  sdk.bypassShape(checkpointId);
}

sdk.finish();
```

### Example: Update shape parameters

```js
const clock1Id = '_39c8da6f99b0c7d86bdce3d291007a57';

sdk.updateShape(clock1Id, {
  waitTime: false,
  waitUntilDate: true,
  waitUntilType: 'SPECIFIC_TIME',
  hours: '22',
  durationItem: '',
  duration: '',
});

sdk.finish();
```

### Example: Insert one new shape between directly connected shapes

```js
const firstEmailId = '_c94deb3b249cd3f2f95f62d33d350f8d';
const firstTimerId = '_39c8da6f99b0c7d86bdce3d291007a57';

// firstEmailId -> firstTimerId must be a direct connection in the current model.
sdk.insertBetween(firstEmailId, firstTimerId, {
  type: ShapeType.SEND_EMAIL,
});

sdk.finish();
```

### Example: Move a detached shape into a direct connection

```js
const sourceId = '_c94deb3b249cd3f2f95f62d33d350f8d';
const targetId = '_39c8da6f99b0c7d86bdce3d291007a57';
const detachedShapeId = '_87cbe5a798fea80fc3100708f0642f06';

sdk.insertExistingBetween(sourceId, targetId, detachedShapeId);

sdk.finish();
```

---

## Error Codes

All errors extend `WorkflowSDKError` with a `.code` property. The executor catches these and returns them as structured `ExecutionResultI` objects.

### General Operation Errors

| Code               | Error Class        | When                                                                                                     |
| ------------------ | ------------------ | -------------------------------------------------------------------------------------------------------- |
| `INVALID_ARGUMENT` | `WorkflowSDKError` | A method receives an unsupported argument or topology, such as an empty `insertBetween()` definition list, an attached shape passed to `insertExistingBetween()`, or a `bypassShape()` target without at least one incoming and exactly one outgoing connection |

### Shape Errors


| Code                   | Error Class                                 | When                                                                                                                                                                  |
| ---------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UNKNOWN_SHAPE_TYPE`   | `WorkflowSDKError`                          | Shape creation called with `ShapeType.CONNECTION`                                                                                                                     |
| `SHAPE_NOT_REGISTERED` | `WorkflowSDKError`                          | Canvas failed to instantiate the shape (internal)                                                                                                                     |
| `SHAPE_NOT_FOUND`      | `ShapeValidationError` or `ConnectionError` | Shape ID does not exist on the canvas                                                                                                                                 |
| `SHAPE_NOT_DELETEABLE` | `ShapeValidationError`                      | `removeShape()` called on Start or End, or `bypassShape()` called on Start, End, or Connection                                                                         |
| `TYPE_MISMATCH`        | `ShapeValidationError`                      | `updateShape()` called on a connection                                                                                                                                |
| `SHAPE_NOT_CONFIGURED` | `ShapeValidationError` or `ConnectionError` | Param validation failed (unknown field, wrong type, invalid concrete value) or a provided concrete non-empty reference field (`messageId`, `groupId`, `appUUID`) could not be resolved. Missing UI-required fields are advisory and reported by configuration state. Creation-time and `updateShape()` draft placeholders may be omitted as skeleton input when safe. Thrown as `ShapeValidationError` for shape params and `ConnectionError` for connection params. |


### Connection Errors


| Code                     | Error Class       | When                                                                     |
| ------------------------ | ----------------- | ------------------------------------------------------------------------ |
| `SELF_CONNECTION`        | `ConnectionError` | `sourceId === targetId`                                                  |
| `PORT_NOT_FOUND`         | `ConnectionError` | Named port does not exist on the shape                                   |
| `NOT_DIRECTLY_CONNECTED` | `ConnectionError` | `insertBetween()` or `insertExistingBetween()` called but no direct connection exists between the two endpoint shapes |
| `INVALID_CONNECTION_REF` | `ConnectionError` | Connection was created but could not be located on canvas (internal)     |


### Graph Validation Errors (from `finish()` / `validate()`)


| Code                     | Error Class          | When                                           |
| ------------------------ | -------------------- | ---------------------------------------------- |
| `EMPTY_WORKFLOW`         | `WorkflowGraphError` | No shapes on canvas                            |
| `NO_START`               | `WorkflowGraphError` | Missing Start shape                            |
| `MULTIPLE_STARTS`        | `WorkflowGraphError` | More than one Start shape                      |
| `UNREACHABLE_FROM_START` | `WorkflowGraphError` | Shape not reachable from Start via connections |
| `NO_PATH_TO_END`         | `WorkflowGraphError` | Shape has no path to any End shape             |
| `DUPLICATE_ID`           | `WorkflowGraphError` | Two shapes share the same ID                   |
| `SHAPE_NOT_CONNECTED`    | `WorkflowGraphError` | Shape has no connections at all                |
| `INVALID_CONNECTION_REF` | `WorkflowGraphError` | Connection references a non-existent shape ID  |


### Layout Errors (currently disabled)

These codes are defined but layout validation is not active. Listed for forward-compatibility.


| Code                   | When                                            |
| ---------------------- | ----------------------------------------------- |
| `LAYOUT_BOUNDS`        | Shape has negative coordinates                  |
| `LAYOUT_OVERLAP_EXACT` | Two shapes share the same position              |
| `LAYOUT_DIRECTION`     | Connection target is not to the right of source |


---

## Output Constraints

- The script must be valid JavaScript (no TypeScript syntax, no imports).
- `ShapeType` is available as a global — use `ShapeType.SEND_EMAIL`, not the string literal.
- Every script that mutates the workflow must end with `sdk.finish()`.
- Read-only config inspection snippets may omit `sdk.finish()`.
- Keep scripts minimal — only the operations needed to achieve the requested change.
- Do not read or write files, access the network, or use `setTimeout`/`setInterval`.
