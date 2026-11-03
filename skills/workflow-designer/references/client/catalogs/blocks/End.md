<catalog_brief>
name: End
ui_name: End
category: utility
sdk_block_type: End
functionality: terminates the current workflow path.
purpose: use it to make the end of a branch explicit.
when_to_use: use it when a path should stop with no further actions, waits, or decisions after this point.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "End block",
  "description": "Schema for the Workflow Designer End block (`esputnik.shape.End`). Use this block to terminate a workflow path.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the end step. Use it to explain why this path terminates here for other workflow editors; it does not change workflow execution."
    }
  },
  "required": []
}
</schema>

