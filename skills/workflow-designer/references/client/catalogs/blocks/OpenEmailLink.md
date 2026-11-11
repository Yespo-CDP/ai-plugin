<catalog_brief>
name: OpenEmailLink
ui_name: Clicked?
category: condition
sdk_block_type: OpenEmailLink
functionality: checks whether a contact clicked a link in an earlier email. In the editor this block is shown as `Clicked?`.
purpose: use it to react to high-intent email engagement.
when_to_use: use it when follow-up actions should depend on whether the contact clicked an email link rather than only opening the email.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "OpenEmailLink block",
  "description": "Schema for the Workflow Designer OpenEmailLink block (`esputnik.shape.OpenEmailLink`). Configure which earlier emails to evaluate and, optionally, how long the workflow should wait for the clicked status.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "scanType": {
      "type": "string",
      "enum": [
        "ONE",
        "ALL"
      ],
      "default": "ONE",
      "description": "Controls which earlier email sends this click check evaluates. Use `ONE` when the branch should check only the most recent relevant email. Use `ALL` when the branch should treat any relevant earlier email click as sufficient. This choice matters only when the workflow path can reach this block after more than one relevant email send."
    },
    "waitForStatus": {
      "type": "boolean",
      "default": false,
      "description": "Whether the workflow should wait for the clicked status before evaluating the condition. When `true`, provide both `duration` and `durationItem`."
    },
    "duration": {
      "type": "string",
      "default": "7",
      "description": "Positive integer wait duration represented as a string. It is required when `waitForStatus` is `true` and may not exceed 720 hours or 30 days."
    },
    "durationItem": {
      "type": "string",
      "enum": [
        "Hours",
        "Days"
      ],
      "default": "Days",
      "description": "Unit for `duration`. It is required when `waitForStatus` is `true`."
    },
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the block. Use it to explain what click behavior this branch is checking for other workflow editors; it does not change evaluation logic."
    }
  },
  "allOf": [
    {
      "if": {
        "properties": {
          "waitForStatus": {
            "const": true
          }
        },
        "required": [
          "waitForStatus"
        ]
      },
      "then": {
        "required": [
          "duration",
          "durationItem"
        ],
        "oneOf": [
          {
            "properties": {
              "durationItem": {
                "const": "Hours"
              },
              "duration": {
                "pattern": "^\\s*0*(?:[1-9]|[1-9][0-9]|[1-6][0-9]{2}|7[01][0-9]|720)\\s*$"
              }
            }
          },
          {
            "properties": {
              "durationItem": {
                "const": "Days"
              },
              "duration": {
                "pattern": "^\\s*0*(?:[1-9]|[12][0-9]|30)\\s*$"
              }
            }
          }
        ]
      }
    }
  ]
}
</schema>
