<catalog_brief>
name: DeleteContactTask
ui_name: Delete contact
category: integration
sdk_block_type: Custom
functionality: deletes the current workflow contact from the database so the contact no longer receives messages, while allowing the contact to be restored later; records a required deletion reason.
purpose: use it when the workflow must remove the contact record from the database and stop messaging that contact, rather than only remove the contact from a segment.
when_to_use: use it when the contact should be deleted and stop receiving messages; deletion is reversible because the contact can always be restored later. Use `DeleteContactFromGroup` when only segment membership should be removed.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "deleteContactTask block",
  "description": "Exact task schema for `deleteContactTask` based on the editor converter and validators. The task deletes the current workflow contact from the database, after which the contact no longer receives messages. The contact can always be restored later. A deletion reason is required.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "deleteContactTask"
    },
    "taskParams": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/deletionReasonParam"
      },
      "contains": {
        "$ref": "#/$defs/deletionReasonParam"
      },
      "minContains": 1,
      "maxContains": 1,
      "minItems": 1,
      "maxItems": 1,
      "default": [
        {
          "name": "deletionReason",
          "type": "String",
          "value": "Inactive contact"
        }
      ]
    },
    "blockDescription": {
      "type": "string"
    }
  },
  "required": [
    "taskName"
  ],
  "$defs": {
    "deletionReasonParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "deletionReason"
        },
        "type": {
          "const": "String"
        },
        "value": {
          "type": "string",
          "minLength": 1,
          "pattern": ".*\\S.*",
          "default": "Inactive contact"
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "Required deletion reason. The editor defaults this value to `Inactive contact`."
    }
  }
}
</schema>
