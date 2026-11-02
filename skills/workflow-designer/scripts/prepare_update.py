#!/usr/bin/env python3
"""Prepare MCP SDK-update arguments offline. Does not validate/execute SDK code."""
import argparse
import json
from pathlib import Path


def prepare_update(export, code):
    if not isinstance(export, dict):
        raise ValueError("export must be an object from get_workflow_export")
    workflow_id = export.get("workflowId")
    if type(workflow_id) is not int or workflow_id <= 0:
        raise ValueError("export requires a positive integer workflowId")
    model_hash = export.get("modelHash")
    if not isinstance(model_hash, str) or not model_hash.strip():
        raise ValueError("export requires its original nonempty modelHash")
    if not isinstance(code, str) or not code.strip() or len(code) > 100_000:
        raise ValueError("SDK code must contain 1 to 100000 characters")
    return {"workflow_id": workflow_id, "expected_model_hash": model_hash, "code": code}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--export", type=Path, required=True, help="The export used to author the edit")
    parser.add_argument("--code", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    payload = prepare_update(json.loads(args.export.read_text()), args.code.read_text())
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
