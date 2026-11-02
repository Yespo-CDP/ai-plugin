<catalog_brief>
name: SendPush
ui_name: Web Push
category: message_send
sdk_block_type: SendPush
functionality: sends one specific web push message.
purpose: use it to deliver a browser/web push notification instead of an email, SMS, or mobile app push.
when_to_use: use it when the workflow should send a selected web push message to the current contact or an explicit delivery target.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SendPush block",
  "description": "Schema for the Workflow Designer SendPush block (`esputnik.shape.SendPush`). Use this block to send one web push message to the workflow contact, or to an explicitly supplied contact or delivery identifier.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "messageId": {
      "type": "string",
      "minLength": 1,
      "description": "Identifier of the web push message to send. When you provide a value, choose an existing web push message for the block."
    },
    "sendInTimeRange": {
      "type": "boolean",
      "default": false,
      "description": "Limit delivery to the organisation's configured allowed sending hours for each recipient. Leave this `false` for immediate sending. Turn it on only when the web push should respect the configured business-time window; the block does not accept custom hours because those are taken from organisation settings."
    },
    "contactId": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|\\d+)$",
      "description": "Optional contact identifier override for recipient lookup. Use either a digits-only contact ID such as `12345` or a variable expression such as `${contactId}`. Leave this empty when the workflow should use its current contact without an explicit override."
    },
    "recipient": {
      "type": "string",
      "minLength": 1,
      "description": "Optional web-push token override. Fill this when the workflow must send to a specific push token instead of relying on the current contact's stored token. Leave it empty when the workflow should resolve the recipient token from the current contact."
    },
    "SMS": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|\\d+)$",
      "description": "Optional phone-number fallback used by the platform's contact search logic. Use either a digits-only phone number such as `380970001122` or a variable expression such as `${phoneNumber}`. Leave this empty unless the workflow needs phone-based fallback matching."
    },
    "email": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|[^\\s@]+@[^\\s@]+\\.[^\\s@]+)$",
      "description": "Optional email-address fallback used by the platform's contact search logic. Use a valid email address such as `user@example.com`, or a variable expression such as `${email}`. Leave this empty unless the workflow needs email-based fallback matching."
    },
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the block. Use it to explain the business purpose of the web push step for other workflow editors; it does not change sending behavior."
    }
  },
  "required": [
    "messageId"
  ]
}
</schema>

