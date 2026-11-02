<catalog_brief>
name: RegisterEventTask
ui_name: Launch event
category: integration
sdk_block_type: Custom
functionality: registers or launches an event.
purpose: use it when the workflow must emit an event as a business action.
when_to_use: use it when event registration should be authored directly as a task-specific block.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "registerEventTask block",
  "description": "Exact task schema for `registerEventTask` based on the editor converter and validators. The emitted key parameter is `keyValue`.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "registerEventTask"
    },
    "taskParams": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "$ref": "#/$defs/eventTypeIdParam"
          },
          {
            "$ref": "#/$defs/keyValueParam"
          },
          {
            "$ref": "#/$defs/paramsParam"
          },
          {
            "$ref": "#/$defs/generatedParamsParam"
          }
        ]
      },
      "allOf": [
        {
          "contains": {
            "$ref": "#/$defs/eventTypeIdParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/keyValueParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/paramsParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/generatedParamsParam"
          },
          "minContains": 1,
          "maxContains": 1
        }
      ],
      "minItems": 4,
      "maxItems": 4
    },
    "blockDescription": {
      "type": "string"
    }
  },
  "required": [
    "taskName"
  ],
  "$defs": {
    "eventTypeIdParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "eventTypeId"
        },
        "type": {
          "const": "EventTypeId"
        },
        "value": {
          "type": "string",
          "minLength": 1
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "Always emitted; validator requires a value. Use Reteno MCP `get_organisation_info` with events enabled and copy the exact id from the selected events entry."
    },
    "keyValueParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "keyValue"
        },
        "type": {
          "const": "TestVariable"
        },
        "value": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "Always emitted; converter uses `null` when blank."
    },
    "paramsParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "params"
        },
        "type": {
          "const": "TestVariable"
        },
        "value": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "Always emitted; converter uses `null` when blank."
    },
    "generatedParamsParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "generatedParams"
        },
        "type": {
          "const": "TestVariable"
        },
        "value": {
          "type": "string",
          "pattern": "^\\{[\\s\\S]*\\}$"
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "Always emitted."
    }
  }
}
</schema>

