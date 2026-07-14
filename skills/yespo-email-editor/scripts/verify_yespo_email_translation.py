#!/usr/bin/env python3
from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from typing import Any


DEFAULT_FORBIDDEN_PHRASES = (
    "Welcome to our community",
    "to our community",
    "Plagiarism",
    "AI Detector",
    "AI Writing Assistant",
    "Smart Research Helper",
)
HTML_SUFFIXES = {".html", ".htm"}
JSON_SUFFIXES = {".json"}
HTML_LIKE_RE = re.compile(r"(?is)<(?:!doctype\s+html|html\b|body\b|table\b|tr\b|td\b|span\b|a\b)")


@dataclass(frozen=True)
class Issue:
    path: str
    location: str
    phrase: str
    excerpt: str


class YespoTextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.visible_parts: list[str] = []
        self.anchor_parts: list[str] = []
        self.hidden_preheader_parts: list[str] = []
        self._skip_depth = 0
        self._hidden_preheader_depth = 0
        self._anchor_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        attrs_dict = {name.lower(): value or "" for name, value in attrs}
        if tag in {"head", "script", "style", "noscript"}:
            self._skip_depth += 1
        if tag == "span" and _class_contains(attrs_dict.get("class", ""), "esd-hidden-preheader"):
            self._hidden_preheader_depth += 1
        if tag == "a":
            self._anchor_depth += 1

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "a" and self._anchor_depth:
            self._anchor_depth -= 1
        if tag == "span" and self._hidden_preheader_depth:
            self._hidden_preheader_depth -= 1
        if tag in {"head", "script", "style", "noscript"} and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        if self._hidden_preheader_depth:
            self.hidden_preheader_parts.append(data)
            return
        self.visible_parts.append(data)
        if self._anchor_depth:
            self.anchor_parts.append(data)

    @property
    def visible_text(self) -> str:
        return _normalize_text(" ".join(self.visible_parts))

    @property
    def anchor_text(self) -> str:
        return _normalize_text(" ".join(self.anchor_parts))

    @property
    def hidden_preheader_text(self) -> str:
        return _normalize_text(" ".join(self.hidden_preheader_parts))


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Verify localized Yespo email artifacts do not retain known English source phrases "
            "in visible text, anchor text, metadata preheader, or hidden preheader text."
        )
    )
    parser.add_argument("paths", nargs="+", type=Path, help="Localized .html/.json files or directories to scan.")
    parser.add_argument(
        "--phrase",
        action="append",
        dest="phrases",
        help="Forbidden English source phrase to scan for. Can be passed multiple times.",
    )
    parser.add_argument("--json-report", type=Path, help="Optional path to write a JSON report.")
    parser.add_argument(
        "--allow-empty",
        action="store_true",
        help="Exit successfully when no supported .html/.json artifacts are found.",
    )
    return parser.parse_args()


def _class_contains(class_value: str, expected: str) -> bool:
    return re.search(rf"\b{re.escape(expected)}\b", class_value, re.IGNORECASE) is not None


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _phrase_pattern(phrase: str) -> re.Pattern[str]:
    escaped = re.escape(phrase)
    if phrase[:1].isascii() and phrase[:1].isalnum():
        escaped = rf"(?<![A-Za-z0-9]){escaped}"
    if phrase[-1:].isascii() and phrase[-1:].isalnum():
        escaped = rf"{escaped}(?![A-Za-z0-9])"
    return re.compile(escaped, flags=re.IGNORECASE)


def _excerpt(text: str, phrase: str, *, radius: int = 50) -> str:
    match = _phrase_pattern(phrase).search(text)
    if match is None:
        return text[: radius * 2].strip()
    start = max(0, match.start() - radius)
    end = min(len(text), match.end() + radius)
    return text[start:end].strip()


def _issues_for_text(path: Path, location: str, text: str, phrases: tuple[str, ...]) -> list[Issue]:
    issues: list[Issue] = []
    if not text:
        return issues
    for phrase in phrases:
        if _phrase_pattern(phrase).search(text):
            issues.append(
                Issue(
                    path=str(path),
                    location=location,
                    phrase=phrase,
                    excerpt=_excerpt(text, phrase),
                )
            )
    return issues


def _extract_html_issues(path: Path, html: str, phrases: tuple[str, ...], *, location_prefix: str) -> list[Issue]:
    parser = YespoTextExtractor()
    parser.feed(html)
    parser.close()
    issues: list[Issue] = []
    issues.extend(_issues_for_text(path, f"{location_prefix}.visible_text", parser.visible_text, phrases))
    issues.extend(_issues_for_text(path, f"{location_prefix}.anchor_text", parser.anchor_text, phrases))
    issues.extend(
        _issues_for_text(path, f"{location_prefix}.hidden_preheader", parser.hidden_preheader_text, phrases)
    )
    return issues


def _scan_json_value(path: Path, value: Any, phrases: tuple[str, ...], *, location: str) -> list[Issue]:
    issues: list[Issue] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_location = f"{location}.{key}" if location else str(key)
            key_lower = str(key).lower()
            if isinstance(child, str) and key_lower in {"html", "body", "content"} and HTML_LIKE_RE.search(child):
                issues.extend(_extract_html_issues(path, child, phrases, location_prefix=child_location))
                continue
            if isinstance(child, str) and key_lower in {"preheader", "hiddenpreheader", "hidden_preheader"}:
                issues.extend(_issues_for_text(path, child_location, _normalize_text(child), phrases))
                continue
            issues.extend(_scan_json_value(path, child, phrases, location=child_location))
        return issues
    if isinstance(value, list):
        for index, child in enumerate(value):
            issues.extend(_scan_json_value(path, child, phrases, location=f"{location}[{index}]"))
    return issues


def _scan_file(path: Path, phrases: tuple[str, ...]) -> list[Issue]:
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        return [Issue(path=str(path), location="file", phrase="<utf-8>", excerpt=str(exc))]

    suffix = path.suffix.lower()
    if suffix in HTML_SUFFIXES:
        return _extract_html_issues(path, text, phrases, location_prefix="html")
    if suffix in JSON_SUFFIXES:
        try:
            payload = json.loads(text)
        except json.JSONDecodeError as exc:
            return [Issue(path=str(path), location="json", phrase="<valid-json>", excerpt=str(exc))]
        return _scan_json_value(path, payload, phrases, location="$")
    return []


def _iter_supported_files(paths: list[Path]) -> list[Path]:
    files: list[Path] = []
    for path in paths:
        if path.is_dir():
            files.extend(
                sorted(
                    child
                    for child in path.rglob("*")
                    if child.is_file() and child.suffix.lower() in HTML_SUFFIXES | JSON_SUFFIXES
                )
            )
        elif path.is_file() and path.suffix.lower() in HTML_SUFFIXES | JSON_SUFFIXES:
            files.append(path)
    return files


def main() -> int:
    args = _parse_args()
    phrases = tuple(args.phrases or DEFAULT_FORBIDDEN_PHRASES)
    files = _iter_supported_files(args.paths)
    if not files and not args.allow_empty:
        print("error: no supported .html/.json artifacts found", file=sys.stderr)
        return 1

    issues: list[Issue] = []
    for path in files:
        issues.extend(_scan_file(path, phrases))

    report = {
        "files_scanned": [str(path) for path in files],
        "forbidden_phrases": list(phrases),
        "issue_count": len(issues),
        "issues": [asdict(issue) for issue in issues],
    }
    if args.json_report is not None:
        args.json_report.parent.mkdir(parents=True, exist_ok=True)
        args.json_report.write_text(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")

    if issues:
        print(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True), file=sys.stderr)
        return 1

    print(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
