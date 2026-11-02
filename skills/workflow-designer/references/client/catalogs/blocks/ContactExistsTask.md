<catalog_brief>
name: ContactExistsTask
ui_name: Contact exists
category: routing
sdk_block_type: CustomCondition
functionality: checks whether a contact exists.
purpose: use it when contact existence should decide the YES or NO path.
when_to_use: use it for binary decisions based on whether one contact can be resolved.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "contactExistsTask block",
  "description": "Exact task schema for `contactExistsTask` based on the editor converter and validators.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "contactExistsTask"
    },
    "taskParams": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "$ref": "#/$defs/EmailAddressParam"
          },
          {
            "$ref": "#/$defs/PhoneParam"
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
            "$ref": "#/$defs/PhoneParam"
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

