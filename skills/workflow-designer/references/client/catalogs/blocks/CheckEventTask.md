<catalog_brief>
name: CheckEventTask
ui_name: Check event
category: routing
sdk_block_type: CustomCondition
functionality: checks whether a selected event happened for the contact, optionally within a recent time window.
purpose: use it when one event occurrence should decide the YES or NO path.
when_to_use: use it for binary decisions based on whether an event happened, optionally with a lookback window.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "checkEventTask block",
  "description": "Exact task schema for `checkEventTask` based on the editor converter and validators.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "checkEventTask"
    },
    "taskParams": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "$ref": "#/$defs/keyParam"
          },
          {
            "$ref": "#/$defs/eventTypeIdParam"
          },
          {
            "$ref": "#/$defs/intervalCountParam"
          },
          {
            "$ref": "#/$defs/intervalUnitParam"
          }
        ]
      },
      "allOf": [
        {
          "contains": {
            "$ref": "#/$defs/keyParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/eventTypeIdParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/intervalCountParam"
          },
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/intervalUnitParam"
          },
          "maxContains": 1
        },
        {
          "if": {
            "contains": {
              "$ref": "#/$defs/intervalCountParam"
            }
          },
          "then": {
            "contains": {
              "$ref": "#/$defs/intervalUnitParam"
            },
            "minContains": 1,
            "maxContains": 1
          },
          "else": {
            "not": {
              "contains": {
                "$ref": "#/$defs/intervalUnitParam"
              }
            }
          }
        },
        {
          "if": {
            "contains": {
              "$ref": "#/$defs/intervalUnitParam"
            }
          },
          "then": {
            "contains": {
              "$ref": "#/$defs/intervalCountParam"
            },
            "minContains": 1,
            "maxContains": 1
          }
        }
      ],
      "minItems": 2,
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
    "keyParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "key"
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
      "description": "Always emitted."
    },
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
    "intervalCountParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "intervalCount"
        },
        "type": {
          "const": "Integer"
        },
        "value": {
          "type": "string",
          "pattern": "^[1-9]\\d*$"
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "Emitted only when interval filtering is configured."
    },
    "intervalUnitParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "intervalUnit"
        },
        "type": {
          "const": "String"
        },
        "value": {
          "type": "string",
          "enum": [
            "Minutes",
            "Hours",
            "Days",
            "Weeks",
            "Months"
          ]
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "Emitted only when interval filtering is configured."
    }
  }
}
</schema>

