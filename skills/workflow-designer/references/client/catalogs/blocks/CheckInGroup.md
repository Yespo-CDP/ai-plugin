<catalog_brief>
name: CheckInGroup
ui_name: Included in segment?
category: condition
sdk_block_type: CheckInGroup
functionality: checks whether a contact belongs to a selected segment before the workflow continues.
purpose: use it to make downstream behavior depend on segment membership without changing the segment itself.
when_to_use: use it when the workflow should branch differently for contacts already included in a segment versus contacts who are not.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CheckInGroup block",
  "description": "Schema for the Workflow Designer CheckInGroup block (`esputnik.shape.CheckInGroup`). Use this block to check whether a contact belongs to a segment before branching the workflow. By default the check runs against the current workflow contact, but you can optionally override the lookup target with exactly one identifier: email, contact ID, or phone.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "groupId": {
      "type": "string",
      "minLength": 1,
      "description": "Identifier of the segment whose membership should be checked."
    },
    "groupName": {
      "type": [
        "string",
        "null"
      ],
      "description": "Name of the selected segment. This value is derived from `groupId` in the editor and should match the chosen segment when provided."
    },
    "email": {
      "type": "string",
      "minLength": 1,
      "description": "Optional email address of the contact to check. Use this only when the workflow should look up membership by email instead of relying on the current workflow contact. Fill at most one of `email`, `contactId`, or `phone`."
    },
    "contactId": {
      "type": "string",
      "minLength": 1,
      "description": "Optional contact identifier to check against the selected segment. Use this only when the workflow should resolve segment membership by a known contact ID. Fill at most one of `email`, `contactId`, or `phone`."
    },
    "phone": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|\\d+)$",
      "description": "Optional phone identifier to check against the selected segment. Use a digits-only phone value such as `380970001122`, or a variable expression such as `${phoneNumber}` that resolves to one. Fill at most one of `email`, `contactId`, or `phone`."
    },
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the block. Use it to explain why the segment-membership check exists for other workflow editors."
    }
  },
  "required": [
    "groupId"
  ],
  "allOf": [
    {
      "oneOf": [
        {
          "not": {
            "anyOf": [
              {
                "required": [
                  "email"
                ]
              },
              {
                "required": [
                  "contactId"
                ]
              },
              {
                "required": [
                  "phone"
                ]
              }
            ]
          }
        },
        {
          "required": [
            "email"
          ],
          "not": {
            "anyOf": [
              {
                "required": [
                  "contactId"
                ]
              },
              {
                "required": [
                  "phone"
                ]
              }
            ]
          }
        },
        {
          "required": [
            "contactId"
          ],
          "not": {
            "anyOf": [
              {
                "required": [
                  "email"
                ]
              },
              {
                "required": [
                  "phone"
                ]
              }
            ]
          }
        },
        {
          "required": [
            "phone"
          ],
          "not": {
            "anyOf": [
              {
                "required": [
                  "email"
                ]
              },
              {
                "required": [
                  "contactId"
                ]
              }
            ]
          }
        }
      ]
    }
  ]
}
</schema>

