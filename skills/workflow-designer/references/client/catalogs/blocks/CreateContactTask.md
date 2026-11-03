<catalog_brief>
name: CreateContactTask
ui_name: Create contact
category: integration
sdk_block_type: Custom
functionality: creates or updates a contact record using email, phone, and/or a JSON payload.
purpose: use it when the workflow must create a contact directly from workflow data.
when_to_use: use it when contact creation is the primary business action and the author should work with task-specific fields instead of the generic `Custom` wrapper.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "createContactTask block",
  "description": "Exact task schema for `createContactTask` based on the editor converter and validators.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "createContactTask"
    },
    "taskParams": {
      "type": "array",
      "items": {
        "oneOf": [
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

