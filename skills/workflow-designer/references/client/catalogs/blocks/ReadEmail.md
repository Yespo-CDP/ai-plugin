<catalog_brief>
name: ReadEmail
ui_name: Opened?
category: condition
sdk_block_type: ReadEmail
functionality: checks whether a contact opened an earlier email. In the editor this block is shown as `Opened?`.
purpose: use it to branch on basic email engagement without requiring a click.
when_to_use: use it when open behavior should trigger follow-up logic such as reminders, escalations, or conversion sequences.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ReadEmail block",
  "description": "Schema for the Workflow Designer ReadEmail block (`esputnik.shape.ReadEmail`). Configure which earlier emails to evaluate and, optionally, how long the workflow should wait for the opened status.",
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
      "description": "Controls which earlier email opens can satisfy this check. Use `ONE` when the workflow should wait for an open of the nearest upstream email on the current path. Use `ALL` when an open of any upstream email on the current path should qualify. This choice matters only when more than one SendEmail block can appear before this check."
    },
    "waitForStatus": {
      "type": "boolean",
      "default": false,
      "description": "Whether the workflow should wait for the opened status before evaluating the condition. When `true`, provide both `duration` and `durationItem`."
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
      "description": "Optional internal comment for workflow authors. Use it to explain what open behavior this check is waiting for or why the branch exists; leave it empty when no note is needed."
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
