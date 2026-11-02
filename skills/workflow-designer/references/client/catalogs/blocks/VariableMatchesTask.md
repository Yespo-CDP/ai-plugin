<catalog_brief>
name: VariableMatchesTask
ui_name: Variable matches regular expression
category: routing
sdk_block_type: CustomCondition
functionality: checks whether one named variable matches a regular expression.
purpose: use it when regex matching on one named variable should decide the YES or NO path.
when_to_use: use it for binary decisions based on whether a named variable value matches a pattern.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "variableMatchesTask block",
  "description": "Exact task schema for `variableMatchesTask` based on the editor converter and validators.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "variableMatchesTask"
    },
    "taskParams": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "$ref": "#/$defs/nameParam"
          },
          {
            "$ref": "#/$defs/patternParam"
          }
        ]
      },
      "allOf": [
        {
          "contains": {
            "$ref": "#/$defs/nameParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/patternParam"
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
    "nameParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "name"
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
    },
    "patternParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "pattern"
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

