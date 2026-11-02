<catalog_brief>
name: SegmentationTask
ui_name: Check values
category: routing
sdk_block_type: CustomCondition
functionality: checks one or more segmentation-style rule cards and continues through the YES branch when the rules match.
purpose: use it when segmentation-like restrictions should decide the YES or NO path.
when_to_use: use it for binary decisions expressed as restriction cards with one or more rules.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "segmentationTask block",
  "description": "Exact task schema for `segmentationTask` based on the editor converter and validators.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskName": {
      "const": "segmentationTask"
    },
    "taskParams": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "$ref": "#/$defs/restrictionsParam"
          }
        ]
      },
      "allOf": [
        {
          "contains": {
            "$ref": "#/$defs/restrictionsParam"
          },
          "minContains": 1,
          "maxContains": 1
        }
      ],
      "minItems": 1,
      "maxItems": 1
    },
    "blockDescription": {
      "type": "string"
    }
  },
  "required": [
    "taskName"
  ],
  "$defs": {
    "restrictionsParam": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "restrictions"
        },
        "type": {
          "const": "text"
        },
        "value": {
          "anyOf": [
            {
              "$ref": "#/$defs/restrictionsValue"
            },
            {
              "type": "string",
              "minLength": 2,
              "pattern": "^\\{[\\s\\S]*\\}$",
              "description": "Serialized JSON form of restrictionsValue."
            }
          ]
        }
      },
      "required": [
        "name",
        "type",
        "value"
      ],
      "description": "Restrictions value. Prefer the object form; if using the serialized string form, it must parse to the same object shape."
    },
    "restrictionsValue": {
      "type": "object",
      "additionalProperties": true,
      "properties": {
        "cards": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/restrictionCard"
          }
        }
      },
      "required": [
        "cards"
      ],
      "description": "Top-level Check values restrictions object."
    },
    "restrictionCard": {
      "type": "object",
      "additionalProperties": true,
      "properties": {
        "restrictions": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/restriction"
          }
        }
      },
      "required": [
        "restrictions"
      ],
      "description": "Each card must contain a restrictions array, even when it is empty."
    },
    "restriction": {
      "type": "object",
      "additionalProperties": true,
      "properties": {
        "fieldName": {
          "type": "string",
          "description": "Selected field key. For additional fields, use the field ID as a string."
        },
        "fieldSource": {
          "type": "number",
          "description": "1=text, 2=number/decimal, 3=dropdown, 10=standard contact field, 60=checkbox-list."
        },
        "operator": {
          "type": "string"
        },
        "value": {
          "type": [
            "string",
            "number",
            "boolean",
            "null"
          ]
        }
      },
      "required": [
        "fieldName",
        "fieldSource",
        "operator",
        "value"
      ],
      "description": "Concrete rule shape. Agent should emit fieldName/fieldSource."
    }
  }
}
</schema>

<sdk_api_reference>
- Build this block as `ShapeType.CUSTOM_CONDITION` with `taskName: "segmentationTask"`.
- The `restrictions` task param value must be a restrictions object, or a JSON string that parses to that object.
- The required shape is `{ "cards": [{ "restrictions": [...] }] }`.
- Concrete rules must use `fieldName` and `fieldSource`. For additional fields, `fieldName` is the additional field ID as a string, not the display name. `fieldSource` is `1` for text, `2` for number/decimal, `3` for dropdown, `10` for standard contact fields, and `60` for checkbox-list.
- Do not emit `[]`, `{ "values": [] }`, an object without `cards`, or card objects without `restrictions`.
- If no rules are known yet, use `{ "cards": [] }` or `{ "cards": [{ "restrictions": [] }] }` as a safe draft structure.

#### Check values (`segmentationTask`) restrictions

For `ShapeType.CUSTOM_CONDITION` with `taskName: 'segmentationTask'`, pass one `taskParams` entry named `restrictions`. Prefer a structured object value, not serialized JSON:

```js
sdk.updateShape(condition.id, {
  taskName: 'segmentationTask',
  taskParams: [
    {
      name: 'restrictions',
      type: 'text',
      value: {
        cards: [
          {
            restrictions: [
              {
                fieldName: '9726',
                fieldSource: 2,
                operator: 'EQUALS',
                value: '123',
              },
            ],
          },
        ],
      },
    },
  ],
  blockDescription: 'Check whether additional field intt equals 123',
});
```

Restriction field rules:

- `fieldName` is the selected field key. For additional/contact custom fields, use the field ID as a string`.
- agents should generate `fieldName` and `fieldSource` directly for this block.
- Do not put the additional field display name, such as `intt`, into `fieldName`; resolve it to the field ID from organisation data first.

Common `fieldSource` values:

| Source                      | Value |
| --------------------------- | ----- |
| Custom field, string        | `1`   |
| Custom field, number        | `2`   |
| Custom field, dropdown      | `3`   |
| standard contact fields     | `10`  |
| Custom field, checkbox      | `60`  |

</sdk_api_reference>
