<catalog_brief>
name: WorkflowStopConfiguration
functionality: defines when and how a workflow should automatically finish. Supports 3 configuration types: 1. finish on event with optional tracking interval; 2. finish when included in a specific dynamic segment; 3. finish on an order, with an OPTIONAL look-back window such as 7 days. The order window is optional: omit intervalCount and keep intervalUnit to finish on any order placed after the workflow starts.
</catalog_brief>

<schema>
{
  "type": "function",
  "name": "workflow_stop_config",
  "description": "Creates the schema-shaped stop configuration record that must be converted with WorkflowStopConfigurationAdapter.fromRecord(...) before sdk.setStopConfiguration(...). The system supports 3 configuration types:\n\n1. EVENT_BASED: Finish the workflow when a specific event occurs, with an optional tracking interval.\n\n2. GROUP_BASED: Finish the workflow when the contact is included in a specific dynamic segment.\n\n3. ORDER_BASED: Finish the workflow when the contact places an order, with an OPTIONAL look-back window. The window is a look-back: it only extends the stop to contacts who placed an order during that period BEFORE the workflow started. An order placed after the workflow starts always finishes it, window or no window. Omit `intervalCount` unless a look-back was explicitly requested; never invent one. Keep `intervalUnit` (the windowless record ships \"Days\"): the stored record carries it beside a blank `intervalCount`.\n\nUse Reteno MCP `get_organisation_info` when you need to retrieve eventTypeId or groupId values for the configuration. Copy identifier fields exactly from matching returned entries and do not derive IDs from names. `enabled` maps to the runtime `isExitFromWorkflow` flag only. An order-based look-back like \"7 days\" is an explicit stop-config field and must be modeled directly in the record when it is requested; when no look-back is requested, omit `intervalCount` only, rather than substituting a default; `intervalUnit` stays.",
  "strict": false,
  "parameters": {
    "type": "object",
    "additionalProperties": false,
    "required": ["enabled"],
    "properties": {
      "enabled": {
        "type": "boolean",
        "description": "Whether stop configuration is enabled. If false, omit type/params and do not create stop behavior."
      },
      "type": {
        "type": "string",
        "description": "Stop configuration type.",
        "enum": [
          "EVENT_BASED",
          "GROUP_BASED",
          "ORDER_BASED"
        ]
      },
      "params": {
        "type": "object",
        "description": "Type-specific stop configuration parameters. The allowed shape depends on `type`."
      }
    },
    "allOf": [
      {
        "if": {
          "properties": { "enabled": { "const": false } },
          "required": ["enabled"]
        },
        "then": {
          "not": {
            "anyOf": [
              { "required": ["type"] },
              { "required": ["params"] }
            ]
          }
        }
      },
      {
        "if": {
          "properties": { "enabled": { "const": true } },
          "required": ["enabled"]
        },
        "then": { "required": ["type", "params"] }
      },
      {
        "if": {
          "properties": { "enabled": { "const": true }, "type": { "const": "EVENT_BASED" } },
          "required": ["enabled", "type"]
        },
        "then": {
          "required": ["params"],
          "properties": {
            "params": {
              "type": "object",
              "additionalProperties": false,
              "required": ["eventTypeId"],
              "properties": {
                "eventTypeId": {
                  "type": "string",
                  "minLength": 1,
                  "description": "Event type ID that finishes the workflow. When you provide a value, use the exact identifier returned by Reteno MCP `get_organisation_info` for the selected event type; do not derive it from the event name."
                },
                "intervalCount": {
                  "type": "string",
                  "pattern": "^[1-9]\\d*$",
                  "description": "Optional positive integer string for the event tracking window, e.g. \"7\"."
                },
                "intervalUnit": {
                  "type": "string",
                  "description": "Optional time unit for intervalCount.",
                  "enum": ["Minutes", "Hours", "Days", "Weeks", "Months"]
                }
              },
              "allOf": [
                {
                  "if": { "required": ["intervalCount"] },
                  "then": { "required": ["intervalUnit"] }
                },
                {
                  "if": { "required": ["intervalUnit"] },
                  "then": { "required": ["intervalCount"] }
                }
              ]
            }
          }
        }
      },
      {
        "if": {
          "properties": { "enabled": { "const": true }, "type": { "const": "GROUP_BASED" } },
          "required": ["enabled", "type"]
        },
        "then": {
          "required": ["params"],
          "properties": {
            "params": {
              "type": "object",
              "additionalProperties": false,
              "required": ["groupId"],
              "properties": {
                "groupId": {
                  "type": "string",
                  "minLength": 1,
                  "description": "Dynamic segment / group ID that finishes the workflow. When you provide a value, use the exact `id` value from the chosen `segments` entry returned by Reteno MCP `get_organisation_info`; do not derive it from the segment name."
                }
              }
            }
          }
        }
      },
      {
        "if": {
          "properties": { "enabled": { "const": true }, "type": { "const": "ORDER_BASED" } },
          "required": ["enabled", "type"]
        },
        "then": {
          "required": ["params"],
          "properties": {
            "params": {
              "type": "object",
              "additionalProperties": false,
              "required": ["intervalUnit"],
              "properties": {
                "intervalCount": {
                  "type": "string",
                  "pattern": "^[1-9]\\d*$",
                  "description": "OPTIONAL positive integer string for the order look-back window, e.g. \"7\". Omit it to finish on any order placed after the workflow starts; do not invent a value to fill it."
                },
                "intervalUnit": {
                  "type": "string",
                  "description": "Time unit for the order look-back window.",
                  "enum": ["Minutes", "Hours", "Days", "Weeks", "Months"]
                }
              }
            }
          }
        }
      }
    ]
  }
}
</schema>

<sdk_api_reference>
## WorkflowStopConfiguration SDK Reference

Use these methods and rules when the loaded catalog entry is `WorkflowStopConfiguration`.

### setStopConfiguration

Store canonical workflow stop configuration and sync it to Start-shape compatibility fields when a Start block exists.

```ts
sdk.setStopConfiguration(config: StopWorkflowConfigurationI | null): void
```

Use `WorkflowStopConfigurationAdapter.fromRecord(...)` before this call.
Prefer this API over editing raw Start-block stop fields directly.
Use `sdk.setStopConfiguration(null)` to clear stop configuration. A schema record with `enabled: false` can also be converted, but it should not include `type` or `params`.

Stop configuration records may be intentionally incomplete. Missing values are reported by `sdk.getShapeConfigurationState()` and by successful executor responses. Incomplete required values do not roll back the SDK run, but malformed values still fail fast. Unknown stop configuration types, invalid enum values, wrong field types, unsupported fields, and invalid interval pairs throw `INVALID_STOP_CONFIGURATION`.

Stop configurations that include a non-empty `groupId` are reference-validated before they are stored or synchronized to the Start shape. If the group cannot be resolved from loaded groups, `sdk.setStopConfiguration(...)` throws `SHAPE_NOT_CONFIGURED` and the previous stop configuration is preserved. Empty `groupId` is treated as missing configuration, not as an unresolved reference.

### Examples

Clear stop configuration:

```js
sdk.setStopConfiguration(null);
```

Disabled stop configuration record:

```js
sdk.setStopConfiguration(
  WorkflowStopConfigurationAdapter.fromRecord({
    enabled: false,
  })
);
```

Finish when an event occurs:

```js
sdk.setStopConfiguration(
  WorkflowStopConfigurationAdapter.fromRecord({
    enabled: true,
    type: 'EVENT_BASED',
    params: {
      eventTypeId: '123',
    },
  })
);
```

Finish when an event occurs within a tracking window:

```js
sdk.setStopConfiguration(
  WorkflowStopConfigurationAdapter.fromRecord({
    enabled: true,
    type: 'EVENT_BASED',
    params: {
      eventTypeId: '123',
      intervalCount: '7',
      intervalUnit: 'Days',
    },
  })
);
```

Finish when contact enters a segment:

```js
sdk.setStopConfiguration(
  WorkflowStopConfigurationAdapter.fromRecord({
    enabled: true,
    type: 'GROUP_BASED',
    params: {
      groupId: '789',
    },
  })
);
```

Finish by order, no window:

```js
sdk.setStopConfiguration(
  WorkflowStopConfigurationAdapter.fromRecord({
    enabled: true,
    type: 'ORDER_BASED',
    params: {
      intervalUnit: 'Days',
    },
  })
);
```

This is the complete record for "finish when the contact orders". The executor reports
`Stop configuration needs intervalCount.` and an `incompleteStopConfiguration` entry for it
beside `success: true`. That report is ADVISORY: the run does not roll back and the record lands
as written. Do not answer it by adding an `intervalCount` — a look-back window suppresses
contacts who ordered BEFORE the workflow started, which is a different behaviour from the one
that was asked for.

Finish by order within a look-back window:

```js
sdk.setStopConfiguration(
  WorkflowStopConfigurationAdapter.fromRecord({
    enabled: true,
    type: 'ORDER_BASED',
    params: {
      intervalCount: '7',
      intervalUnit: 'Days',
    },
  })
);
```

Use this form only when a look-back was explicitly requested.

### getStopConfiguration

Read the current canonical workflow stop configuration.

```ts
sdk.getStopConfiguration(): StopWorkflowConfigurationI | null
```

Returns the stored stop config, or derives it from Start-shape stop fields when needed.
Treat the canonical value returned here as the source of truth for stop behavior.
</sdk_api_reference>

