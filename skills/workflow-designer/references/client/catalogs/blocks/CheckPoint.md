<catalog_brief>
name: CheckPoint
ui_name: Check point
category: utility
sdk_block_type: CheckPoint
functionality: places an optional named checkpoint in the workflow.
purpose: use it to mark an important point in the flow so that the step is easy to identify in configuration or operational review.
when_to_use: use it when the workflow needs a recognizable marker but not a business action, message send, or condition check.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CheckPoint block",
  "description": "Schema for the Workflow Designer CheckPoint block (`esputnik.shape.CheckPoint`). Use this block to place an optional named checkpoint in the workflow. Fill `checkPointName` when the checkpoint should be identifiable by name in the workflow configuration; leave it empty when no explicit checkpoint label is needed.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "checkPointName": {
      "type": "string",
      "default": "",
      "description": "Optional checkpoint name. Use it when this point in the workflow should have a stable human-readable label. Leave it empty when the checkpoint does not need a specific name."
    },
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the checkpoint block. Use it to explain why this checkpoint exists for other workflow editors; it does not change workflow execution."
    }
  }
}
</schema>

