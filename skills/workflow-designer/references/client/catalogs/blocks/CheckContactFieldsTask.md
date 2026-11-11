<catalog_brief>
name: CheckContactFieldsTask
ui_name: Verify contact field matches event parameter
category: routing
sdk_block_type: CustomCondition
functionality: checks whether one contact field value matches one event or workflow parameter.
purpose: use it when one contact-field comparison should decide the YES or NO path.
when_to_use: use it for binary decisions based on comparing a parameter with a selected contact field.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "checkContactFieldsTask block",
  "description": "Exact task schema for `checkContactFieldsTask` based on the editor converter and validators.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "checkContactFieldsTask"
    },
    "taskParams": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "$ref": "#/$defs/ContactIdParam"
          },
          {
            "$ref": "#/$defs/PhoneParam"
          },
          {
            "$ref": "#/$defs/EmailParam"
          },
          {
            "$ref": "#/$defs/contactFieldIdParam"
          },
          {
            "$ref": "#/$defs/parameterNameParam"
          },
          {
            "$ref": "#/$defs/caseSensitiveParam"
          },
          {
            "$ref": "#/$defs/contactFieldTypeParam"
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
            "$ref": "#/$defs/PhoneParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/EmailParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/contactFieldIdParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/parameterNameParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/caseSensitiveParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/contactFieldTypeParam"
          },
          "minContains": 1,
          "maxContains": 1
        }
      ],
      "minItems": 7,
      "maxItems": 7
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
    "EmailParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "Email"
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
    "contactFieldIdParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "contactFieldId"
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
    "parameterNameParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "parameterName"
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
    "caseSensitiveParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "caseSensitive"
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
    },
    "contactFieldTypeParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "contactFieldType"
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

