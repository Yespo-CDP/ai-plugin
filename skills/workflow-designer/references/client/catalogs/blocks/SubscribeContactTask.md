<catalog_brief>
name: SubscribeContactTask
ui_name: Confirm contact
category: integration
sdk_block_type: Custom
functionality: confirms or subscribes a contact using contact id and/or email address.
purpose: use it when the workflow must perform a subscription or confirmation action on a contact.
when_to_use: use it when subscription logic should be authored directly as a task-specific block.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "subscribeContactTask block",
  "description": "Exact task schema for `subscribeContactTask` based on the editor converter and validators.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "subscribeContactTask"
    },
    "taskParams": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "$ref": "#/$defs/ContactIdParam"
          },
          {
            "$ref": "#/$defs/EmailAddressParam"
          }
        ]
      },
      "allOf": [
        {
          "contains": {
            "$ref": "#/$defs/ContactIdParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/EmailAddressParam"
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
    },
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
    }
  }
}
</schema>

