<catalog_brief>
name: UpdateContactTask
ui_name: Update contact
category: integration
sdk_block_type: Custom
functionality: updates an existing contact using a required contact identifier plus optional email, phone, and/or JSON payload data.
purpose: use it when the workflow must update one known contact record as a business action.
when_to_use: use it when contact update behavior should be authored directly as a task-specific block instead of the generic `Custom` wrapper.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "updateContactTask block",
  "description": "Exact task schema for `updateContactTask` based on the editor converter and validators.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "updateContactTask"
    },
    "taskParams": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "$ref": "#/$defs/ContactIdParam"
          },
          {
            "$ref": "#/$defs/emailParam"
          },
          {
            "$ref": "#/$defs/phoneParam"
          },
          {
            "$ref": "#/$defs/jsonParam"
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
            "$ref": "#/$defs/emailParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/phoneParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/jsonParam"
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
    "emailParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "email"
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
    "phoneParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "phone"
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
    "jsonParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "json"
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
      "description": "Always emitted."
    }
  }
}
</schema>

