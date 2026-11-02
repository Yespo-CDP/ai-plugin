<catalog_brief>
name: CheckConfirmedTask
ui_name: Contact confirmed
category: routing
sdk_block_type: CustomCondition
functionality: checks whether a contact is confirmed.
purpose: use it when contact confirmation state should decide the YES or NO path.
when_to_use: use it for binary decisions based on whether a contact identity is confirmed.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "checkConfirmedTask block",
  "description": "Exact task schema for `checkConfirmedTask` based on the editor converter and validators.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "checkConfirmedTask"
    },
    "taskParams": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "$ref": "#/$defs/EmailAddressParam"
          },
          {
            "$ref": "#/$defs/ContactIdParam"
          }
        ]
      },
      "allOf": [
        {
          "contains": {
            "$ref": "#/$defs/EmailAddressParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/ContactIdParam"
          },
          "minContains": 1,
          "maxContains": 1
        }
      ],
      "minItems": 2,
      "maxItems": 2
    },
    "blockDescription": {
      "type": "string"
    }
  },
  "required": [
    "taskName"
  ],
  "$defs": {
    "EmailAddressParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "EmailAddress"
        },
        "type": {
          "const": "TestVariable"
        },
        "value": {
          "anyOf": [
            {
              "type": "string",
              "format": "email"
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
    "ContactIdParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "ContactId"
        },
        "type": {
          "const": "TestVariable"
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

