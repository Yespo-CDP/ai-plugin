<catalog_brief>
name: SendAppInbox
ui_name: App Inbox
category: message_send
sdk_block_type: SendAppInbox
functionality: sends one App Inbox message.
purpose: use it to place a message into the app inbox channel rather than sending by email, SMS, push, or Viber.
when_to_use: use it when the contact should receive an in-app inbox message selected explicitly by message ID.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SendAppInbox block",
  "description": "Schema for the Workflow Designer SendAppInbox block (`esputnik.shape.SendPull`). Use this block to send one App Inbox message to the workflow contact, or to a contact identifier supplied explicitly.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "messageId": {
      "type": "string",
      "minLength": 1,
      "description": "Identifier of the App Inbox message to send. When you provide a value, choose an existing App Inbox message for the block."
    },
    "sendInTimeRange": {
      "type": "boolean",
      "default": false,
      "description": "Limit delivery to the organisation's configured allowed sending hours for each recipient. Leave this `false` for immediate sending. Turn it on only when the App Inbox message must respect the configured business-time window."
    },
    "contactId": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|\\d+)$",
      "description": "Optional contact identifier override. Use either a digits-only contact ID such as `12345` or a variable expression such as `${contactId}`. Leave this empty when the workflow should use its current contact without an explicit override."
    },
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the block. Use it to explain the business purpose of the App Inbox step for other workflow editors; it does not change sending behavior."
    }
  },
  "required": [
    "messageId"
  ]
}
</schema>

