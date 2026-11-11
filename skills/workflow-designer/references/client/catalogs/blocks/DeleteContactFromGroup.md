<catalog_brief>
name: DeleteContactFromGroup
ui_name: Remove from segment
category: contact_update
sdk_block_type: DeleteContactFromGroup
functionality: removes a contact from a selected segment.
purpose: use it to take a contact out of an audience, eligibility, or lifecycle segment when the workflow reaches this step.
when_to_use: use it when reaching the step should revoke segment membership for the current contact, or for a contact found by override identifiers.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "DeleteContactFromGroup block",
  "description": "Schema for the Workflow Designer DeleteContactFromGroup block (`esputnik.shape.DeleteContactFromGroup`). Use this block to remove a contact from a selected segment. By default the block works with the current workflow contact, but you can optionally provide one or more contact-search overrides to identify which contact should be removed.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "groupId": {
      "type": "string",
      "minLength": 1,
      "description": "Identifier of the segment that the contact should be removed from. When you provide a value, select the target segment directly instead of deriving an identifier from its name."
    },
    "email": {
      "type": "string",
      "minLength": 1,
      "description": "Optional email-address override used to find the contact that should be removed from the segment. Use this when the workflow should look up the contact by email instead of relying only on the current workflow contact. Leave this empty when no email-based lookup is needed."
    },
    "contactId": {
      "type": "string",
      "minLength": 1,
      "description": "Optional contact-identifier override used to find the contact that should be removed from the segment. Use this when the workflow already knows the platform contact ID for the target contact. Leave this empty when the workflow should not use explicit contact-ID lookup."
    },
    "phone": {
      "type": "string",
      "minLength": 1,
      "description": "Optional phone-number override used to find the contact that should be removed from the segment. Use this when the workflow should resolve the contact by phone number. Leave this empty when phone-based lookup is not needed."
    },
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the block. Use it to explain why the workflow removes contacts from this segment for other workflow editors; it does not change execution."
    }
  },
  "required": [
    "groupId"
  ]
}
</schema>

