<catalog_brief>
name: WebhookTask
ui_name: Webhook
sdk_block_type: WebhookTask
category: integration
functionality: calls a selected webhook or external data source block. In the editor this block is shown as `Webhook`.
purpose: use it when the workflow must hand off data to an external integration or retrieve behavior defined by a configured webhook.
when_to_use: use it when execution should depend on an external system, external processing, or an integration-specific webhook configuration.
</catalog_brief>

<schema>
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "blockType": "WebhookTask",
  "description": "Schema for configuring the Webhook workflow block from the live editor behavior.",
  "parameters": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "webhookId": {
        "type": "string",
        "pattern": "^\\d+$",
        "description": "Identifier of the configured webhook or external data source to execute. This is required for the block to be valid. Choose an existing webhook from the catalog and provide its numeric id as a string. Selecting the webhook also drives runtime-derived fields such as the webhook name and, for HTTP webhooks, the request method, so those fields should not be authored separately."
      },
      "contactId": {
        "type": "string",
        "oneOf": [
          {
            "pattern": "^\\d+$"
          },
          {
            "pattern": "^\\$\\{[^}]+\\}$"
          }
        ],
        "description": "Optional contact identifier to pass into the webhook. Use this when the selected webhook expects a numeric contact id directly or a workflow variable such as ${contactId}. Leave it empty when the webhook identifies the contact by another field or does not need a contact id."
      },
      "phone": {
        "type": "string",
        "oneOf": [
          {
            "pattern": "^\\d+$"
          },
          {
            "pattern": "^\\$\\{[^}]+\\}$"
          }
        ],
        "description": "Optional phone number value for the webhook input. Provide digits only, such as 380970001122, or a workflow variable such as ${phoneNumber}. Leave it empty when the webhook does not require a phone number."
      },
      "email": {
        "type": "string",
        "oneOf": [
          {
            "format": "email"
          },
          {
            "pattern": "^\\$\\{[^}]+\\}$"
          }
        ],
        "description": "Optional email value for the webhook input. Use a standard email address or a workflow variable such as ${emailAddress}. Leave it empty when the webhook does not require an email address."
      },
      "blockDescription": {
        "type": "string",
        "description": "Optional comment shown on the block for workflow authors. Use it to explain why this webhook is called or what downstream behavior it supports. It does not change which webhook is executed."
      }
    },
    "required": [
      "webhookId"
    ]
  }
}
</schema>

