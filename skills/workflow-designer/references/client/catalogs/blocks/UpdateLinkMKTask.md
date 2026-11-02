<catalog_brief>
name: UpdateLinkMKTask
ui_name: Update campaign
category: integration
sdk_block_type: Custom
functionality: updates a campaign link.
purpose: use it when the workflow must modify one campaign link as a business action.
when_to_use: use it when link-update behavior should be authored directly as a task-specific block.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "updateLinkMKTask block",
  "description": "Exact task schema for `updateLinkMKTask` based on the editor converter and validators.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "updateLinkMKTask"
    },
    "taskParams": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "$ref": "#/$defs/linkParam"
          }
        ]
      },
      "allOf": [
        {
          "contains": {
            "$ref": "#/$defs/linkParam"
          },
          "minContains": 1,
          "maxContains": 1
        }
      ],
      "minItems": 1,
      "maxItems": 1
    },
    "blockDescription": {
      "type": "string"
    }
  },
  "required": [
    "taskName"
  ],
  "$defs": {
    "linkParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "link"
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

