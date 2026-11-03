<catalog_brief>
name: DateTimer
ui_name: Start on date
category: time_control
sdk_block_type: DateTimer
functionality: starts or releases a path in relation to a target date. In the editor this block is shown as `Start on date`.
purpose: use it when execution depends on a specific date milestone instead of a relative delay.
when_to_use: use it when the path should start on a target date or before a target date taken from fixed configuration or an event parameter.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "DateTimer block",
  "description": "Schema for the Workflow Designer DateTimer block (`esputnik.shape.DateTimer`), shown in the editor as `Start on date`. Use this block either to launch a branch before a target date or to launch it on the target date itself. The target date can come from an event parameter or, in start-on-date mode, from a fixed calendar date.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "startByOption": {
      "type": "string",
      "enum": [
        "START_BEFORE_DATE",
        "START_BY_DATE"
      ],
      "description": "Controls whether the workflow starts before the target date or on the target date itself. Use `START_BEFORE_DATE` when the workflow should begin a chosen number of minutes, hours, or days before the target date. Use `START_BY_DATE` when the workflow should begin on the target date."
    },
    "durationValue": {
      "type": "string",
      "pattern": "^[1-9]\\d*$",
      "description": "Positive whole-number lead time used only when `startByOption` is `START_BEFORE_DATE`. This is the amount of time the workflow should start before the target date."
    },
    "durationItem": {
      "type": "string",
      "enum": [
        "Minutes",
        "Hours",
        "Days"
      ],
      "description": "Unit for `durationValue` when `startByOption` is `START_BEFORE_DATE`."
    },
    "date": {
      "type": "string",
      "minLength": 1,
      "description": "Target date source. For `START_BEFORE_DATE`, provide either a workflow variable such as `${startDate}` or a timestamp string in `YYYY-MM-DDThh:mm:ss+hh:mm` form. For `START_BY_DATE` with `selectedDateSource` set to `fromEventParam`, use the same variable-or-timestamp rule. For `START_BY_DATE` with `selectedDateSource` set to `indicateDate`, provide a fixed calendar date in `YYYY-MM-DD` format."
    },
    "selectedDateSource": {
      "type": "string",
      "enum": [
        "fromEventParam",
        "indicateDate"
      ],
      "description": "How the target date is chosen when `startByOption` is `START_BY_DATE`. Use `fromEventParam` to read the target date from an event parameter. Use `indicateDate` to enter a fixed calendar date directly in the block."
    },
    "startTimeOption": {
      "type": "string",
      "enum": [
        "timeFromParam",
        "setTimeStart"
      ],
      "description": "How the start time is chosen when the block is working from a parameter-driven date. Use `timeFromParam` when the incoming date parameter already contains the time that should be used. Use `setTimeStart` when the block should override the time portion with the explicit `timeHours` and `timeMinutes` values."
    },
    "timeHours": {
      "type": "string",
      "pattern": "^([01]\\d|2[0-3])$",
      "description": "Two-digit hour in 24-hour format. Fill this when the block exposes an explicit start-time picker."
    },
    "timeMinutes": {
      "type": "string",
      "pattern": "^[0-5]\\d$",
      "description": "Two-digit minutes value. Fill this when the block exposes an explicit start-time picker."
    },
    "useContactsTimeZone": {
      "type": "boolean",
      "description": "Apply the explicit start time in each contact's own time zone instead of the organisation time zone. Use this only when the block exposes the contact-time-zone checkbox, which happens when the start time is set manually from a parameter-driven date."
    },
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the block. Use it to explain why the workflow starts before or on the chosen date; it does not change scheduling behavior."
    }
  },
  "required": [
    "startByOption",
    "date"
  ],
  "$defs": {
    "dynamicParameter": {
      "type": "string",
      "pattern": "^\\$\\{[^}]+\\}$"
    },
    "dateTimeWithOffset": {
      "type": "string",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}[+-]\\d{2}:\\d{2}$"
    },
    "calendarDate": {
      "type": "string",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
    }
  },
  "allOf": [
    {
      "if": {
        "properties": {
          "startByOption": {
            "const": "START_BEFORE_DATE"
          }
        },
        "required": [
          "startByOption"
        ]
      },
      "then": {
        "required": [
          "durationValue",
          "durationItem",
          "startTimeOption"
        ],
        "properties": {
          "date": {
            "oneOf": [
              {
                "$ref": "#/$defs/dynamicParameter"
              },
              {
                "$ref": "#/$defs/dateTimeWithOffset"
              }
            ]
          }
        },
        "not": {
          "required": [
            "selectedDateSource"
          ]
        }
      }
    },
    {
      "if": {
        "properties": {
          "startByOption": {
            "const": "START_BY_DATE"
          }
        },
        "required": [
          "startByOption"
        ]
      },
      "then": {
        "required": [
          "selectedDateSource"
        ],
        "not": {
          "anyOf": [
            {
              "required": [
                "durationValue"
              ]
            },
            {
              "required": [
                "durationItem"
              ]
            }
          ]
        }
      }
    },
    {
      "if": {
        "properties": {
          "startByOption": {
            "const": "START_BY_DATE"
          },
          "selectedDateSource": {
            "const": "fromEventParam"
          }
        },
        "required": [
          "startByOption",
          "selectedDateSource"
        ]
      },
      "then": {
        "required": [
          "startTimeOption"
        ],
        "properties": {
          "date": {
            "oneOf": [
              {
                "$ref": "#/$defs/dynamicParameter"
              },
              {
                "$ref": "#/$defs/dateTimeWithOffset"
              }
            ]
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "startByOption": {
            "const": "START_BY_DATE"
          },
          "selectedDateSource": {
            "const": "indicateDate"
          }
        },
        "required": [
          "startByOption",
          "selectedDateSource"
        ]
      },
      "then": {
        "required": [
          "timeHours",
          "timeMinutes"
        ],
        "properties": {
          "date": {
            "$ref": "#/$defs/calendarDate"
          }
        },
        "not": {
          "anyOf": [
            {
              "required": [
                "startTimeOption"
              ]
            },
            {
              "required": [
                "useContactsTimeZone"
              ]
            }
          ]
        }
      }
    },
    {
      "if": {
        "properties": {
          "startTimeOption": {
            "const": "setTimeStart"
          }
        },
        "required": [
          "startTimeOption"
        ]
      },
      "then": {
        "required": [
          "timeHours",
          "timeMinutes"
        ]
      }
    },
    {
      "if": {
        "properties": {
          "startTimeOption": {
            "const": "timeFromParam"
          }
        },
        "required": [
          "startTimeOption"
        ]
      },
      "then": {
        "not": {
          "anyOf": [
            {
              "required": [
                "timeHours"
              ]
            },
            {
              "required": [
                "timeMinutes"
              ]
            },
            {
              "required": [
                "useContactsTimeZone"
              ]
            }
          ]
        }
      }
    },
    {
      "if": {
        "required": [
          "useContactsTimeZone"
        ]
      },
      "then": {
        "properties": {
          "startTimeOption": {
            "const": "setTimeStart"
          }
        },
        "required": [
          "startTimeOption"
        ]
      }
    }
  ]
}
</schema>

