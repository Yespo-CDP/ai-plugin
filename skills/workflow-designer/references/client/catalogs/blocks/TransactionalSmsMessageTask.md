<catalog_brief>
name: TransactionalSmsMessageTask
ui_name: Send transactional SMS message
category: integration
sdk_block_type: Custom
functionality: sends a transactional SMS message.
purpose: use it when the workflow must send one transactional SMS through a business task.
when_to_use: use it when SMS sending should be authored as a task-specific integration action.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "transactionalSmsMessageTask block",
  "description": "Exact task schema for `transactionalSmsMessageTask` based on the editor converter and validators.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "transactionalSmsMessageTask"
    },
    "taskParams": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "$ref": "#/$defs/messageIdParam"
          },
          {
            "$ref": "#/$defs/recipientParam"
          },
          {
            "$ref": "#/$defs/contactIdParam"
          },
          {
            "$ref": "#/$defs/languageParamParam"
          },
          {
            "$ref": "#/$defs/jsonParamParam"
          }
        ]
      },
      "allOf": [
        {
          "contains": {
            "$ref": "#/$defs/messageIdParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/recipientParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/contactIdParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/languageParamParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/jsonParamParam"
          },
          "maxContains": 1
        }
      ],
      "minItems": 4,
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
    "messageIdParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "messageId"
        },
        "type": {
          "const": "SMSMessageId"
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
      "description": "Always emitted; validator requires a value."
    },
    "recipientParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "recipient"
        },
        "type": {
          "const": "PhoneNumber"
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
    "contactIdParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "contactId"
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
    "languageParamParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "languageParam"
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
    "jsonParamParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "jsonParam"
        },
        "type": {
          "const": "TestVariable"
        },
        "value": {
          "anyOf": [
            {
              "type": "string"
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
      "description": "Emitted only when `showJsonControl` is true."
    }
  }
}
</schema>

