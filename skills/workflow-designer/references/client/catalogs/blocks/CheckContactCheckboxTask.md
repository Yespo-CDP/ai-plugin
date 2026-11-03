<catalog_brief>
name: CheckContactCheckboxTask
ui_name: Check the checkbox list fields
category: routing
sdk_block_type: CustomCondition
functionality: checks one checkbox-list contact field either for emptiness, for all selected options, or for at least one selected option.
purpose: use it when checkbox-list field state should decide the YES or NO path.
when_to_use: use it for binary decisions based on one checkbox-list contact field.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "checkContactCheckboxTask block",
  "description": "Exact task schema for `checkContactCheckboxTask` based on `toTaskParams()`. This task emits `customFieldOptions`, not `optionIds`.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "checkContactCheckboxTask"
    },
    "taskParams": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "$ref": "#/$defs/contactFieldIdParam"
          },
          {
            "$ref": "#/$defs/typeParam"
          },
          {
            "$ref": "#/$defs/customFieldOptionsParam"
          }
        ]
      },
      "allOf": [
        {
          "contains": {
            "$ref": "#/$defs/contactFieldIdParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/typeParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/customFieldOptionsParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "anyOf": [
            {
              "allOf": [
                {
                  "contains": {
                    "type": "object",
                    "properties": {
                      "name": {
                        "const": "type"
                      },
                      "value": {
                        "const": "NONE"
                      }
                    },
                    "required": [
                      "name",
                      "value"
                    ]
                  },
                  "minContains": 1,
                  "maxContains": 1
                },
                {
                  "contains": {
                    "type": "object",
                    "properties": {
                      "name": {
                        "const": "customFieldOptions"
                      },
                      "value": {
                        "type": "array",
                        "maxItems": 0
                      }
                    },
                    "required": [
                      "name",
                      "value"
                    ]
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
                    "type": "object",
                    "properties": {
                      "name": {
                        "const": "type"
                      },
                      "value": {
                        "enum": [
                          "CHECKED",
                          "ONE_OF"
                        ]
                      }
                    },
                    "required": [
                      "name",
                      "value"
                    ]
                  },
                  "minContains": 1,
                  "maxContains": 1
                },
                {
                  "contains": {
                    "type": "object",
                    "properties": {
                      "name": {
                        "const": "customFieldOptions"
                      },
                      "value": {
                        "type": "array",
                        "minItems": 1
                      }
                    },
                    "required": [
                      "name",
                      "value"
                    ]
                  },
                  "minContains": 1,
                  "maxContains": 1
                }
              ]
            }
          ]
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
              "pattern": "^\\d+$"
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
      "description": "Always emitted; validator requires a value."
    },
    "typeParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "type"
        },
        "type": {
          "const": "String"
        },
        "value": {
          "type": "string",
          "enum": [
            "NONE",
            "CHECKED",
            "ONE_OF"
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
    "customFieldOptionsParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "customFieldOptions"
        },
        "type": {
          "const": "String"
        },
        "value": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "id": {
                "type": "number"
              },
              "name": {
                "type": "string",
                "minLength": 1
              }
            },
            "required": [
              "id",
              "name"
            ]
          }
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "Always emitted. Must be empty for `NONE`, non-empty for `CHECKED` and `ONE_OF`."
    }
  }
}
</schema>

