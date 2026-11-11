<catalog_brief>
name: UpdateCustomFields
ui_name: Update custom fields
sdk_block_type: UpdateCustomFields
category: contact_update
functionality: updates one or more custom contact fields.
purpose: use it to write business data back to the contact profile while the workflow runs.
when_to_use: use it when the workflow should set, overwrite, or enrich custom field values for the current contact, or for a contact found by optional lookup overrides.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UpdateCustomFields block",
  "description": "Schema for the Workflow Designer UpdateCustomFields block (`esputnik.shape.UpdateCustomFields`). Use this block to update one or more custom contact fields for the current workflow contact or for a contact resolved through optional lookup overrides. Each `contactFields` item targets one existing custom field and supplies the new value in the format required by that field type.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "contactFields": {
      "type": "array",
      "minItems": 1,
      "description": "Ordered list of custom field updates to apply. Add at least one field update. Each item must reference a real custom field from the organisation metadata, and the `type` must match that field's configured type. The editor prevents selecting the same field twice in one block.",
      "items": {
        "$ref": "#/$defs/contactFieldUpdate"
      }
    },
    "email": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|[^\\s@]+@[^\\s@]+\\.[^\\s@]+)$",
      "description": "Optional email-address override used to identify which contact should be updated. Use a valid email address such as `user@example.com`, or a variable expression such as `${email}`. Leave this empty when the workflow should update the current workflow contact without email-based lookup."
    },
    "contactId": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|\\d+)$",
      "description": "Optional platform contact identifier used to resolve which contact should be updated. Use a digits-only contact ID such as `12345` or a variable expression such as `${contactId}`. Leave this empty when the workflow should not use explicit contact-ID lookup."
    },
    "phone": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|\\d+)$",
      "description": "Optional phone-number override used to resolve which contact should be updated. Use a digits-only phone number such as `380970001122` or a variable expression such as `${phone}`. Leave this empty when phone-based lookup is not needed."
    },
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the block. Use it to explain why the workflow updates these custom fields for other workflow editors; it does not change execution."
    }
  },
  "required": [
    "contactFields"
  ],
  "$defs": {
    "contactFieldUpdate": {
      "oneOf": [
        {
          "$ref": "#/$defs/textFieldUpdate"
        },
        {
          "$ref": "#/$defs/numberFieldUpdate"
        },
        {
          "$ref": "#/$defs/decimalFieldUpdate"
        },
        {
          "$ref": "#/$defs/dateFieldUpdate"
        },
        {
          "$ref": "#/$defs/dateTimeFieldUpdate"
        },
        {
          "$ref": "#/$defs/dropdownFieldUpdate"
        },
        {
          "$ref": "#/$defs/checkboxListFieldUpdate"
        }
      ]
    },
    "baseFieldUpdate": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "integer",
          "description": "Identifier of the custom field to update. Use the exact `id` value from the chosen `contact_fields` entry returned by Reteno MCP `get_organisation_info`; do not invent, derive, or normalize IDs from field names."
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "description": "Optional authoring hint for the selected custom field name. Use it only for readability while drafting; legacy persisted workflow JSON does not rely on it."
        },
        "type": {
          "type": "string",
          "enum": [
            "TEXT_BOX",
            "TEXT_AREA",
            "NUMBER",
            "DECIMAL",
            "DATE",
            "DATE_TIME",
            "DROP_DOWN_LIST",
            "CHECK_BOX_LIST"
          ],
          "description": "Configured type of the target custom field. This must match the selected field's metadata because the allowed value format depends on it."
        },
        "value": {
          "type": "string",
          "description": "New value to write into the target custom field. The required format depends on the selected field type."
        },
        "functionOperator": {
          "type": "string",
          "enum": [
            "set",
            "addition",
            "subtraction"
          ],
          "description": "How the block applies the value. Use `set` for all field types. `addition` and `subtraction` are available only for numeric field types and change the existing stored number instead of replacing it."
        }
      },
      "required": [
        "id",
        "type",
        "value",
        "functionOperator"
      ]
    },
    "textFieldUpdate": {
      "allOf": [
        {
          "$ref": "#/$defs/baseFieldUpdate"
        },
        {
          "type": "object",
          "properties": {
            "type": {
              "enum": [
                "TEXT_BOX",
                "TEXT_AREA"
              ]
            },
            "value": {
              "type": "string",
              "minLength": 1,
              "description": "Text value to store in the selected text field. The editor trims leading and trailing whitespace and collapses repeated spaces, including line breaks entered for text-area fields."
            },
            "functionOperator": {
              "const": "set",
              "description": "Text fields always replace the stored value. Use `set`."
            }
          }
        }
      ]
    },
    "numberFieldUpdate": {
      "allOf": [
        {
          "$ref": "#/$defs/baseFieldUpdate"
        },
        {
          "type": "object",
          "properties": {
            "type": {
              "const": "NUMBER"
            },
            "value": {
              "type": "string",
              "pattern": "^-?\\d+$",
              "minLength": 1,
              "description": "Whole-number value for the selected integer field. Use digits only, with an optional leading minus sign if the target field allows negative values. The selected custom field can still impose additional min/max limits configured outside this block."
            },
            "functionOperator": {
              "type": "string",
              "enum": [
                "set",
                "addition",
                "subtraction"
              ],
              "description": "Use `set` to replace the stored number, `addition` to increase it, or `subtraction` to decrease it."
            }
          }
        }
      ]
    },
    "decimalFieldUpdate": {
      "allOf": [
        {
          "$ref": "#/$defs/baseFieldUpdate"
        },
        {
          "type": "object",
          "properties": {
            "type": {
              "const": "DECIMAL"
            },
            "value": {
              "type": "string",
              "pattern": "^-?\\d+(?:\\.\\d+)?$",
              "minLength": 1,
              "description": "Decimal value for the selected fractional-number field. Use digits with an optional leading minus sign and an optional dot-based fractional part, such as `1.5`."
            },
            "functionOperator": {
              "type": "string",
              "enum": [
                "set",
                "addition",
                "subtraction"
              ],
              "description": "Use `set` to replace the stored decimal value, `addition` to increase it, or `subtraction` to decrease it."
            }
          }
        }
      ]
    },
    "dateFieldUpdate": {
      "allOf": [
        {
          "$ref": "#/$defs/baseFieldUpdate"
        },
        {
          "type": "object",
          "properties": {
            "type": {
              "const": "DATE"
            },
            "value": {
              "type": "string",
              "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
              "description": "Calendar date in ISO format `YYYY-MM-DD`, such as `2026-03-27`. Other date formats accepted elsewhere in the product are rejected here."
            },
            "functionOperator": {
              "const": "set",
              "description": "Date fields always replace the stored value. Use `set`."
            }
          }
        }
      ]
    },
    "dateTimeFieldUpdate": {
      "allOf": [
        {
          "$ref": "#/$defs/baseFieldUpdate"
        },
        {
          "type": "object",
          "properties": {
            "type": {
              "const": "DATE_TIME"
            },
            "value": {
              "type": "string",
              "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$",
              "description": "Date-time in ISO local format `YYYY-MM-DDTHH:MM`, such as `2026-03-27T10:30`. Space-separated date-time strings are rejected by the live editor."
            },
            "functionOperator": {
              "const": "set",
              "description": "Date-time fields always replace the stored value. Use `set`."
            }
          }
        }
      ]
    },
    "dropdownFieldUpdate": {
      "allOf": [
        {
          "$ref": "#/$defs/baseFieldUpdate"
        },
        {
          "type": "object",
          "properties": {
            "type": {
              "const": "DROP_DOWN_LIST"
            },
            "value": {
              "type": "string",
              "minLength": 1,
              "description": "Selected option value for the target dropdown field. Use exactly one option value configured on that custom field."
            },
            "functionOperator": {
              "const": "set",
              "description": "Dropdown fields always replace the stored value. Use `set`."
            }
          }
        }
      ]
    },
    "checkboxListFieldUpdate": {
      "allOf": [
        {
          "$ref": "#/$defs/baseFieldUpdate"
        },
        {
          "type": "object",
          "properties": {
            "type": {
              "const": "CHECK_BOX_LIST"
            },
            "value": {
              "type": "string",
              "minLength": 1,
              "description": "Comma-separated list of selected option values for the target checkbox-list field, such as `Option1,Option2`. Use only values configured on that custom field."
            },
            "functionOperator": {
              "const": "set",
              "description": "Checkbox-list fields always replace the stored selection. Use `set`."
            }
          }
        }
      ]
    }
  }
}
</schema>

<sdk_api_reference>
## UpdateCustomFields SDK Notes

Use the loaded UpdateCustomFields schema as the source of truth for field-update shape, allowed value formats, and field-type constraints.
This supplemental note covers SDK-only serialization behavior.

### SDK-only behavior

- Author `contactFields` as structured data; do not hand-build the legacy draw2d JSON payload
- The SDK serializes structured `contactFields` to the legacy runtime storage format internally
- Legacy persisted workflow JSON stores only the field ID, value, and operator
- `sdk.getShapeParams()` returns normalized structured `contactFields` even when the workflow was persisted with legacy `userData.json.profileInputs`
</sdk_api_reference>

