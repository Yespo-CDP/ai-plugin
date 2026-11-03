<catalog_brief>
name: Clock
ui_name: Timer
category: time_control
sdk_block_type: Clock
functionality: delays the workflow for a duration, until a scheduled time, or by combining both behaviors in one timer step.
purpose: use it to pause execution until the right moment instead of deciding between paths.
when_to_use: use it when contacts should wait for hours, days, months, or until a specific time source before continuing on the same path.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Clock block",
  "description": "Schema for the Workflow Designer Clock block (`esputnik.shape.Clock`). Use this block to delay the workflow by a period, wait until a scheduled day and time, or combine both behaviors in one step. Contact-field and context-parameter modes require a source that resolves to a date or time value.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "waitTime": {
      "type": "boolean",
      "default": true,
      "description": "Turns on relative waiting. Set this to `true` when the workflow must pause for a period such as hours, days, or months before continuing."
    },
    "duration": {
      "type": "string",
      "pattern": "^[1-9]\\d*$",
      "default": "1",
      "description": "Positive whole-number amount for the relative wait. Fill this only when `waitTime` is `true`."
    },
    "durationItem": {
      "type": "string",
      "enum": [
        "Minutes",
        "Hours",
        "Days",
        "Months"
      ],
      "default": "Days",
      "description": "Unit for `duration`. Use this only when `waitTime` is `true`. The live editor serializes month-based waits as `Months`, including a one-month wait."
    },
    "waitUntilDate": {
      "type": "boolean",
      "default": false,
      "description": "Turns on schedule-based waiting. Set this to `true` when the workflow must hold until a specific time source is reached."
    },
    "waitUntilType": {
      "type": "string",
      "enum": [
        "SPECIFIC_TIME",
        "CONTACT_FIELD",
        "CONTEXT_PARAMETER"
      ],
      "description": "Selects how the schedule-based wait is resolved. Use `SPECIFIC_TIME` for a fixed day/time rule, `CONTACT_FIELD` to read a date/time from a contact field, or `CONTEXT_PARAMETER` to read it from workflow context."
    },
    "weekday": {
      "type": "string",
      "enum": [
        "ANY",
        "MON",
        "TUE",
        "WED",
        "THU",
        "FRI",
        "SAT",
        "SUN"
      ],
      "description": "Optional weekday restriction for `SPECIFIC_TIME`. Use `ANY` or omit this field to allow any day."
    },
    "hours": {
      "type": "string",
      "enum": [
        "00",
        "01",
        "02",
        "03",
        "04",
        "05",
        "06",
        "07",
        "08",
        "09",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
        "16",
        "17",
        "18",
        "19",
        "20",
        "21",
        "22",
        "23"
      ],
      "default": "10",
      "description": "Hour for `SPECIFIC_TIME`, in 24-hour format. Fill this only when `waitUntilDate` is `true` and `waitUntilType` is `SPECIFIC_TIME`."
    },
    "minutes": {
      "type": "string",
      "enum": [
        "00",
        "15",
        "30",
        "45"
      ],
      "default": "00",
      "description": "Minute for `SPECIFIC_TIME`. The live editor only allows quarter-hour values. Fill this only when `waitUntilDate` is `true` and `waitUntilType` is `SPECIFIC_TIME`."
    },
    "contactFieldId": {
      "type": "string",
      "minLength": 1,
      "description": "Contact field identifier that supplies the target date/time for the wait. Fill this only when `waitUntilDate` is `true` and `waitUntilType` is `CONTACT_FIELD`."
    },
    "contextParameter": {
      "type": "string",
      "minLength": 1,
      "description": "Workflow context parameter name that supplies the target date/time for the wait. Fill this only when `waitUntilDate` is `true` and `waitUntilType` is `CONTEXT_PARAMETER`."
    },
    "useContactsTimeZone": {
      "type": "boolean",
      "default": false,
      "description": "Apply the wait using each contact's local time instead of the organisation time zone. For `CONTACT_FIELD` and `CONTEXT_PARAMETER` modes this must be `true`."
    },
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the timer block. Use it to explain the business purpose of the wait for other workflow editors."
    }
  },
  "required": [
    "waitTime",
    "waitUntilDate"
  ],
  "allOf": [
    {
      "oneOf": [
        {
          "required": [
            "waitTime",
            "waitUntilDate"
          ],
          "properties": {
            "waitTime": {
              "const": true
            },
            "waitUntilDate": {
              "const": false
            }
          }
        },
        {
          "required": [
            "waitTime",
            "waitUntilDate"
          ],
          "properties": {
            "waitTime": {
              "const": false
            },
            "waitUntilDate": {
              "const": true
            }
          }
        },
        {
          "required": [
            "waitTime",
            "waitUntilDate"
          ],
          "properties": {
            "waitTime": {
              "const": true
            },
            "waitUntilDate": {
              "const": true
            }
          }
        }
      ]
    },
    {
      "if": {
        "properties": {
          "waitTime": {
            "const": true
          }
        },
        "required": [
          "waitTime"
        ]
      },
      "then": {
        "required": [
          "duration",
          "durationItem"
        ]
      }
    },
    {
      "if": {
        "properties": {
          "waitUntilDate": {
            "const": true
          }
        },
        "required": [
          "waitUntilDate"
        ]
      },
      "then": {
        "required": [
          "waitUntilType"
        ]
      }
    },
    {
      "if": {
        "properties": {
          "waitUntilDate": {
            "const": true
          },
          "waitUntilType": {
            "const": "SPECIFIC_TIME"
          }
        },
        "required": [
          "waitUntilDate",
          "waitUntilType"
        ]
      },
      "then": {
        "required": [
          "hours",
          "minutes"
        ]
      }
    },
    {
      "if": {
        "properties": {
          "waitUntilDate": {
            "const": true
          },
          "waitUntilType": {
            "const": "CONTACT_FIELD"
          }
        },
        "required": [
          "waitUntilDate",
          "waitUntilType"
        ]
      },
      "then": {
        "required": [
          "contactFieldId",
          "useContactsTimeZone"
        ],
        "properties": {
          "useContactsTimeZone": {
            "const": true
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "waitUntilDate": {
            "const": true
          },
          "waitUntilType": {
            "const": "CONTEXT_PARAMETER"
          }
        },
        "required": [
          "waitUntilDate",
          "waitUntilType"
        ]
      },
      "then": {
        "required": [
          "contextParameter",
          "useContactsTimeZone"
        ],
        "properties": {
          "useContactsTimeZone": {
            "const": true
          }
        }
      }
    }
  ]
}
</schema>

<sdk_api_reference>
## Clock SDK Notes

Use the loaded Clock schema as the source of truth for allowed modes, required fields, and value constraints.
This supplemental note covers SDK-only normalization behavior.

### SDK-only behavior

- The SDK serializes `weekday: 'ANY'` to the backend empty-string weekday value
- If `weekday` is omitted, the SDK also treats it as "any day"
- When `waitUntilType` is `CONTACT_FIELD` or `CONTEXT_PARAMETER`, the SDK normalizes `useContactsTimeZone` to `true`

### Example

```js
sdk.addShape(ShapeType.CLOCK, {
  waitTime: false,
  waitUntilDate: true,
  waitUntilType: 'SPECIFIC_TIME',
  weekday: 'ANY',
  hours: '10',
  minutes: '00',
});
```
</sdk_api_reference>

