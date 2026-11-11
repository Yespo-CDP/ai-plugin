<catalog_brief>
name: SendViber
ui_name: Viber
category: message_send
sdk_block_type: SendViber
functionality: sends one specific Viber message.
purpose: use it to deliver a fixed Viber message to the workflow contact or to an explicitly supplied phone/contact target.
when_to_use: use it when the workflow should send a selected Viber message instead of using another messaging channel.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SendViber block",
  "description": "Schema for the Workflow Designer SendViber block (`esputnik.shape.SendViber`). Use this block to send one Viber message to the workflow contact or to an explicit contact or phone number override.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "messageId": {
      "type": "string",
      "minLength": 1,
      "description": "Identifier of the Viber message to send. When you provide a value, choose an existing Viber message for the block."
    },
    "sendInTimeRange": {
      "type": "boolean",
      "default": false,
      "description": "Limit delivery to the organisation's configured allowed sending hours for each recipient. Leave this `false` for immediate sending. Turn it on only when the Viber message must respect the configured business-time window."
    },
    "contactId": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|\\d+)$",
      "description": "Optional contact identifier override. Use either a digits-only contact ID such as `12345` or a variable expression such as `${contactId}`. Leave this empty when the workflow should use its current contact without an explicit override."
    },
    "recipient": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|\\d+)$",
      "description": "Optional phone number override for the Viber recipient. Use either a digits-only phone number such as `380970001122` or a variable expression such as `${phoneNumber}`. Leave this empty when the workflow should use the current contact's phone without an explicit override."
    },
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the block. Use it to explain the business purpose of the Viber step for other workflow editors; it does not change sending behavior."
    }
  },
  "required": [
    "messageId"
  ]
}
</schema>

