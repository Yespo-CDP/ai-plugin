<catalog_brief>
name: AddContactToGroup
ui_name: Add to segment
category: contact_update
sdk_block_type: AddContactToGroup
functionality: adds a contact to a selected segment.
purpose: use it to enroll a contact into an audience or eligibility segment that later workflow logic or campaigns can rely on.
when_to_use: use it when reaching this step should place the current contact, or a contact found by override identifiers, into a segment.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "AddContactToGroup block",
  "description": "Schema for the Workflow Designer AddContactToGroup block (`esputnik.shape.AddContactToGroup`). Use this block to add a contact to a selected segment. By default the block works with the current workflow contact, but you can optionally provide one or more contact-search overrides to identify which contact should be added.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "groupId": {
      "type": "string",
      "minLength": 1,
      "description": "Identifier of the segment that should receive the contact. When you provide a value, select the target segment directly instead of deriving an identifier from its name."
    },
    "email": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|[^\\s@]+@[^\\s@]+\\.[^\\s@]+)$",
      "description": "Optional email address override used to find the contact that should be added to the segment. Use a valid email address such as `user@example.com`, or a variable expression such as `${email}`. Leave this empty when the workflow should use the current contact without email-based lookup."
    },
    "contactId": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|\\d+)$",
      "description": "Optional contact identifier override used to find the contact that should be added to the segment. Use either a digits-only contact ID such as `12345` or a variable expression such as `${contactId}`. Leave this empty when the workflow should use the current contact without an explicit contact-ID lookup."
    },
    "phone": {
      "type": "string",
      "pattern": "^(\\$\\{[^}]+\\}|\\d+)$",
      "description": "Optional phone-number override used to find the contact that should be added to the segment. Use either a digits-only phone number such as `380970001122` or a variable expression such as `${phoneNumber}`. Leave this empty when the workflow should use the current contact without phone-based lookup."
    },
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the block. Use it to explain why the workflow adds contacts to this segment for other workflow editors; it does not change execution."
    }
  },
  "required": [
    "groupId"
  ]
}
</schema>

