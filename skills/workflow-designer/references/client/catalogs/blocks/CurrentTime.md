<catalog_brief>
name: CurrentTime
ui_name: Current day/time
category: condition
sdk_block_type: CurrentTime
functionality: checks whether the workflow has reached this step on allowed days, in an allowed time window, or both. In the editor this block is shown as `Current day/time`.
purpose: use it to gate progression by the current calendar moment.
when_to_use: use it when a path should continue only during certain days or hours, and should branch differently outside that time window.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CurrentTime block",
  "description": "Schema for the Workflow Designer CurrentTime block (`esputnik.shape.CurrentTime`). Use this block to let contacts continue only on selected days, within a time window, or both.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "useDay": {
      "type": "boolean",
      "default": true,
      "description": "Turns on day-based gating. Set this to `true` when the workflow should continue only on a specific calendar date or on selected weekdays."
    },
    "date": {
      "type": "string",
      "pattern": "^\\d{2}\\.\\d{2}\\.\\d{4}$",
      "description": "Specific calendar date in `DD.MM.YYYY` format. Use this when `useDay` is `true` and the block should allow execution on one exact date instead of recurring weekdays. Omit this when `days` is filled. If `useDay` is `true` and both `date` and `days` are omitted, the editor auto-populates the current date."
    },
    "days": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "MONDAY",
          "TUESDAY",
          "WEDNESDAY",
          "THURSDAY",
          "FRIDAY",
          "SATURDAY",
          "SUNDAY"
        ]
      },
      "uniqueItems": true,
      "minItems": 1,
      "description": "Recurring weekdays when the block should allow execution. Use this when `useDay` is `true` and the block should repeat weekly instead of waiting for one exact date. Omit `date` when this field is used."
    },
    "useTime": {
      "type": "boolean",
      "default": false,
      "description": "Turns on time-of-day gating. Set this to `true` when the workflow should continue only during a daily time window."
    },
    "timeFrom": {
      "type": "string",
      "pattern": "^([01]\\d|2[0-3]):[0-5]\\d$",
      "default": "00:00",
      "description": "Start of the allowed daily time window in 24-hour `HH:MM` format. Use this only when `useTime` is `true`. If omitted while `useTime` is `true`, the editor defaults to `00:00`."
    },
    "timeTo": {
      "type": "string",
      "pattern": "^([01]\\d|2[0-3]):[0-5]\\d$",
      "default": "23:59",
      "description": "End of the allowed daily time window in 24-hour `HH:MM` format. Use this only when `useTime` is `true`. If omitted while `useTime` is `true`, the editor defaults to `23:59`. The live editor accepts ranges where `timeFrom` is later than `timeTo`."
    },
    "useContactsTimeZone": {
      "type": "boolean",
      "default": false,
      "description": "Resolve the block against each contact's local time zone instead of the organisation time zone. Use this when day or time gating must respect each contact's local clock. The live editor also serializes this flag when `useTime` is `false`, so do not assume it is limited to time-window mode."
    },
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the block. Use it to explain the business purpose of the day or time gate for other workflow editors."
    }
  },
  "allOf": [
    {
      "if": {
        "properties": {
          "useDay": {
            "const": false
          }
        },
        "required": [
          "useDay"
        ]
      },
      "then": {
        "not": {
          "anyOf": [
            {
              "required": [
                "date"
              ]
            },
            {
              "required": [
                "days"
              ]
            }
          ]
        }
      }
    },
    {
      "if": {
        "required": [
          "date"
        ]
      },
      "then": {
        "not": {
          "required": [
            "days"
          ]
        }
      }
    },
    {
      "if": {
        "required": [
          "days"
        ]
      },
      "then": {
        "not": {
          "required": [
            "date"
          ]
        }
      }
    },
    {
      "if": {
        "properties": {
          "useTime": {
            "const": false
          }
        },
        "required": [
          "useTime"
        ]
      },
      "then": {
        "not": {
          "anyOf": [
            {
              "required": [
                "timeFrom"
              ]
            },
            {
              "required": [
                "timeTo"
              ]
            }
          ]
        }
      }
    },
    {
      "if": {
        "required": [
          "timeFrom"
        ]
      },
      "then": {
        "required": [
          "timeTo"
        ]
      }
    },
    {
      "if": {
        "required": [
          "timeTo"
        ]
      },
      "then": {
        "required": [
          "timeFrom"
        ]
      }
    }
  ]
}
</schema>

