<catalog_brief>
name: FindContactTask
ui_name: Get contact
category: integration
sdk_block_type: Custom
functionality: finds a contact using one or more identifiers such as contact id, email, phone, or mobile push token.
purpose: use it when the workflow must resolve a contact record before later actions.
when_to_use: use it when lookup intent should be authored as a dedicated task-specific block.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "findContactTask block",
  "description": "Exact task schema for `findContactTask` based on the editor converter and validators.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "findContactTask"
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
          },
          {
            "$ref": "#/$defs/PhoneParam"
          },
          {
            "$ref": "#/$defs/MobPushTokenParam"
          },
          {
            "$ref": "#/$defs/SearchContactIdOnlyParam"
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
        },
        {
          "contains": {
            "$ref": "#/$defs/PhoneParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/MobPushTokenParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/SearchContactIdOnlyParam"
          },
          "minContains": 1,
          "maxContains": 1
        }
      ],
      "minItems": 5,
      "maxItems": 5
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
    },
    "PhoneParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "Phone"
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
    "MobPushTokenParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "MobPushToken"
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
    "SearchContactIdOnlyParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "SearchContactIdOnly"
        },
        "type": {
          "const": "Boolean"
        },
        "value": {
          "type": "string",
          "enum": [
            "true",
            "false"
          ]
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "Always emitted as a lower-case boolean string."
    }
  }
}
</schema>

