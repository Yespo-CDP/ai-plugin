<catalog_brief>
name: WorkflowStartConfiguration
functionality: defines when and how a workflow should be triggered. Supports 4 runtime trigger types: 1. BY_EVENT with optional event-parameter filters and uniqueness control; 2. REGULAR scheduled launch for a contact segment with uniqueness control; 3. BY_CONTACT_FIELD_CHANGED when a contact field changes; 4. EVENT_BASED_WITH_SEGMENT_PARAMETERS when an event occurs for contacts in a specific segment
</catalog_brief>

<schema>
{
  "type": "function",
  "name": "workflow_start_config",
  "description": "Creates the active workflow start configuration object accepted by sdk.setStartConfiguration(...). This schema uses the same shape returned by get_workflow_state.startConfig: trigger, configurationEnabled, avoidRun, plus exactly the active trigger branch.\n\nSupported trigger values:\n\n1. BY_EVENT: Start the workflow when a specific event occurs. Supports event-parameter filters and uniqueness control.\n\n2. REGULAR: Start the workflow on a schedule for contacts in a specific segment. Supports time windows, repeat settings, and uniqueness control.\n\n3. BY_CONTACT_FIELD_CHANGED: Start the workflow when a specific contact field changes.\n\n4. EVENT_BASED_WITH_SEGMENT_PARAMETERS: Start the workflow when a specific event occurs, but only for contacts that belong to a specific segment. In this trigger, groupId is a string value.\n\nUse Reteno MCP `get_organisation_info` only when organisation data is needed to resolve eventTypeId, groupId, contactFieldId, segment names, event names, or event parameter names. Copy identifier fields exactly from the chosen returned entry and do not derive IDs from names. To keep a manual start or clear existing start behavior, do not create this object; call sdk.setStartConfiguration(null).",
  "strict": false,
  "parameters": {
    "type": "object",
    "additionalProperties": false,
    "required": ["trigger", "configurationEnabled", "avoidRun"],
    "properties": {
      "trigger": {
        "type": "string",
        "description": "Runtime trigger that defines how the workflow starts.",
        "enum": [
          "BY_EVENT",
          "REGULAR",
          "BY_CONTACT_FIELD_CHANGED",
          "EVENT_BASED_WITH_SEGMENT_PARAMETERS"
        ]
      },
      "configurationEnabled": {
        "type": "boolean",
        "const": true,
        "description": "Must be true for an active start configuration. Use sdk.setStartConfiguration(null) instead of this schema when the workflow should remain manually started or when existing start behavior should be cleared."
      },
      "avoidRun": {
        "type": "boolean",
        "description": "Whether to enable the platform-level repeated-run guard for this workflow start configuration. Use false by default unless the user explicitly asks to avoid repeated workflow runs."
      },
      "eventTypeTrigger": {
        "type": "object",
        "description": "Active branch for trigger=BY_EVENT. Starts the workflow from a chosen event type and optional event-parameter filters.",
        "additionalProperties": false,
        "required": ["eventTypeId", "eventTypeName", "uniqueType", "parameters"],
        "properties": {
          "eventTypeId": {
            "type": "integer",
            "minimum": 1,
            "description": "Identifier of the event type that starts the workflow. Use the exact ID from the matching event type returned by Reteno MCP `get_organisation_info`."
          },
          "eventTypeName": {
            "type": "string",
            "minLength": 1,
            "description": "Display name of the event type that matches eventTypeId."
          },
          "uniqueType": {
            "type": "string",
            "description": "Uniqueness policy for event-based starts. EVERY_TIME allows every matching event to start the workflow, ONE_TIME allows only one start per contact, and CUSTOM uses timeValue/timeUnit as a cooldown window.",
            "enum": ["EVERY_TIME", "ONE_TIME", "CUSTOM"]
          },
          "timeValue": {
            "type": "integer",
            "minimum": 1,
            "description": "Cooldown interval value for uniqueType=CUSTOM. Omit or leave at the runtime default for EVERY_TIME and ONE_TIME."
          },
          "timeUnit": {
            "type": "string",
            "description": "Cooldown interval unit for uniqueType=CUSTOM. Omit or leave at the runtime default for EVERY_TIME and ONE_TIME.",
            "enum": ["MINUTES", "HOURS", "DAYS", "WEEKS", "MONTHS"]
          },
          "parameters": {
            "type": "array",
            "description": "Event-parameter filter blocks. Use [] when the event alone should start the workflow. Multiple blocks are alternatives; all conditions inside one block must match.",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": ["eventParameters"],
              "properties": {
                "eventParameters": {
                  "type": "array",
                  "minItems": 1,
                  "description": "Conditions that must all match within this filter block.",
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["name", "condition"],
                    "properties": {
                      "name": {
                        "type": "string",
                        "minLength": 1,
                        "description": "Event parameter name to compare. Use the exact parameter key from the selected event type."
                      },
                      "condition": {
                        "type": "string",
                        "description": "Comparison operator for this event parameter. IS_SET and IS_EMPTY do not need a value. ONE_OF and DOES_NOT_ONE_OF use comma-separated values.",
                        "enum": [
                          "EQUALS",
                          "DOES_NOT_EQUAL",
                          "IS_SET",
                          "IS_EMPTY",
                          "CONTAINS",
                          "DOES_NOT_CONTAIN",
                          "STARTS_WITH",
                          "DOES_NOT_START_WITH",
                          "ENDS_WITH",
                          "DOES_NOT_END_WITH",
                          "ONE_OF",
                          "DOES_NOT_ONE_OF"
                        ]
                      },
                      "value": {
                        "type": "string",
                        "description": "Comparison value. Required for every condition except IS_SET and IS_EMPTY. For ONE_OF and DOES_NOT_ONE_OF, provide non-empty comma-separated values."
                      }
                    },
                    "allOf": [
                      {
                        "if": {
                          "properties": {
                            "condition": {
                              "enum": [
                                "EQUALS",
                                "DOES_NOT_EQUAL",
                                "CONTAINS",
                                "DOES_NOT_CONTAIN",
                                "STARTS_WITH",
                                "DOES_NOT_START_WITH",
                                "ENDS_WITH",
                                "DOES_NOT_END_WITH",
                                "ONE_OF",
                                "DOES_NOT_ONE_OF"
                              ]
                            }
                          },
                          "required": ["condition"]
                        },
                        "then": {
                          "required": ["value"],
                          "properties": {
                            "value": {
                              "type": "string",
                              "minLength": 1
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        },
        "allOf": [
          {
            "if": {
              "properties": { "uniqueType": { "const": "CUSTOM" } },
              "required": ["uniqueType"]
            },
            "then": { "required": ["timeValue", "timeUnit"] }
          }
        ]
      },
      "regularTrigger": {
        "type": "object",
        "description": "Active branch for trigger=REGULAR. Starts the workflow on a schedule for contacts in a selected segment.",
        "additionalProperties": false,
        "required": ["groupId", "schedule", "startDate", "uniqueType"],
        "properties": {
          "groupId": {
            "type": "integer",
            "minimum": 1,
            "description": "Identifier of the contact segment. Use the exact id from the chosen segments entry returned by Reteno MCP `get_organisation_info`."
          },
          "schedule": {
            "type": "string",
            "description": "Schedule mode. ASAP means the workflow checks and starts for eligible contacts once an hour. DAILY, WEEKLY, MONTHLY, and SCHEDULED use the explicit time window and repeat settings.",
            "enum": ["ASAP", "DAILY", "WEEKLY", "MONTHLY", "SCHEDULED"]
          },
          "startDate": {
            "type": "string",
            "description": "Date from which the scheduled workflow can start, in YYYY-MM-DD format. Use the user's requested date, or today/future date when the user asks to start now.",
            "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
          },
          "startHour": {
            "type": "integer",
            "minimum": 0,
            "maximum": 23,
            "description": "Start hour of the daily execution window in 24-hour time. Use with scheduled modes other than ASAP. When both startHour and endHour are supplied, endHour must be exactly one hour after startHour, with 23 to 0 allowed."
          },
          "endHour": {
            "type": "integer",
            "minimum": 0,
            "maximum": 23,
            "description": "End hour of the daily execution window in 24-hour time. Must be exactly one hour after startHour when both are supplied, with 23 to 0 allowed."
          },
          "repeatOn": {
            "type": "array",
            "description": "Days when the schedule may run. Use only when the user asks for day filtering or when a weekly/monthly schedule needs explicit days. Omit to keep runtime defaults.",
            "items": {
              "type": "string",
              "enum": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
            },
            "minItems": 1,
            "uniqueItems": true
          },
          "repeatValue": {
            "type": "integer",
            "minimum": 1,
            "description": "Repeat interval value for schedule=SCHEDULED."
          },
          "repeatUnit": {
            "type": "string",
            "description": "Repeat interval unit for schedule=SCHEDULED.",
            "enum": ["DAY", "WEEK", "MONTH"]
          },
          "endDate": {
            "description": "Optional last date of the scheduling window in YYYY-MM-DD format. Omit for no explicit end date.",
            "anyOf": [
              { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$" },
              { "type": "string", "const": "" }
            ]
          },
          "uniqueType": {
            "type": "string",
            "description": "Uniqueness policy for regular starts. EVERY_TIME allows every eligible schedule run, ONE_TIME allows one start per contact, and CUSTOM uses timeValue/timeUnit as a cooldown window.",
            "enum": ["EVERY_TIME", "ONE_TIME", "CUSTOM"]
          },
          "timeValue": {
            "type": "integer",
            "minimum": 1,
            "description": "Cooldown interval value for uniqueType=CUSTOM."
          },
          "timeUnit": {
            "type": "string",
            "description": "Cooldown interval unit for uniqueType=CUSTOM.",
            "enum": ["MINUTES", "HOURS", "DAYS", "WEEKS", "MONTHS"]
          }
        },
        "allOf": [
          {
            "if": {
              "properties": { "schedule": { "enum": ["DAILY", "WEEKLY", "MONTHLY", "SCHEDULED"] } },
              "required": ["schedule"]
            },
            "then": { "required": ["startHour", "endHour"] }
          },
          {
            "if": {
              "properties": { "schedule": { "const": "SCHEDULED" } },
              "required": ["schedule"]
            },
            "then": { "required": ["repeatValue", "repeatUnit"] }
          },
          {
            "if": {
              "properties": { "uniqueType": { "const": "CUSTOM" } },
              "required": ["uniqueType"]
            },
            "then": { "required": ["timeValue", "timeUnit"] }
          },
          {
            "if": { "required": ["startHour", "endHour"] },
            "then": {
              "oneOf": [
                { "properties": { "startHour": { "const": 0 }, "endHour": { "const": 1 } } },
                { "properties": { "startHour": { "const": 1 }, "endHour": { "const": 2 } } },
                { "properties": { "startHour": { "const": 2 }, "endHour": { "const": 3 } } },
                { "properties": { "startHour": { "const": 3 }, "endHour": { "const": 4 } } },
                { "properties": { "startHour": { "const": 4 }, "endHour": { "const": 5 } } },
                { "properties": { "startHour": { "const": 5 }, "endHour": { "const": 6 } } },
                { "properties": { "startHour": { "const": 6 }, "endHour": { "const": 7 } } },
                { "properties": { "startHour": { "const": 7 }, "endHour": { "const": 8 } } },
                { "properties": { "startHour": { "const": 8 }, "endHour": { "const": 9 } } },
                { "properties": { "startHour": { "const": 9 }, "endHour": { "const": 10 } } },
                { "properties": { "startHour": { "const": 10 }, "endHour": { "const": 11 } } },
                { "properties": { "startHour": { "const": 11 }, "endHour": { "const": 12 } } },
                { "properties": { "startHour": { "const": 12 }, "endHour": { "const": 13 } } },
                { "properties": { "startHour": { "const": 13 }, "endHour": { "const": 14 } } },
                { "properties": { "startHour": { "const": 14 }, "endHour": { "const": 15 } } },
                { "properties": { "startHour": { "const": 15 }, "endHour": { "const": 16 } } },
                { "properties": { "startHour": { "const": 16 }, "endHour": { "const": 17 } } },
                { "properties": { "startHour": { "const": 17 }, "endHour": { "const": 18 } } },
                { "properties": { "startHour": { "const": 18 }, "endHour": { "const": 19 } } },
                { "properties": { "startHour": { "const": 19 }, "endHour": { "const": 20 } } },
                { "properties": { "startHour": { "const": 20 }, "endHour": { "const": 21 } } },
                { "properties": { "startHour": { "const": 21 }, "endHour": { "const": 22 } } },
                { "properties": { "startHour": { "const": 22 }, "endHour": { "const": 23 } } },
                { "properties": { "startHour": { "const": 23 }, "endHour": { "const": 0 } } }
              ]
            }
          }
        ]
      },
      "contactFieldTrigger": {
        "type": "object",
        "description": "Active branch for trigger=BY_CONTACT_FIELD_CHANGED. Starts the workflow when the selected contact field changes.",
        "additionalProperties": false,
        "required": ["contactFieldId"],
        "properties": {
          "contactFieldId": {
            "type": "integer",
            "minimum": 1,
            "description": "Identifier of the contact field to monitor. Use the exact id from the chosen contact_fields entry returned by Reteno MCP `get_organisation_info`."
          }
        }
      },
      "eventTypeWithSegmentParameters": {
        "type": "object",
        "description": "Active branch for trigger=EVENT_BASED_WITH_SEGMENT_PARAMETERS. Starts the workflow when an event occurs for contacts in a selected segment.",
        "additionalProperties": false,
        "required": ["eventTypeId", "eventTypeName", "groupId", "groupName"],
        "properties": {
          "eventTypeId": {
            "type": "integer",
            "minimum": 1,
            "description": "Identifier of the event type that starts the workflow. Use the exact ID from the matching event type returned by Reteno MCP `get_organisation_info`."
          },
          "eventTypeName": {
            "type": "string",
            "minLength": 1,
            "description": "Display name of the event type that matches eventTypeId."
          },
          "groupId": {
            "type": "string",
            "minLength": 1,
            "description": "Identifier of the segment/group as a string. Use the exact id from the chosen segments entry returned by Reteno MCP `get_organisation_info`, converted to string form if the returned id is numeric."
          },
          "groupName": {
            "type": "string",
            "minLength": 1,
            "description": "Display name of the segment/group that matches groupId."
          }
        }
      }
    },
    "allOf": [
      {
        "if": {
          "properties": { "trigger": { "const": "BY_EVENT" } },
          "required": ["trigger"]
        },
        "then": {
          "required": ["eventTypeTrigger"],
          "not": {
            "anyOf": [
              { "required": ["regularTrigger"] },
              { "required": ["contactFieldTrigger"] },
              { "required": ["eventTypeWithSegmentParameters"] }
            ]
          }
        }
      },
      {
        "if": {
          "properties": { "trigger": { "const": "REGULAR" } },
          "required": ["trigger"]
        },
        "then": {
          "required": ["regularTrigger"],
          "not": {
            "anyOf": [
              { "required": ["eventTypeTrigger"] },
              { "required": ["contactFieldTrigger"] },
              { "required": ["eventTypeWithSegmentParameters"] }
            ]
          }
        }
      },
      {
        "if": {
          "properties": { "trigger": { "const": "BY_CONTACT_FIELD_CHANGED" } },
          "required": ["trigger"]
        },
        "then": {
          "required": ["contactFieldTrigger"],
          "not": {
            "anyOf": [
              { "required": ["eventTypeTrigger"] },
              { "required": ["regularTrigger"] },
              { "required": ["eventTypeWithSegmentParameters"] }
            ]
          }
        }
      },
      {
        "if": {
          "properties": { "trigger": { "const": "EVENT_BASED_WITH_SEGMENT_PARAMETERS" } },
          "required": ["trigger"]
        },
        "then": {
          "required": ["eventTypeWithSegmentParameters"],
          "not": {
            "anyOf": [
              { "required": ["eventTypeTrigger"] },
              { "required": ["regularTrigger"] },
              { "required": ["contactFieldTrigger"] }
            ]
          }
        }
      }
    ]
  }
}
</schema>

<sdk_api_reference>
## WorkflowStartConfiguration SDK Reference

Use these methods and rules when the loaded catalog entry is `WorkflowStartConfiguration`.

### setStartConfiguration

Store canonical workflow start configuration separately from the canvas shape array.

```ts
sdk.setStartConfiguration(config: ActiveStartWorkflowConfigI | null): void
```

Pass the object produced by the `workflow_start_config` schema directly to `sdk.setStartConfiguration(...)`. The schema already uses the runtime `get_workflow_state.startConfig` shape.

Use `sdk.setStartConfiguration(null)` to clear start configuration or keep the workflow manual.

The current runtime trigger fields are:
- `BY_EVENT` -> `eventTypeTrigger`
- `REGULAR` -> `regularTrigger`
- `BY_CONTACT_FIELD_CHANGED` -> `contactFieldTrigger`
- `EVENT_BASED_WITH_SEGMENT_PARAMETERS` -> `eventTypeWithSegmentParameters`

Use `eventTypeTrigger.parameters` for event filters.

Use `regularTrigger.startHour` and `regularTrigger.endHour` for regular schedule windows.

This updates the canonical start configuration returned by `sdk.getStartConfiguration()` and `get_workflow_state.startConfig`. It does **not** become part of `sdk.getModel()` / `sdk.finish()` output.

### Examples

Event-based start without event-parameter filters:

```js
sdk.setStartConfiguration({
  trigger: 'BY_EVENT',
  configurationEnabled: true,
  avoidRun: false,
  eventTypeTrigger: {
    eventTypeId: 123,
    eventTypeName: 'Order created',
    uniqueType: 'ONE_TIME',
    timeValue: 1,
    timeUnit: 'HOURS',
    parameters: [],
  },
});
```

Event-based start with event-parameter filters:

```js
sdk.setStartConfiguration({
  trigger: 'BY_EVENT',
  configurationEnabled: true,
  avoidRun: false,
  eventTypeTrigger: {
    eventTypeId: 123,
    eventTypeName: 'Order created',
    uniqueType: 'CUSTOM',
    timeValue: 24,
    timeUnit: 'HOURS',
    parameters: [
      {
        eventParameters: [
          { name: 'source', condition: 'EQUALS', value: 'website' },
          { name: 'coupon', condition: 'IS_SET' },
        ],
      },
    ],
  },
});
```

Regular start with ASAP, which checks eligible contacts once an hour:

```js
sdk.setStartConfiguration({
  trigger: 'REGULAR',
  configurationEnabled: true,
  avoidRun: false,
  regularTrigger: {
    groupId: 123,
    schedule: 'ASAP',
    startDate: '2026-06-18',
    uniqueType: 'ONE_TIME',
  },
});
```

Regular start with an explicit one-hour run window:

```js
sdk.setStartConfiguration({
  trigger: 'REGULAR',
  configurationEnabled: true,
  avoidRun: false,
  regularTrigger: {
    groupId: 123,
    schedule: 'DAILY',
    startDate: '2026-06-18',
    startHour: 9,
    endHour: 10,
    uniqueType: 'ONE_TIME',
  },
});
```

Contact-field-change start:

```js
sdk.setStartConfiguration({
  trigger: 'BY_CONTACT_FIELD_CHANGED',
  configurationEnabled: true,
  avoidRun: false,
  contactFieldTrigger: {
    contactFieldId: 456,
  },
});
```

Event-based start limited by segment:

```js
sdk.setStartConfiguration({
  trigger: 'EVENT_BASED_WITH_SEGMENT_PARAMETERS',
  configurationEnabled: true,
  avoidRun: false,
  eventTypeWithSegmentParameters: {
    eventTypeId: 123,
    eventTypeName: 'Order created',
    groupId: '789',
    groupName: 'VIP customers',
  },
});
```

Clear start configuration:

```js
sdk.setStartConfiguration(null);
```

### getStartConfiguration

Read the current canonical workflow start configuration.

```ts
sdk.getStartConfiguration(): ActiveStartWorkflowConfigI | null
```

Returns the active start config shape, or `null` when none is set.
</sdk_api_reference>
