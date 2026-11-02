<catalog_brief>
name: GenPromocodeTask
ui_name: Create promo code
category: integration
sdk_block_type: Custom
functionality: generates a promo code.
purpose: use it when the workflow must produce a promo code for later use.
when_to_use: use it when promo-code generation should be authored as a task-specific integration action.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "genPromocodeTask block",
  "description": "Exact task schema for `genPromocodeTask` based on the editor converter and validators.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "genPromocodeTask"
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
          },
          {
            "$ref": "#/$defs/keyParam"
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
        },
        {
          "contains": {
            "$ref": "#/$defs/keyParam"
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
              "pattern": "^[1-9]\\d*$"
            },
            {
              "type": "string",
              "pattern": "^\\$\\{[^}]+\\}$"
            }
          ]
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "Always emitted; validator requires a value."
    },
    "typeParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "type"
        },
        "type": {
          "const": "Number"
        },
        "value": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1
            },
            {
              "type": "string",
              "pattern": "^\\$\\{[^}]+\\}$"
            }
          ]
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "Always emitted; validator requires a value."
    },
    "discountParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "discount"
        },
        "type": {
          "const": "Percent"
        },
        "value": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1
            },
            {
              "type": "string",
              "pattern": "^\\$\\{[^}]+\\}$"
            }
          ]
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "Always emitted; validator requires a value."
    },
    "keyParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "key"
        },
        "type": {
          "const": "DivisionConfig"
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

