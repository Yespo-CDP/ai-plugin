<catalog_brief>
name: SendMobilePush
ui_name: Mobile Push
category: message_send
sdk_block_type: SendMobilePush
functionality: sends one specific mobile push message.
purpose: use it to deliver a mobile push notification to an app user or explicit device/contact target.
when_to_use: use it when the workflow should send a selected mobile push message through a configured mobile app context.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SendMobilePush block",
  "description": "Schema for the Workflow Designer SendMobilePush block (`esputnik.shape.SendMobPush`). Use this block to send one mobile push message to the workflow contact or to an explicitly supplied contact or device-token override.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "messageId": {
      "type": "string",
      "minLength": 1,
      "description": "Identifier of the mobile push message to send. When you provide a value, choose an existing mobile push message for the block."
    },
    "appUUID": {
      "type": "string",
      "minLength": 1,
      "description": "Application identifier that receives the mobile push. Use the fixed application selected in the block or a variable expression such as `${appId}` when the target app is decided at runtime. The editor auto-populates this value from the currently selected application, so fill it only when the workflow must target a specific app instead of relying on the default selection."
    },
    "sendInTimeRange": {
      "type": "boolean",
      "default": false,
      "description": "Limit delivery to the organisation's configured allowed sending hours for each recipient. Leave this `false` for immediate sending. Turn it on only when the mobile push must respect the configured business-time window; the schedule is taken from organisation settings and uses the recipient's local time zone when available."
    },
    "contactId": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|\\d+)$",
      "description": "Optional contact identifier override. Use either a digits-only contact ID such as `12345` or a variable expression such as `${contactId}`. Leave this empty when the workflow should use the current contact without an explicit override."
    },
    "recipient": {
      "type": "string",
      "minLength": 1,
      "description": "Optional mobile-push token override for the recipient device. Use a concrete token value or a variable expression such as `${pushToken}` when the token is resolved at runtime. Leave this empty when the workflow should use the current contact's stored mobile-push token."
    },
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the block. Use it to explain the business purpose of the mobile push step for other workflow editors; it does not change sending behavior."
    }
  },
  "required": [
    "messageId"
  ]
}
</schema>

