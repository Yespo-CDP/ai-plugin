<catalog_brief>
name: AlternateSend
ui_name: One from many
category: message_send
sdk_block_type: AlternateSend
functionality: sends one eligible message variant from a pool of tagged variants in one channel. In the editor this block is shown as `One from many`.
purpose: use it when the workflow should pick one variant dynamically instead of sending one fixed message.
when_to_use: use it for variant pools, experiments, rotating creative, or tag-based message selection inside one channel.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "AlternateSend block",
  "description": "Schema for the Workflow Designer AlternateSend block (`esputnik.shape.AlternateSend`), shown in the editor as `One from many`. Use this block to send exactly one message variant from a channel-specific pool. Narrow the pool with include and exclude tags, then let the platform choose one eligible variant.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "mediaType": {
      "type": "string",
      "enum": [
        "EMAIL",
        "SMS",
        "WEB_PUSH",
        "MOBILE_PUSH",
        "VIBER",
        "APP_INBOX",
        "TELEGRAM_BOT"
      ],
      "default": "EMAIL",
      "description": "Channel whose message variants are eligible for selection. Choose the channel that owns the pool of variants for this step. `MOBILE_PUSH` and `TELEGRAM_BOT` expose an additional application or bot selector through `appUUID`."
    },
    "includeTags": {
      "type": "array",
      "default": [],
      "items": {
        "$ref": "#/$defs/tagRef"
      },
      "description": "Optional list of tags that a candidate message variant may have. Use this to limit selection to variants marked for the campaign, audience, experiment, or business scenario you want. Leave it empty when the block should consider all variants in the selected channel."
    },
    "excludeTags": {
      "type": "array",
      "default": [],
      "items": {
        "$ref": "#/$defs/tagRef"
      },
      "description": "Optional list of tags that disqualify candidate variants. Use this to remove variants that should not participate in the selection pool, such as underperforming, deprecated, or channel-specific fallback variants."
    },
    "appUUID": {
      "type": "string",
      "minLength": 1,
      "description": "Application or bot identifier for channels that require a concrete integration context. Fill this when `mediaType` is `MOBILE_PUSH` to target a specific mobile app, or when `mediaType` is `TELEGRAM_BOT` to select the bot that will deliver the message. Do not provide it for email, SMS, web push, Viber, or app inbox variants."
    },
    "sendInTimeRange": {
      "type": "boolean",
      "default": false,
      "description": "Limit delivery to the organisation's configured allowed sending hours for each recipient. Leave this `false` for immediate sending from the eligible variant pool. Turn it on only when the selected variant must respect business-time sending rules."
    },
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the block. Use it to explain why the workflow chooses one variant from this pool; it does not affect selection logic or delivery."
    }
  },
  "required": [
    "mediaType"
  ],
  "$defs": {
    "tagRef": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "integer",
          "description": "Numeric identifier of the tag."
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "description": "Display name of the tag."
        }
      },
      "required": [
        "id",
        "name"
      ]
    }
  },
  "allOf": [
    {
      "if": {
        "properties": {
          "mediaType": {
            "enum": [
              "MOBILE_PUSH",
              "TELEGRAM_BOT"
            ]
          }
        },
        "required": [
          "mediaType"
        ]
      },
      "then": {
        "required": [
          "appUUID"
        ]
      }
    },
    {
      "if": {
        "properties": {
          "mediaType": {
            "enum": [
              "EMAIL",
              "SMS",
              "WEB_PUSH",
              "VIBER",
              "APP_INBOX"
            ]
          }
        },
        "required": [
          "mediaType"
        ]
      },
      "then": {
        "not": {
          "required": [
            "appUUID"
          ]
        }
      }
    }
  ]
}
</schema>

