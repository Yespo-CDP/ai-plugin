<catalog_brief>
name: SendSMS
ui_name: SMS
category: message_send
sdk_block_type: SendSMS
functionality: sends one specific SMS message.
purpose: use it to deliver a fixed SMS message to the workflow contact or to an explicitly supplied phone/contact target.
when_to_use: use it when the workflow should send one chosen SMS template immediately from this step.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SendSMS block",
  "description": "Schema for the Workflow Designer SendSMS block (`esputnik.shape.SendSMS`). Use this block to send one SMS message to the workflow contact or to an explicitly supplied contact identifier and phone number.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "messageId": {
      "type": "string",
      "minLength": 1,
      "description": "Identifier of the SMS message to send. When you provide a value, use the exact `id` value from the chosen `sms_messages` entry returned by Reteno MCP `get_organisation_info`; do not derive or normalize it from the message name."
    },
    "sendInTimeRange": {
      "type": "boolean",
      "default": false,
      "description": "Limit delivery to the organisation's configured allowed sending hours for each recipient. Leave this `false` for immediate sending. Turn it on only when the SMS must respect the configured business-time window."
    },
    "contactId": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|\\d+)$",
      "description": "Optional contact identifier override. Use either a digits-only contact ID such as `12345` or a variable expression such as `${contactId}`. Leave this empty when the workflow should use the current contact without an explicit override. This field can be used together with `recipient` when both the contact lookup target and the destination phone should be supplied explicitly."
    },
    "recipient": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|\\d+)$",
      "description": "Optional phone number override for the SMS recipient. Use either a digits-only phone number such as `380970001122` or a variable expression such as `${phoneNumber}`. Leave this empty when the workflow should use the current contact's phone number. This field can be filled together with `contactId`."
    },
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the block. Use it to explain the business purpose of the SMS step for other workflow editors; it does not change sending behavior."
    }
  },
  "required": [
    "messageId"
  ]
}
</schema>

