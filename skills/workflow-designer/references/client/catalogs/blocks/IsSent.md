<catalog_brief>
name: IsSent
ui_name: Sent?
category: condition
sdk_block_type: IsSent
functionality: checks whether an earlier supported message send was sent at all. In the editor this block is shown as `Sent?`.
purpose: use it to branch on send status before checking deeper engagement states such as delivery, open, or click.
when_to_use: use it when the workflow should behave differently for messages that were sent versus messages that never reached the send stage.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "IsSent block",
  "description": "Schema for the Workflow Designer IsSent block (`esputnik.shape.IsSentEmail`). Configure which earlier messages to evaluate and, optionally, how long the workflow should wait for the sent status.",
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
      "description": "Controls which earlier email sends this condition evaluates. Use `ONE` to check only the most recent relevant email message. Use `ALL` when the branch should consider every relevant email message in the workflow path. The live UI exposes this as the `Take into account` radio group with `Only the last message` and `All messages`."
    },
    "waitForStatus": {
      "type": "boolean",
      "default": false,
      "description": "Whether the workflow should wait for the sent status before evaluating the condition. When `true`, provide both `duration` and `durationItem`."
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
      "description": "Optional author comment shown on the block. Use it to explain what the `Sent?` check is verifying for other workflow editors; it does not change evaluation logic."
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
