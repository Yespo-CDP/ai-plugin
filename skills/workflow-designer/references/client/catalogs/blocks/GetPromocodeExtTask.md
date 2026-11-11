<catalog_brief>
name: GetPromocodeExtTask
ui_name: Get promo code
category: integration
sdk_block_type: Custom
functionality: gets a promo code using the extended mode.
purpose: use it when the workflow must retrieve a promo code with extended task options.
when_to_use: use it when extended promo-code retrieval should be authored as a dedicated task-specific block.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "getPromocodeExtTask block",
  "description": "Exact task schema for `getPromocodeExtTask` based on the editor converter and validators.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "getPromocodeExtTask"
    },
    "taskParams": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "$ref": "#/$defs/daysParam"
          },
          {
            "$ref": "#/$defs/typeParam"
          },
          {
            "$ref": "#/$defs/discountParam"
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
        },
        {
          "contains": {
            "$ref": "#/$defs/typeParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/discountParam"
          },
          "minContains": 1,
          "maxContains": 1
        }
      ],
      "minItems": 3,
      "maxItems": 3
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
    },
    "typeParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "type"
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
    "discountParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "discount"
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
    }
  }
}
</schema>

