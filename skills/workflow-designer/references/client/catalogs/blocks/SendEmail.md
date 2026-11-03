<catalog_brief>
name: SendEmail
ui_name: Email
category: message_send
sdk_block_type: SendEmail
functionality: sends one specific email message.
purpose: use it to deliver a fixed email message to the workflow contact or to an explicitly resolved recipient.
when_to_use: use it when the workflow should send one chosen email template rather than choosing from a pool or only checking email engagement.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SendEmail block",
  "description": "Schema for the Workflow Designer SendEmail block (`esputnik.shape.SendEmail`). Use this block to send one email message to the workflow contact or to identifiers supplied explicitly.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "messageId": {
      "type": "string",
      "minLength": 1,
      "description": "Identifier of the email message to send. When you provide a value, use the exact `id` value from the chosen `email_messages` entry returned by Reteno MCP `get_organisation_info`; do not derive or normalize it from the message name."
    },
    "sendInTimeRange": {
      "type": "boolean",
      "default": false,
      "description": "Limit delivery to the organisation's configured allowed sending hours for each recipient. Leave this `false` for immediate sending. Turn it on only when the email must respect the configured business-time window."
    },
    "contactId": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|\\d+)$",
      "description": "Optional contact identifier to resolve the recipient explicitly. Use either a digits-only contact ID such as `12345` or a variable expression such as `${contactId}`. Leave this empty when the workflow should use its current contact without an explicit override."
    },
    "recipient": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|[^\\s@]+@[^\\s@]+\\.[^\\s@]+)$",
      "description": "Optional email address override for the recipient. Use a valid email address such as `user@example.com`, or a variable expression such as `${email}`. Leave this empty when the workflow should use the current contact's email without an explicit override."
    },
    "languageParam": {
      "type": "string",
      "minLength": 1,
      "description": "Optional language value for message rendering. Fill this when the selected email template expects a language parameter or when message localization should be driven explicitly."
    },
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the block. Use it to explain the business purpose of the email step for other workflow editors; it does not change sending behavior."
    }
  },
  "required": [
    "messageId"
  ]
}
</schema>

