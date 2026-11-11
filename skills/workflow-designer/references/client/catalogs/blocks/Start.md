<catalog_brief>
name: Start
ui_name: Start/Stop configuration
sdk_block_type: Start
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Start block",
  "description": "Schema for the Workflow Designer Start block (`esputnik.shape.Start`). Use this block to begin a workflow. Stop behavior should be authored through `WorkflowStopConfiguration` and `WorkflowStopConfigurationAdapter`, not through the Start block schema.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the Start block. Use it to explain the workflow entry point or any business context for other workflow editors; it does not change workflow execution."
    }
  }
}
</schema>

