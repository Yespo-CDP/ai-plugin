<catalog_brief>
name: Branch
ui_name: Branch
category: routing
sdk_block_type: Branch
functionality: routes a contact into one of several ordered branches based on rule groups, with an optional fallback path.
purpose: use it when the workflow needs more than two possible outcomes or needs explicit first-match routing logic by `branches` array order.
when_to_use: use it for multi-way decisioning such as segment splits, contact field-based routing, event-based routing, date-based routing, channel availability routing, or any case where contacts must be distributed across several named paths.
note: IMPORTANT: Branch blocks check branches in the exact order of the `branches` array. If the first branch condition matches, the contact goes to the first branch and later branches are not checked. Otherwise the second branch condition is checked, then the third, and so on until one branch matches. `branches[0]` maps to `output0`, `branches[1]` maps to `output1`, and so on. When creating any Connection whose sourceId is a Branch block, you MUST set sourcePortName to one of the exact port names declared in that specific Branch block schema instance. If a fallback branch is used, it MUST be the final branch.
</catalog_brief>

<schema>
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Branch block",
  "description": "Schema for the Workflow Designer Branch block (`esputnik.shape.WorkflowBranch`). Use this block to route contacts through one of several ordered branches based on rule groups, with an optional fallback branch for contacts that do not satisfy any earlier branch. Branches are checked sequentially in `branches` array order: if the first branch matches, later branches are not checked; otherwise the second branch is checked, then the third, and so on. Branch output ports follow the same index order. The author-facing input surface is the SDK `branches` array plus an optional `blockDescription`.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "branches": {
      "type": "array",
      "minItems": 2,
      "description": "Ordered branch definitions. Evaluate branches from first to last. If branch 0 matches, route to `output0` and stop. Otherwise check branch 1 and route to `output1` if it matches, then continue the same way for later branches until one matches. `branches[0]` maps to `output0`, `branches[1]` maps to `output1`, and so on. Put the most specific business rules first. If you include a fallback branch, keep it as the final branch and mark it with `isDefault: true`.",
      "items": {
        "$ref": "#/$defs/branch"
      }
    },
    "blockDescription": {
      "$ref": "#/$defs/blockDescription"
    },
    "useContactsTimeZone": {
      "type": "boolean",
      "description": "Optional time-zone mode for time-based branch rules. Use `true` only when the branch logic depends on each contact's own time zone. Leave it unset for branch rules that do not depend on current day or time."
    }
  },
  "required": [
    "branches"
  ],
  "allOf": [
    {
      "properties": {
        "branches": {
          "contains": {
            "type": "object",
            "properties": {
              "isDefault": {
                "const": false
              }
            },
            "required": [
              "isDefault"
            ]
          },
          "minContains": 1
        }
      }
    },
    {
      "properties": {
        "branches": {
          "contains": {
            "type": "object",
            "properties": {
              "isDefault": {
                "const": true
              }
            },
            "required": [
              "isDefault"
            ]
          },
          "maxContains": 1
        }
      }
    }
  ],
  "$defs": {
    "blockDescription": {
      "type": "string",
      "description": "Optional author comment for the branch block. Use it to explain the routing intent or the business meaning of the branch order."
    },
    "nonEmptyString": {
      "type": "string",
      "minLength": 1
    },
    "branch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "label": {
          "$ref": "#/$defs/nonEmptyString",
          "description": "Business label for the outgoing path. Use a short label that explains who should continue through this branch."
        },
        "showLabel": {
          "type": "boolean",
          "default": true,
          "description": "Whether the branch label should stay visible on the outgoing connection. Use `false` only when the canvas should stay visually cleaner and the comment already explains the path."
        },
        "isDefault": {
          "type": "boolean",
          "description": "Set `true` for the fallback branch that catches contacts who did not match any previous branch. Set `false` for every rule-based branch."
        },
        "ORConditions": {
          "type": "array",
          "description": "Alternative rule groups for this branch. The branch matches when at least one group matches. Inside each group, every rule must match.",
          "items": {
            "$ref": "#/$defs/orCondition"
          }
        }
      },
      "required": [
        "label",
        "isDefault",
        "ORConditions"
      ],
      "allOf": [
        {
          "if": {
            "properties": {
              "isDefault": {
                "const": true
              }
            },
            "required": [
              "isDefault"
            ]
          },
          "then": {
            "properties": {
              "ORConditions": {
                "maxItems": 0,
                "description": "Fallback branches do not have rule groups. Leave this as an empty array."
              }
            }
          },
          "else": {
            "properties": {
              "ORConditions": {
                "minItems": 1
              }
            }
          }
        }
      ]
    },
    "orCondition": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ANDConditions": {
          "type": "array",
          "minItems": 1,
          "description": "Rules that all must match for this one group to match.",
          "items": {
            "$ref": "#/$defs/andCondition"
          }
        }
      },
      "required": [
        "ANDConditions"
      ]
    },
    "andCondition": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "checkType": {
          "type": "integer",
          "enum": [
            1,
            2,
            3,
            10,
            15,
            20,
            30,
            40,
            50,
            60
          ],
          "description": "Rule source. Use contact fields for profile data, workflow context for parameters created earlier in the workflow, segmentation event for event payload rules, message activity for delivery history, segment membership for audience membership, current day/time for schedule rules, channel availability for channel reachability, and checkbox fields for checkbox-style contact fields."
        },
        "fieldId": {
          "$ref": "#/$defs/nonEmptyString",
          "description": "Selected field, parameter, segment, activity source, channel, or other source-specific operand that this rule should evaluate."
        },
        "operator": {
          "type": "string",
          "enum": [
            "EQUALS",
            "NOT_EQUALS",
            "IS_TRUE_LIKE",
            "IS_FALSE_LIKE",
            "IS_SET",
            "IS_EMPTY",
            "CONTAINS",
            "NOT_CONTAINS",
            "STARTS_WITH",
            "NOT_STARTS_WITH",
            "ENDS_WITH",
            "NOT_ENDS_WITH",
            "ONE_OF",
            "NOT_ONE_OF",
            "MATCHES",
            "BETWEEN",
            "GREATER_THAN",
            "LESS_THAN",
            "LESS_THAN_OR_EQUAL",
            "GREATER_THAN_OR_EQUAL",
            "IS_AVAILABLE",
            "IS_NOT_AVAILABLE",
            "ANY_AVAILABLE",
            "CONTAINS_ANY_OF",
            "CONTAINS_ALL_OF"
          ],
          "description": "Comparison rule to apply to the selected operand. The editor limits which operators are allowed based on the selected source and field type."
        },
        "value": {
          "type": "string",
          "description": "Comparison value for the rule. Use one value for equality, text, and comparison operators. Use a comma-separated pair such as `10,20` for `BETWEEN`. Leave it empty only for operators that do not take a value."
        }
      },
      "required": [
        "checkType",
        "fieldId",
        "operator"
      ],
      "allOf": [
        {
          "if": {
            "properties": {
              "operator": {
                "enum": [
                  "IS_SET",
                  "IS_EMPTY",
                  "IS_AVAILABLE",
                  "IS_NOT_AVAILABLE",
                  "ANY_AVAILABLE"
                ]
              }
            },
            "required": [
              "operator"
            ]
          },
          "then": {
            "properties": {
              "value": {
                "default": "",
                "description": "Value-less operators do not need an input value. Leave this empty if you include it."
              }
            }
          },
          "else": {
            "required": [
              "value"
            ]
          }
        },
        {
          "if": {
            "properties": {
              "operator": {
                "const": "BETWEEN"
              }
            },
            "required": [
              "operator"
            ]
          },
          "then": {
            "properties": {
              "value": {
                "pattern": "^.+,.+$",
                "description": "Range value for `BETWEEN`, formatted as two ordered values separated by one comma, for example `18,25`."
              }
            }
          }
        }
      ]
    }
  }
}
</schema>

<sdk_api_reference>
## Branch SDK Notes

Use the loaded Branch schema as the source of truth for branch fields, condition structure, and allowed enum values.
This supplemental note covers SDK-only behavior.

### SDK-only behavior
- `showLabel: false` suppresses the rendered connection label
- Branch matching is sequential in the exact `branches` array order: check the first branch, otherwise the second, otherwise the third, and stop at the first match
- Branch output ports are index-aligned with `branches`: `branches[0] -> output0`, `branches[1] -> output1`, and so on
- For fallback branches (`isDefault: true`), the SDK writes an empty runtime rule set even if author input included conditions
- `sdk.getShapeParams()` returns the SDK-facing `ORConditions` / `ANDConditions` shape even when persisted runtime data uses draw2d `cards` / `restrictions`

### Branch wiring

To build multiple outputs:

1. Add the Branch block.
2. Build the first branch with `addShape()`.
3. Call `sdk.selectShape(branch.id)` to return to the branch.
4. Build the next branch.

When connecting from an existing Branch block to an already existing target, use `connect()` and the exact source port for the intended branch.

## Branch Condition Params

`ShapeType.BRANCH` conditions use the editor's segmentation-card condition format:

```ts
{
  checkType: number;
  fieldId: string;
  operator: string;
  value: string;
}
```

Common `checkType` values:

| Source                      | Value |
| --------------------------- | ----- |
| Custom field, string        | `1`   |
| Custom field, number        | `2`   |
| Custom field, dropdown      | `3`   |
| Workflow context            | `10`  |
| Segmentation event          | `15`  |
| Message activity            | `20`  |
| Segment membership          | `30`  |
| Current day/time            | `40`  |
| Channel availability        | `50`  |
| Custom field, checkbox      | `60`  |

Numeric condition values are raw stored values, not display labels. The SDK does not convert between percent-display values and fractional stored values because it does not receive custom-field metadata. For a fractional number field where the stored value for 30% is `0.3`, use values such as `0.3`, `0.6`, or `0.3,0.6`; do not use `30`, `60`, `30%`, or `60%` unless the field really stores values on that scale.

For `operator: 'BETWEEN'`, `value` must be two numeric values separated by a comma, for example `0.3,0.6`. Decimal fractions use `.` as the decimal separator. Commas separate the range bounds only.

Example for a numeric custom field storing fractional percentages:

```js
{
  checkType: 2,
  fieldId: '7441',
  operator: 'BETWEEN',
  value: '0.3,0.6',
}
```

If exact boundary behavior matters, avoid overlapping `BETWEEN` ranges and use explicit comparison operators such as `GREATER_THAN_OR_EQUAL` plus `LESS_THAN` in the same `ANDConditions` group.

---

</sdk_api_reference>

