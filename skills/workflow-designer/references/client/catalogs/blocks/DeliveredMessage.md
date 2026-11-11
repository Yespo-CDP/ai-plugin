<catalog_brief>
name: DeliveredMessage
ui_name: Delivered?
category: condition
sdk_block_type: DeliveredMessage
functionality: checks whether an earlier supported message send reached the delivered state. In the editor this block is shown as `Delivered?`.
purpose: use it to react to delivery success instead of assuming that a send attempt actually reached the recipient device or channel.
when_to_use: use it when the next step should differ for delivered versus not-delivered messages.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "DeliveredMessage block",
  "description": "Schema for the Workflow Designer DeliveredMessage block (`esputnik.shape.DeliveredMessage`). Configure which earlier messages to evaluate and, optionally, how long the workflow should wait for the delivered status.",
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
      "description": "Controls which earlier messages this delivery check evaluates. Use `ONE` when the branch should consider only the most recent relevant message. Use `ALL` when the branch should treat any relevant earlier message on the path as eligible for the delivery check."
    },
    "waitForStatus": {
      "type": "boolean",
      "default": false,
      "description": "Whether the workflow should wait for the delivered status before evaluating the condition. When `true`, provide both `duration` and `durationItem`."
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
      "description": "Optional author comment for the block. Use it to explain what delivery condition this branch is checking for other workflow editors; it does not change delivery evaluation."
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
