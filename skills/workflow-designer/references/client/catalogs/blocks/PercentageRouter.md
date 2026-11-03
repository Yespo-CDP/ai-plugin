<catalog_brief>
name: PercentageRouter
ui_name: Split
category: routing
sdk_block_type: PercentageRouter
functionality: splits traffic across multiple outgoing paths by percentage. In the editor this block is shown as `Split`.
purpose: use it when contacts should be distributed probabilistically rather than by business rules.
when_to_use: use it for traffic allocation, holdouts, controlled experiments, or percent-based audience splits across two or more paths.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PercentageRouter block",
  "description": "Schema for the Workflow Designer PercentageRouter block (`esputnik.shape.PercentageRouter`). Use this block to split contacts across multiple outgoing paths by percentage. Author in the SDK-facing format: either request an even split with `splitEvenly: true` and `branchNumber`, or provide an explicit `branches` percentage array.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "splitEvenly": {
      "type": "boolean",
      "description": "Set `true` to distribute contacts as evenly as possible across `branchNumber` outputs. Omit this field or set it to `false` when you want to provide explicit percentages in `branches`."
    },
    "branchNumber": {
      "type": "integer",
      "minimum": 2,
      "maximum": 10,
      "description": "Number of output branches for an even split. Use this only when `splitEvenly` is `true`."
    },
    "branches": {
      "type": "array",
      "minItems": 2,
      "maxItems": 10,
      "description": "Explicit percentage allocation by branch index. Each item is the percentage for one outgoing path in order: item 0 maps to `output0`, item 1 to `output1`, and so on. All values must sum to `100`.",
      "items": {
        "type": "number",
        "minimum": 0,
        "maximum": 100
      }
    },
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the percentage split block. Use it to explain the business purpose of the split for other workflow editors."
    }
  },
  "oneOf": [
    {
      "required": [
        "splitEvenly",
        "branchNumber"
      ],
      "properties": {
        "splitEvenly": {
          "const": true
        }
      },
      "not": {
        "required": [
          "branches"
        ]
      }
    },
    {
      "required": [
        "branches"
      ],
      "properties": {
        "splitEvenly": {
          "enum": [
            false
          ]
        }
      },
      "not": {
        "required": [
          "branchNumber"
        ]
      }
    }
  ]
}
</schema>

<sdk_api_reference>
## PercentageRouter Shape Params

Percentage routers (`ShapeType.PERCENTAGE_ROUTER`) split contacts by percentages. SDK code must use the agent-facing params below; do not provide draw2d `portName` values.

### PercentageRouterShapeParamsI

```ts
type PercentageRouterShapeParamsI =
  | {
      blockDescription?: string;
      splitEvenly: true;
      branchNumber: number;
      branches?: never;
    }
  | {
      blockDescription?: string;
      splitEvenly?: false;
      branches: number[];
      branchNumber?: never;
    };
```

### Example: even split

```js
const router = sdk.addShape(ShapeType.PERCENTAGE_ROUTER, {
  splitEvenly: true,
  branchNumber: 3,
});
```

For three branches, the SDK writes internal draw2d branch percentages as `33`, `33`, `34`.

### Example: custom split

```js
const router = sdk.addShape(ShapeType.PERCENTAGE_ROUTER, {
  splitEvenly: false,
  branches: [50, 30, 20],
});
```

`splitEvenly: false` can be omitted for custom splits:

```js
sdk.updateShape(router.id, {
  branches: [70, 30],
});
```

### Connecting a specific percentage branch

Use `connect()` with `sourcePort`. There is no separate PercentageRouter-specific connection method.

```js
sdk.connect(router.id, existingTarget.id, {
  sourcePort: 'output2',
});
```

When the source shape is a `PERCENTAGE_ROUTER`, the SDK looks up the percentage for the selected output port and writes the connection metadata as `PERCENT` automatically. Do not pass `percentage` for these connections; the router branch configuration is the source of truth.

### Behavior Notes

- Custom percentages must sum to `100`.
- Branch entries must be numbers only. Objects like `{ portName: 'output0', percentage: 50 }` are invalid in SDK code.
- Internally, the SDK writes draw2d branches as `{ portName, percentage }`. On `updateShape()`, existing `portName` values are preserved by branch index; new branches get `portName: null` so draw2d assigns the real output port.
- `sdk.getShapeParams()` returns the SDK-facing format: even split routers return `{ splitEvenly: true, branchNumber }`; custom routers return `{ splitEvenly: false, branches: number[] }`.

---
</sdk_api_reference>

