<catalog_brief>
name: CheckDateTimeTask
ui_name: Check parameter by date/time
category: routing
sdk_block_type: CustomCondition
functionality: checks a date or time parameter against one selected date rule.
purpose: use it when one date or time condition should decide the YES or NO path.
when_to_use: use it for binary decisions based on date equality, range, before/after, or relative time rules.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "checkDateTimeTask block",
  "description": "Exact task schema for `checkDateTimeTask` based on the editor converter and validators.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "checkDateTimeTask"
    },
    "taskParams": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "$ref": "#/$defs/userTimeZoneParam"
          },
          {
            "$ref": "#/$defs/parameterNameParam"
          },
          {
            "$ref": "#/$defs/dateTypeParam"
          },
          {
            "$ref": "#/$defs/dateValueFromParamDate"
          },
          {
            "$ref": "#/$defs/dateValueFromParamDateTime"
          },
          {
            "$ref": "#/$defs/dateValueFromParamTime"
          },
          {
            "$ref": "#/$defs/dateValueToParamDate"
          },
          {
            "$ref": "#/$defs/dateValueToParamDateTime"
          },
          {
            "$ref": "#/$defs/dateValueToParamTime"
          },
          {
            "$ref": "#/$defs/intervalCountParam"
          },
          {
            "$ref": "#/$defs/intervalUnitParam"
          }
        ]
      },
      "allOf": [
        {
          "contains": {
            "$ref": "#/$defs/userTimeZoneParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/parameterNameParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/dateTypeParam"
          },
          "minContains": 1,
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/dateValueFromParamDate"
          },
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/dateValueFromParamDateTime"
          },
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/dateValueFromParamTime"
          },
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/dateValueToParamDate"
          },
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/dateValueToParamDateTime"
          },
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/dateValueToParamTime"
          },
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/intervalCountParam"
          },
          "maxContains": 1
        },
        {
          "contains": {
            "$ref": "#/$defs/intervalUnitParam"
          },
          "maxContains": 1
        },
        {
          "anyOf": [
            {
              "allOf": [
                {
                  "contains": {
                    "type": "object",
                    "properties": {
                      "name": {
                        "const": "dateType"
                      },
                      "value": {
                        "enum": [
                          "Date",
                          "DateBefore",
                          "DateAfter"
                        ]
                      }
                    },
                    "required": [
                      "name",
                      "value"
                    ]
                  },
                  "minContains": 1,
                  "maxContains": 1
                },
                {
                  "contains": {
                    "$ref": "#/$defs/dateValueFromParamDate"
                  },
                  "minContains": 1,
                  "maxContains": 1
                },
                {
                  "not": {
                    "contains": {
                      "type": "object",
                      "properties": {
                        "name": {
                          "const": "dateValueTo"
                        }
                      },
                      "required": [
                        "name"
                      ]
                    }
                  }
                },
                {
                  "not": {
                    "contains": {
                      "$ref": "#/$defs/intervalCountParam"
                    }
                  }
                },
                {
                  "not": {
                    "contains": {
                      "$ref": "#/$defs/intervalUnitParam"
                    }
                  }
                }
              ]
            },
            {
              "allOf": [
                {
                  "contains": {
                    "type": "object",
                    "properties": {
                      "name": {
                        "const": "dateType"
                      },
                      "value": {
                        "enum": [
                          "DateTime"
                        ]
                      }
                    },
                    "required": [
                      "name",
                      "value"
                    ]
                  },
                  "minContains": 1,
                  "maxContains": 1
                },
                {
                  "contains": {
                    "$ref": "#/$defs/dateValueFromParamDateTime"
                  },
                  "minContains": 1,
                  "maxContains": 1
                },
                {
                  "not": {
                    "contains": {
                      "type": "object",
                      "properties": {
                        "name": {
                          "const": "dateValueTo"
                        }
                      },
                      "required": [
                        "name"
                      ]
                    }
                  }
                },
                {
                  "not": {
                    "contains": {
                      "$ref": "#/$defs/intervalCountParam"
                    }
                  }
                },
                {
                  "not": {
                    "contains": {
                      "$ref": "#/$defs/intervalUnitParam"
                    }
                  }
                }
              ]
            },
            {
              "allOf": [
                {
                  "contains": {
                    "type": "object",
                    "properties": {
                      "name": {
                        "const": "dateType"
                      },
                      "value": {
                        "enum": [
                          "DateRange"
                        ]
                      }
                    },
                    "required": [
                      "name",
                      "value"
                    ]
                  },
                  "minContains": 1,
                  "maxContains": 1
                },
                {
                  "contains": {
                    "$ref": "#/$defs/dateValueFromParamDate"
                  },
                  "minContains": 1,
                  "maxContains": 1
                },
                {
                  "contains": {
                    "$ref": "#/$defs/dateValueToParamDate"
                  },
                  "minContains": 1,
                  "maxContains": 1
                },
                {
                  "not": {
                    "contains": {
                      "$ref": "#/$defs/intervalCountParam"
                    }
                  }
                },
                {
                  "not": {
                    "contains": {
                      "$ref": "#/$defs/intervalUnitParam"
                    }
                  }
                }
              ]
            },
            {
              "allOf": [
                {
                  "contains": {
                    "type": "object",
                    "properties": {
                      "name": {
                        "const": "dateType"
                      },
                      "value": {
                        "enum": [
                          "TimeRange"
                        ]
                      }
                    },
                    "required": [
                      "name",
                      "value"
                    ]
                  },
                  "minContains": 1,
                  "maxContains": 1
                },
                {
                  "contains": {
                    "$ref": "#/$defs/dateValueFromParamTime"
                  },
                  "minContains": 1,
                  "maxContains": 1
                },
                {
                  "contains": {
                    "$ref": "#/$defs/dateValueToParamTime"
                  },
                  "minContains": 1,
                  "maxContains": 1
                },
                {
                  "not": {
                    "contains": {
                      "$ref": "#/$defs/intervalCountParam"
                    }
                  }
                },
                {
                  "not": {
                    "contains": {
                      "$ref": "#/$defs/intervalUnitParam"
                    }
                  }
                }
              ]
            },
            {
              "allOf": [
                {
                  "contains": {
                    "type": "object",
                    "properties": {
                      "name": {
                        "const": "dateType"
                      },
                      "value": {
                        "enum": [
                          "DateTimeRange"
                        ]
                      }
                    },
                    "required": [
                      "name",
                      "value"
                    ]
                  },
                  "minContains": 1,
                  "maxContains": 1
                },
                {
                  "contains": {
                    "$ref": "#/$defs/dateValueFromParamDateTime"
                  },
                  "minContains": 1,
                  "maxContains": 1
                },
                {
                  "contains": {
                    "$ref": "#/$defs/dateValueToParamDateTime"
                  },
                  "minContains": 1,
                  "maxContains": 1
                },
                {
                  "not": {
                    "contains": {
                      "$ref": "#/$defs/intervalCountParam"
                    }
                  }
                },
                {
                  "not": {
                    "contains": {
                      "$ref": "#/$defs/intervalUnitParam"
                    }
                  }
                }
              ]
            },
            {
              "allOf": [
                {
                  "contains": {
                    "type": "object",
                    "properties": {
                      "name": {
                        "const": "dateType"
                      },
                      "value": {
                        "enum": [
                          "DateTimeGreaterThanCurrentBy"
                        ]
                      }
                    },
                    "required": [
                      "name",
                      "value"
                    ]
                  },
                  "minContains": 1,
                  "maxContains": 1
                },
                {
                  "contains": {
                    "$ref": "#/$defs/intervalCountParam"
                  },
                  "minContains": 1,
                  "maxContains": 1
                },
                {
                  "contains": {
                    "$ref": "#/$defs/intervalUnitParam"
                  },
                  "minContains": 1,
                  "maxContains": 1
                },
                {
                  "not": {
                    "contains": {
                      "type": "object",
                      "properties": {
                        "name": {
                          "const": "dateValueFrom"
                        }
                      },
                      "required": [
                        "name"
                      ]
                    }
                  }
                },
                {
                  "not": {
                    "contains": {
                      "type": "object",
                      "properties": {
                        "name": {
                          "const": "dateValueTo"
                        }
                      },
                      "required": [
                        "name"
                      ]
                    }
                  }
                }
              ]
            }
          ]
        }
      ],
      "minItems": 3,
      "maxItems": 11
    },
    "blockDescription": {
      "type": "string"
    }
  },
  "required": [
    "taskName"
  ],
  "$defs": {
    "userTimeZoneParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "userTimeZone"
        },
        "type": {
          "const": "String"
        },
        "value": {
          "type": "string",
          "minLength": 1
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "Always emitted."
    },
    "parameterNameParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "parameterName"
        },
        "type": {
          "const": "String"
        },
        "value": {
          "type": "string",
          "minLength": 1
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "Always emitted."
    },
    "dateTypeParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "dateType"
        },
        "type": {
          "const": "String"
        },
        "value": {
          "type": "string",
          "enum": [
            "Date",
            "DateTime",
            "DateRange",
            "TimeRange",
            "DateTimeRange",
            "DateBefore",
            "DateAfter",
            "DateTimeGreaterThanCurrentBy"
          ]
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "Always emitted."
    },
    "dateValueFromParamDate": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "dateValueFrom"
        },
        "type": {
          "const": "String"
        },
        "value": {
          "type": "string",
          "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "For `Date`, `DateBefore`, `DateAfter`."
    },
    "dateValueFromParamDateTime": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "dateValueFrom"
        },
        "type": {
          "const": "String"
        },
        "value": {
          "type": "string",
          "pattern": "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$"
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "For `DateTime` and `DateTimeRange`."
    },
    "dateValueFromParamTime": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "dateValueFrom"
        },
        "type": {
          "const": "String"
        },
        "value": {
          "type": "string",
          "pattern": "^\\d{2}:\\d{2}$"
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "For `TimeRange`."
    },
    "dateValueToParamDate": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "dateValueTo"
        },
        "type": {
          "const": "String"
        },
        "value": {
          "type": "string",
          "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "For `DateRange`."
    },
    "dateValueToParamDateTime": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "dateValueTo"
        },
        "type": {
          "const": "String"
        },
        "value": {
          "type": "string",
          "pattern": "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$"
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "For `DateTimeRange`."
    },
    "dateValueToParamTime": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "dateValueTo"
        },
        "type": {
          "const": "String"
        },
        "value": {
          "type": "string",
          "pattern": "^\\d{2}:\\d{2}$"
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "For `TimeRange`."
    },
    "intervalCountParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "intervalCount"
        },
        "type": {
          "const": "Integer"
        },
        "value": {
          "type": "string",
          "pattern": "^[1-9]\\d*$"
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "For `DateTimeGreaterThanCurrentBy`."
    },
    "intervalUnitParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "intervalUnit"
        },
        "type": {
          "const": "String"
        },
        "value": {
          "type": "string",
          "enum": [
            "Minutes",
            "Hours",
            "Days",
            "Weeks",
            "Months"
          ]
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "For `DateTimeGreaterThanCurrentBy`."
    }
  }
}
</schema>

