<catalog_brief>
name: GetOrderTask
ui_name: Get order
category: integration
sdk_block_type: Custom
functionality: loads one order by internal order id or external order id.
purpose: use it when the workflow must retrieve order data as part of business logic.
when_to_use: use it when order lookup should be authored as a dedicated task-specific block.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "getOrderTask block",
  "description": "Exact task schema for `getOrderTask` based on the editor converter and validators.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "getOrderTask"
    },
    "taskParams": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "$ref": "#/$defs/orderIdParam"
          },
          {
            "$ref": "#/$defs/externalOrderIdParam"
          }
        ]
      },
      "allOf": [],
      "oneOf": [
        {
          "allOf": [
            {
              "contains": {
                "$ref": "#/$defs/orderIdParam"
              },
              "minContains": 1,
              "maxContains": 1
            }
          ]
        },
        {
          "allOf": [
            {
              "contains": {
                "$ref": "#/$defs/externalOrderIdParam"
              },
              "minContains": 1,
              "maxContains": 1
            }
          ]
        }
      ],
      "minItems": 0,
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
    "orderIdParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "orderId"
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
      "description": "Emitted only when selecting order id."
    },
    "externalOrderIdParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "externalOrderId"
        },
        "type": {
          "const": "String"
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
      "description": "Emitted only when selecting external order id."
    }
  }
}
</schema>

