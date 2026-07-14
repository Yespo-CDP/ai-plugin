#!/usr/bin/env python3
from __future__ import annotations

import argparse
from dataclasses import dataclass
from html import escape as html_escape
import json
from pathlib import Path
import re
import sys
from typing import Any


TD_TAG_RE = re.compile(r"(?is)</?td\b[^>]*>")
SPAN_OPEN_TAG_RE = re.compile(r"(?is)<span\b[^>]*>")
CLASS_ATTR_RE = re.compile(r"""(?is)\bclass\s*=\s*(["'])(.*?)\1""")
HTML_TOKEN_RE = re.compile(r"(?is)(<!--.*?-->|<[^>]+>)")
REPLACEMENT_BLOCK_TYPES = {"text", "button", "hidden_preheader"}


class EditError(Exception):
    pass


@dataclass(frozen=True)
class ReplacementSpec:
    block_type: str
    old: str
    new: str


@dataclass(frozen=True)
class EditableBlock:
    block_type: str
    inner_start: int
    inner_end: int


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Apply validated visible-text replacements inside Yespo exported HTML blocks.",
    )
    parser.add_argument("--html", type=Path, required=True, help="Path to the exported Yespo HTML file to edit in place.")
    parser.add_argument(
        "--replacements",
        type=Path,
        required=True,
        help="Path to a JSON file containing a replacement list or an object with a replacements array.",
    )
    return parser.parse_args()


def _load_replacements(path: Path) -> list[ReplacementSpec]:
    try:
        raw_value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise EditError(f"replacements file not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise EditError(f"replacements file is not valid JSON: {path}: {exc}") from exc

    if isinstance(raw_value, dict):
        raw_value = raw_value.get("replacements")
    if not isinstance(raw_value, list):
        raise EditError("replacements JSON must be a list or an object with a 'replacements' list")

    replacements: list[ReplacementSpec] = []
    for index, item in enumerate(raw_value):
        if not isinstance(item, dict):
            raise EditError(f"replacement[{index}] must be an object")
        block_type = str(item.get("block_type") or "").strip().lower()
        old = item.get("old")
        new = item.get("new")
        if block_type not in REPLACEMENT_BLOCK_TYPES:
            raise EditError(f"replacement[{index}] block_type must be 'text', 'button', or 'hidden_preheader'")
        if not isinstance(old, str) or not old:
            raise EditError(f"replacement[{index}] old must be a non-empty string")
        if not isinstance(new, str):
            raise EditError(f"replacement[{index}] new must be a string")
        replacements.append(ReplacementSpec(block_type=block_type, old=old, new=new))
    return replacements


def _extract_block_type(tag_text: str) -> str | None:
    match = CLASS_ATTR_RE.search(tag_text)
    if match is None:
        return None
    class_value = match.group(2)
    if re.search(r"\besd-block-button\b", class_value, re.IGNORECASE):
        return "button"
    if re.search(r"\besd-block-text\b", class_value, re.IGNORECASE):
        return "text"
    return None


def _tag_has_class(tag_text: str, class_name: str) -> bool:
    match = CLASS_ATTR_RE.search(tag_text)
    if match is None:
        return False
    return re.search(rf"\b{re.escape(class_name)}\b", match.group(2), re.IGNORECASE) is not None


def _find_editable_blocks(html: str) -> list[EditableBlock]:
    stack: list[tuple[int, int, str | None]] = []
    blocks: list[EditableBlock] = []

    for match in TD_TAG_RE.finditer(html):
        tag_text = match.group(0)
        is_close = tag_text.startswith("</")
        if not is_close:
            stack.append((match.start(), match.end(), _extract_block_type(tag_text)))
            continue
        if not stack:
            raise EditError("Yespo HTML is malformed: unmatched </td> tag")
        _, inner_start, block_type = stack.pop()
        if block_type is not None:
            blocks.append(
                EditableBlock(
                    block_type=block_type,
                    inner_start=inner_start,
                    inner_end=match.start(),
                )
            )

    if stack:
        raise EditError("Yespo HTML is malformed: unmatched <td> tag")
    blocks.sort(key=lambda block: block.inner_start)
    return blocks


def _find_hidden_preheader_blocks(html: str) -> list[EditableBlock]:
    blocks: list[EditableBlock] = []
    for match in SPAN_OPEN_TAG_RE.finditer(html):
        if not _tag_has_class(match.group(0), "esd-hidden-preheader"):
            continue
        close_match = re.search(r"(?is)</span\s*>", html[match.end() :])
        if close_match is None:
            raise EditError("Yespo HTML is malformed: hidden preheader span is missing </span>")
        inner_end = match.end() + close_match.start()
        blocks.append(
            EditableBlock(
                block_type="hidden_preheader",
                inner_start=match.end(),
                inner_end=inner_end,
            )
        )
    return blocks


def _is_conditional_comment(token: str) -> bool:
    lowered = token.lower()
    return lowered.startswith("<!--") and "[if " in lowered and lowered.endswith("-->")


def _replace_visible_text(fragment: str, old: str, new: str) -> tuple[str, int]:
    output: list[str] = []
    matches = 0

    for token in HTML_TOKEN_RE.split(fragment):
        if token == "":
            continue
        if HTML_TOKEN_RE.fullmatch(token):
            if token.startswith("<!--") and _is_conditional_comment(token):
                inner = token[4:-3]
                replaced_inner, nested_matches = _replace_visible_text(inner, old, new)
                matches += nested_matches
                output.append(f"<!--{replaced_inner}-->")
            else:
                output.append(token)
            continue
        matches += token.count(old)
        output.append(token.replace(old, new))

    return "".join(output), matches


def _apply_replacements(html: str, replacements: list[ReplacementSpec]) -> tuple[str, list[dict[str, Any]]]:
    current_html = html
    applied: list[dict[str, Any]] = []

    for index, replacement in enumerate(replacements):
        # Escape the replacement text so literal <, >, & in (possibly translated)
        # copy are written as valid HTML entities instead of raw markup. quote=False
        # keeps this a text-node escape, mirroring the attribute-level
        # html.escape(..., quote=True) used by edit_yespo_email_images.py.
        escaped_new = html_escape(replacement.new, quote=False)
        if replacement.block_type == "hidden_preheader":
            blocks = _find_hidden_preheader_blocks(current_html)
        else:
            blocks = _find_editable_blocks(current_html)
        matching_blocks: list[tuple[EditableBlock, int]] = []

        for block in blocks:
            if block.block_type != replacement.block_type:
                continue
            block_inner = current_html[block.inner_start : block.inner_end]
            _, visible_matches = _replace_visible_text(block_inner, replacement.old, escaped_new)
            if visible_matches:
                matching_blocks.append((block, visible_matches))

        total_matches = current_html.count(replacement.old)
        if not matching_blocks:
            if total_matches:
                raise EditError(
                    f"replacement[{index}] old text appears only outside allowed {replacement.block_type} blocks"
                )
            raise EditError(f"replacement[{index}] old text not found")
        if len(matching_blocks) > 1:
            raise EditError(
                f"replacement[{index}] old text is ambiguous across {len(matching_blocks)} {replacement.block_type} blocks"
            )

        block, visible_matches = matching_blocks[0]
        original_inner = current_html[block.inner_start : block.inner_end]
        replaced_inner, _ = _replace_visible_text(original_inner, replacement.old, escaped_new)
        current_html = current_html[: block.inner_start] + replaced_inner + current_html[block.inner_end :]
        applied.append(
            {
                "replacement_index": index,
                "block_type": replacement.block_type,
                "visible_matches": visible_matches,
            }
        )

    return current_html, applied


def main() -> int:
    args = _parse_args()
    try:
        html_text = args.html.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        print(f"error: html file not found: {args.html}", file=sys.stderr)
        return 1
    except UnicodeDecodeError as exc:
        print(f"error: html file is not valid UTF-8: {args.html}: {exc}", file=sys.stderr)
        return 1

    try:
        replacements = _load_replacements(args.replacements)
        updated_html, applied = _apply_replacements(html_text, replacements)
    except EditError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    if updated_html != html_text:
        args.html.write_text(updated_html, encoding="utf-8")

    print(
        json.dumps(
            {
                "html": str(args.html),
                "replacements_applied": len(applied),
                "details": applied,
            },
            ensure_ascii=False,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
