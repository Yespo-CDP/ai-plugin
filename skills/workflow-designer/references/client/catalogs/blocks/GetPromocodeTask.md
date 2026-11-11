<catalog_brief>
name: GetPromocodeTask
ui_name: Get promo code
category: integration
sdk_block_type: Custom
functionality: gets a promo code using the basic mode.
purpose: use it when the workflow must retrieve a promo code with the basic task mode.
when_to_use: use it when promo-code retrieval should be authored directly as a task-specific block.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "getPromocodeTask block",
  "description": "Exact task schema for `getPromocodeTask` based on the editor converter and validators.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "getPromocodeTask"
    },
    "taskParams": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "$ref": "#/$defs/daysParam"
          }
        ]
      },
      "allOf": [
        {
          "contains": {
            "$ref": "#/$defs/daysParam"
          },
          "minContains": 1,
          "maxContains": 1
        }
      ],
      "minItems": 1,
      "maxItems": 1
    },
    "blockDescription": {
      "type": "string"
    }
  },
  "required": [
    "taskName"
  ],
  "$defs": {
    "daysParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "days"
        },
        "type": {
          "const": "Number"
        },
        "value": {
          "anyOf": [
            {
              "type": "string",
              "pattern": "^\\d+$"
            },
            {
              "type": "string",
              "pattern": "^\\$\\{[^}]+\\}$"
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
    }
  }
}
</schema>

