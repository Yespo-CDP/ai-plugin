#!/usr/bin/env python3
from __future__ import annotations

import argparse
from dataclasses import dataclass
import html
import json
from pathlib import Path
import re
import sys
from typing import Any


IMG_TAG_RE = re.compile(r"(?is)<img\b[^>]*>")


class ImageEditError(Exception):
    pass


@dataclass(frozen=True)
class AttributeMatch:
    name: str
    value: str
    match_start: int
    match_end: int
    value_start: int
    value_end: int
    quote: str | None


@dataclass(frozen=True)
class ImageTag:
    index: int
    start: int
    end: int
    tag: str
    src: str | None
    alt: str | None
    width: str | None
    height: str | None
    class_name: str | None


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Inventory or replace existing image URLs inside Yespo exported HTML.",
    )
    parser.add_argument("--html", type=Path, required=True, help="Path to the exported Yespo HTML file.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("inventory", help="Print a JSON inventory of <img> tags.")

    replace = subparsers.add_parser("replace", help="Replace one existing <img> src in place.")
    replace.add_argument("--index", type=int, required=True, help="One-based image index from the inventory.")
    replace.add_argument("--expected-src", required=True, help="Current src expected at the selected image index.")
    replace.add_argument("--new-src", required=True, help="Replacement Yespo-hosted image src.")
    replace.add_argument("--new-alt", help="Optional replacement alt text. Omit to preserve the current alt attribute.")
    return parser.parse_args()


def _attr_pattern(name: str) -> re.Pattern[str]:
    return re.compile(
        rf"""(?is)(?P<prefix>\s{name}\s*=\s*)(?:"(?P<double>[^"]*)"|'(?P<single>[^']*)'|(?P<unquoted>[^\s"'=<>`]+))"""
    )


def _find_attr(tag: str, name: str) -> AttributeMatch | None:
    match = _attr_pattern(name).search(tag)
    if match is None:
        return None
    if match.group("double") is not None:
        return AttributeMatch(
            name=name,
            value=html.unescape(match.group("double")),
            match_start=match.start(),
            match_end=match.end(),
            value_start=match.start("double"),
            value_end=match.end("double"),
            quote='"',
        )
    if match.group("single") is not None:
        return AttributeMatch(
            name=name,
            value=html.unescape(match.group("single")),
            match_start=match.start(),
            match_end=match.end(),
            value_start=match.start("single"),
            value_end=match.end("single"),
            quote="'",
        )
    return AttributeMatch(
        name=name,
        value=html.unescape(match.group("unquoted")),
        match_start=match.start(),
        match_end=match.end(),
        value_start=match.start("unquoted"),
        value_end=match.end("unquoted"),
        quote=None,
    )


def _attr_value(tag: str, name: str) -> str | None:
    attr = _find_attr(tag, name)
    return attr.value if attr else None


def _find_images(html_text: str) -> list[ImageTag]:
    images: list[ImageTag] = []
    for match in IMG_TAG_RE.finditer(html_text):
        tag = match.group(0)
        index = len(images) + 1
        images.append(
            ImageTag(
                index=index,
                start=match.start(),
                end=match.end(),
                tag=tag,
                src=_attr_value(tag, "src"),
                alt=_attr_value(tag, "alt"),
                width=_attr_value(tag, "width"),
                height=_attr_value(tag, "height"),
                class_name=_attr_value(tag, "class"),
            )
        )
    return images


def _inventory_payload(html_text: str) -> dict[str, Any]:
    images = _find_images(html_text)
    return {
        "image_count": len(images),
        "images": [
            {
                "index": image.index,
                "src": image.src,
                "alt": image.alt,
                "width": image.width,
                "height": image.height,
                "class": image.class_name,
            }
            for image in images
        ],
    }


def _replace_attr(tag: str, name: str, value: str) -> str:
    attr = _find_attr(tag, name)
    escaped = html.escape(value, quote=True)
    if attr is None:
        insertion = f' {name}="{escaped}"'
        close_index = len(tag) - 2 if tag.endswith("/>") else len(tag) - 1
        return tag[:close_index] + insertion + tag[close_index:]
    if attr.quote is None:
        prefix = tag[attr.match_start : attr.value_start]
        return tag[: attr.match_start] + f'{prefix}"{escaped}"' + tag[attr.match_end :]
    return tag[: attr.value_start] + escaped + tag[attr.value_end :]


def _replace_image(
    html_text: str,
    *,
    index: int,
    expected_src: str,
    new_src: str,
    new_alt: str | None,
) -> tuple[str, dict[str, Any]]:
    if index < 1:
        raise ImageEditError("--index must be a one-based positive integer")
    images = _find_images(html_text)
    if index > len(images):
        raise ImageEditError(f"image index {index} out of range; found {len(images)} image(s)")
    image = images[index - 1]
    if image.src is None:
        raise ImageEditError(f"image index {index} has no src attribute")
    if image.src != expected_src:
        raise ImageEditError(
            f"image index {index} src mismatch: expected {expected_src!r}, found {image.src!r}"
        )

    updated_tag = _replace_attr(image.tag, "src", new_src)
    if new_alt is not None:
        updated_tag = _replace_attr(updated_tag, "alt", new_alt)
    updated_html = html_text[: image.start] + updated_tag + html_text[image.end :]
    return updated_html, {
        "image_index": image.index,
        "old_src": image.src,
        "new_src": new_src,
        "old_alt": image.alt,
        "new_alt": new_alt if new_alt is not None else image.alt,
    }


def main() -> int:
    args = _parse_args()
    try:
        html_text = args.html.read_text(encoding="utf-8")
    except FileNotFoundError:
        print(f"error: html file not found: {args.html}", file=sys.stderr)
        return 1
    except UnicodeDecodeError as exc:
        print(f"error: html file is not valid UTF-8: {args.html}: {exc}", file=sys.stderr)
        return 1

    try:
        if args.command == "inventory":
            print(json.dumps(_inventory_payload(html_text), ensure_ascii=False, sort_keys=True))
            return 0

        updated_html, details = _replace_image(
            html_text,
            index=args.index,
            expected_src=args.expected_src,
            new_src=args.new_src,
            new_alt=args.new_alt,
        )
    except ImageEditError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    if updated_html != html_text:
        args.html.write_text(updated_html, encoding="utf-8")
    print(json.dumps({"html": str(args.html), "details": details}, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
