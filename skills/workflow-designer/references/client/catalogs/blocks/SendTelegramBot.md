<catalog_brief>
name: SendTelegramBot
ui_name: Telegram
category: message_send
sdk_block_type: SendTelegramBot
functionality: sends one specific Telegram Bot message.
purpose: use it to deliver a Telegram bot message through a configured bot rather than through email, SMS, push, or Viber.
when_to_use: use it when the workflow should send a selected Telegram message to the workflow contact or an explicit Telegram recipient token.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ShapeType.SEND_TELEGRAM_BOT block",
  "description": "Schema for the Workflow Designer block addressed by `ShapeType.SEND_TELEGRAM_BOT` (`esputnik.shape.SendTelegramBot`). Use this block to send one Telegram Bot message to the workflow contact, or to an explicitly supplied Telegram recipient token and contact identifier.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "messageId": {
      "type": "string",
      "minLength": 1,
      "description": "Identifier of the Telegram Bot message to send. When you provide a value, choose an existing Telegram Bot message for the block."
    },
    "appUUID": {
      "type": "string",
      "minLength": 1,
      "description": "Telegram Bot application identifier that should deliver the message. Leave this empty when the editor should keep its default selected Telegram Bot application. Fill it with a concrete application UUID or a dynamic variable such as `${appId}` only when the workflow must target a specific bot at runtime."
    },
    "sendInTimeRange": {
      "type": "boolean",
      "default": false,
      "description": "Limit delivery to the organisation's configured allowed sending hours for each recipient. Leave this `false` for immediate sending. Turn it on only when the Telegram message must respect the configured business-time window; the block uses the recipient's local time zone when available and otherwise falls back to the sender time zone configured in the organisation."
    },
    "contactId": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|\\d+)$",
      "description": "Optional contact identifier override. Use either a digits-only contact ID such as `12345` or a variable expression such as `${contactId}`. Leave this empty when the workflow should use the current contact without an explicit override."
    },
    "recipient": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|\\d+)$",
      "description": "Optional Telegram recipient token override. Use either a digits-only token or chat identifier value when your organisation stores it in numeric form, or a variable expression such as `${telegramToken}` when the recipient token is resolved at runtime. Leave this empty when the workflow should use the token associated with the current contact."
    },
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the block. Use it to explain the business purpose of the Telegram step for other workflow editors; it does not change sending behavior."
    }
  },
  "required": [
    "messageId"
  ]
}
</schema>

