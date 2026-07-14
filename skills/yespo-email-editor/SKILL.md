---
name: yespo-email-editor
description: Read Yespo email export manifests and clone or update them through Yespo MCP while preserving Yespo's original verbose builder HTML. Use for MCP-backed Yespo email text editing, translation/localization, and existing-image replacement in this repo.
version: 0.1.5
---

# Yespo Email Editor

## Overview

Use explicit `read`, `clone`, and `update` modes:
- `read`: call `get_email_message_export(message_id)`, download the exported files from the returned manifest, and write local files only.
- `clone`: create a new Yespo email message by uploading the local HTML and CSS into a short-lived upload session, then finalizing the message.
- `update`: update an existing Yespo email message by uploading the local HTML and CSS into a short-lived upload session, then finalizing the update.

This skill is for narrowly scoped copy edits, translation/localization, and existing-image replacement inside an existing Yespo template. Keep the original verbose Yespo builder HTML. Do not rewrite the email as a new simplified document.

## Workflow

1. `read`: call the MCP tool `get_email_message_export(message_id=<ID>)` to fetch the source message export manifest by ID.
2. Download the exported artifacts from the manifest links using `curl` via the Bash tool (e.g., `curl -sL "<url>" -o output/yespo/email_<ID>.html`). Yespo export URLs are signed and safe to download. Do not use WebFetch — it loads content into the conversation context, wasting tokens on large templates.
3. Write local files under a fresh run directory for image replacement, or under `output/yespo` for ordinary read/text workflows:
   - For existing-image replacement, create `output/yespo/runs/email_<ID>_<UTC_TIMESTAMP>/` and write all source artifacts, downloaded original images, replacement images, and edited HTML inside that run directory.
   - Do not reuse existing `output/yespo/email_<ID>.*` or `output/yespo/runs/...` artifacts for a new Yespo image replacement.
   - `email_<ID>.json`: full normalized email JSON from the export.
   - `email_<ID>.html`: the editable HTML from the export, when present. This is the file to edit.
   - `email_<ID>.css`: the dedicated Yespo `css` field from the export, when present.
   - `email_<ID>_<LANG>.json`, `email_<ID>_<LANG>.html`, and `email_<ID>_<LANG>.css`: per-translation artifacts when the export includes language variants. Treat each language variant as its own HTML/CSS artifact pair, not as a lightweight copy of the base message.
4. Edit the run-local `email_<ID>.html` file in place with the appropriate validated helper.
   - For visible text/button copy and explicit hidden preheader replacements, use `skills/yespo-email-editor/scripts/edit_yespo_email_html.py`.
   - Run `python3 skills/yespo-email-editor/scripts/edit_yespo_email_html.py --html <path> --replacements <json-path>`.
   - The replacements JSON must contain objects shaped like `{"block_type":"text"|"button"|"hidden_preheader","old":"...","new":"..."}`.
   - Change only visible text inside elements whose class contains `esd-block-text` or `esd-block-button`.
   - Treat `<a>` anchor text inside editable text/button blocks as translatable visible text, but preserve `href` URLs unless the user explicitly requests URL localization.
   - Translate product and tool labels during translation/localization unless the user explicitly asks to preserve English brand labels.
   - For existing image replacement, first run `python3 skills/yespo-email-editor/scripts/edit_yespo_email_images.py --html <path> inventory`.
   - Replace exactly one existing image with `python3 skills/yespo-email-editor/scripts/edit_yespo_email_images.py --html <path> replace --index <one-based-index> --expected-src <old-src> --new-src <yespo-asset-url>`.
   - Add `--new-alt <text>` only when the user explicitly asks to change alt text.
   - Keep message-level `subject` and metadata `preheader` updates outside the HTML edit path when the task requires them.
   - Keep hidden preheader HTML unchanged for unrelated copy edits. For full email translation/localization or explicit preheader requests, translate only text inside the existing `esd-hidden-preheader` span with `block_type:"hidden_preheader"`.
   - Do not change any HTML text, attributes, classes, IDs, language tags, `href` URLs, image URLs, alt text, comments, tracking markup, or block metadata outside the selected validated text or image replacement.
   - Do not replace the file with a newly authored HTML document.
   - Do not remove Yespo wrappers, table structure, tracking markup, inline styles, conditional comments, or other verbose builder output.
   - If the helper reports a missing, ambiguous, or out-of-scope replacement, stop and report that validation failure instead of retrying with manual file edits.
5. If replacing an image, upload the replacement image to Yespo before editing HTML:
   - Use a local replacement image file supplied by the user or produced earlier in the session.
   - When the new image should match an existing one, download the selected original image URL with `curl -sL` into the run directory first and use it as the visual reference. A failed original-image download is a hard blocker: stop and report it instead of using cached files or stale assets.
   - Unless the user explicitly requests a different creative direction, the replacement should preserve the original image layout, composition, color palette, embedded text placement, typography, device or product mockups, crop, proportions, transparent alpha channel, and visual hierarchy; change only the requested subject detail.
   - The image uploaded to Yespo should keep the same natural pixel dimensions as the original image it replaces unless the user explicitly requested another final size.
   - Yespo accepts `JPG`, `PNG`, `GIF`, and `WEBP` images up to 3 MB. If the replacement file exceeds that, compress it before upload instead of uploading the original.
   - Choose one asset filename from the replacement file basename, for example `Path(<local-image-file>).name`.
   - Call Yespo MCP `prepare_image_upload(name=<asset-filename>)`.
   - Stage the replacement file to the returned signed image upload URL with `curl -sS --fail -X PUT -H "Content-Type: <image-mime>" --data-binary @<local-image-file> "<signed-upload-url>"`.
   - After that staged upload returns HTTP 2xx, call Yespo MCP `upload_image(uploadSessionId=<same-ID>, name=<same-asset-filename>)`.
   - The `name` value must be byte-for-byte identical in `prepare_image_upload` and `upload_image`; do not shorten, rename, or retry with a different filename.
   - If `upload_image` fails with a 5xx Yespo API error, wait 10 seconds and retry once with the same upload session ID and same asset filename.
   - If that retry fails, stop and report the Yespo API error instead of creating extra image upload sessions, uploading the original image, or guessing alternate names.
   - Use only the final Yespo-hosted image URL returned by MCP as `--new-src`; do not use local file paths, chat-hosted URLs, or signed temporary URLs in email HTML.
6. `clone` or `update`: read the edited `html` file, prepare a Yespo upload session, upload `html` and the original source `css` to the returned signed HTTP endpoints, then finalize through Yespo MCP.
   - Upload with `curl -sS --fail -X PUT -H "Content-Type: <mime>" --data-binary @<local-path> "<signed-upload-url>"`.
   - Keep `PUT` as the upload method for Yespo email HTML and CSS uploads unless the upload session explicitly says to use another method.
   - For HTML uploads use `text/html; charset=utf-8`. For CSS uploads use `text/css; charset=utf-8`.
   - Do not send signed upload URLs through `/mcp`, and do not append synthetic `path=` query params.
   - Always upload the original source message `css` field as the session's `css` artifact unless the user explicitly provides replacement CSS.
   - Never send empty CSS unless the source message CSS is actually empty.
   - Never extract, infer, rebuild, or synthesize CSS from the HTML document, `<head>`, or `<style>` tags.
   - When translations are present or requested, upload each language variant's HTML and CSS from that variant's exported artifacts. Do not silently reuse base-message CSS for translations.

## Translations

Treat multilingual messages as a first-class workflow. Each translation is a separate variant that must preserve its own exported HTML, CSS, and Unicode text exactly unless the user explicitly requests a change for that language.

When `get_email_message_export(message_id=<ID>)` returns per-translation artifacts:
- read and preserve each translation separately
- write a local `.html`, `.css`, and `.json` artifact for each language variant
- keep the base message and each translation variant distinct throughout the edit and upload flow

For multilingual `clone` and `update`:
- upload HTML for every requested language variant from that variant's local edited HTML artifact
- upload CSS for every requested language variant from that variant's dedicated exported `css` artifact unless the user explicitly provides replacement CSS for that same variant
- never reuse the base message CSS for a translation unless that translation export truly has no dedicated CSS and the user explicitly accepts the fallback
- before finalize, verify that every requested language variant has both uploaded HTML and uploaded CSS attached to the upload session

Unicode preservation is mandatory for translations:
- preserve all Unicode characters exactly, including emoji
- do not transliterate, normalize away, replace with ASCII, or drop unsupported-looking glyphs
- if the source translated HTML or JSON contains emoji, the output must contain the same emoji unless the user explicitly asks to remove or replace them

Run a translation self-check before finalize:
- compare source versus output for each requested language variant
- confirm CSS is present for every variant
- confirm unchanged translated text preserved the same emoji content
- confirm visible text includes translated anchor text and translated product/tool labels unless the user explicitly requested English brand labels
- confirm metadata `preheader` and hidden `esd-hidden-preheader` text are localized for full email translation/localization requests
- run `python3 skills/yespo-email-editor/scripts/verify_yespo_email_translation.py` on localized artifacts before upload/finalize when the task is full email translation/localization
- when `update_email_message_translation` reports malformed JSON or a JSON parse failure through MCP, rely on a follow-up `get_email_message_export(message_id=<ID>)` check rather than the write response body
- if the self-check fails, retry the translation upload step once before finishing

Translation failure checklist:
- missing CSS in any requested translation is a hard blocker
- dropped or altered emoji in unchanged translated text is a hard blocker
- untranslated hidden preheader text in a requested translation/localization is a hard blocker
- leftover English visible link labels or tool/product labels from the source language are a hard blocker unless explicitly preserved
- malformed JSON from `update_email_message_translation` is not a hard blocker if a follow-up `get_email_message_export(message_id=<ID>)` confirms the requested translation state

## Mode Details

### `read`

Call `get_email_message_export(message_id=<SOURCE_ID>)`, download the exported artifacts from the manifest links with `curl -sL` via Bash, then write the local files listed above.

For ordinary text workflows, edit this file:

- `output/yespo/email_<SOURCE_ID>.html`

For image replacement workflows, create and edit the fresh run-local file:

- `output/yespo/runs/email_<SOURCE_ID>_<UTC_TIMESTAMP>/email_<SOURCE_ID>.html`

Treat the current run's HTML file as the source of truth. Preserve its overall structure and edit only text nodes inside existing `esd-block-text` and `esd-block-button` blocks with `skills/yespo-email-editor/scripts/edit_yespo_email_html.py`, plus hidden preheader text inside the existing `esd-hidden-preheader` span when the task is full email translation/localization or explicitly mentions preheader.
For image tasks, inventory existing images with `skills/yespo-email-editor/scripts/edit_yespo_email_images.py` and replace only the selected existing image `src` after Yespo MCP returns a hosted asset URL.
Do not hand-edit exported Yespo HTML under `output/yespo/` with generic file-edit tools.
Treat `subject` and metadata `preheader` as metadata updates outside the HTML edit path. Keep hidden preheader HTML unchanged for unrelated copy edits, but localize the existing hidden preheader text for full email translation/localization or explicit preheader requests.

Do not treat `email_<SOURCE_ID>.html` as the CSS source. CSS comes from the separate Yespo `css` field only.
Do not expect Yespo storage field names in the exported JSON. Current `yespo-mcp` exposes the editable document as `html`.
When translation artifacts are present, read them into separate per-language local files and preserve each translation's dedicated CSS alongside its HTML.

### `clone`

Use the fetched source message as defaults, load the edited local `html` file, call `prepare_email_message_upload(operation="create")`, upload the edited `html` and source `css` to the signed upload URLs, then create the message with Yespo MCP `create_email_message`.

Allowed changes for `clone` are limited to:
- text inside existing `esd-block-text` blocks
- text inside existing `esd-block-button` blocks
- text inside the existing `esd-hidden-preheader` span for full translation/localization or explicit preheader requests
- one selected existing image `src`, only after uploading the replacement image through Yespo MCP image upload
- that selected image's `alt` attribute only when explicitly requested
- message `subject`
- message `preheader`

Everything else must stay byte-for-byte unchanged where practical, including layout markup, links, non-selected images, classes, attributes, CSS, and Yespo config blocks.

Build the payload with these defaults unless the user explicitly overrides them:

- `name`
- `from`
- `subject`
- `languageCode`
- `tags`
- `subscriptionsKeys`
- `preheader` only if the source payload exposes it and the task requires changing it

The uploaded `css` artifact is mandatory: always copy it from the source message's dedicated `css` field. Do not omit it, clear it, replace it with empty CSS, or derive it from HTML during clone.
For multilingual messages, the uploaded CSS artifact is mandatory for every requested translation variant as well. Use each translation's dedicated exported `css` artifact.

Send this write payload shape:

- `uploadSessionId` = returned by `prepare_email_message_upload`
- other copied metadata fields as listed above

Do not manually send `html` or `css` to `create_email_message`. Current `yespo-mcp` requires those files to be uploaded first and finalized by `uploadSessionId`.

Because this skill preserves the original verbose Yespo HTML, the uploaded message should retain the builder-style markup rather than a stripped custom document.

Before finalizing a multilingual clone:
- verify every requested translation variant has uploaded HTML and uploaded CSS
- verify unchanged translated text preserved emoji and other Unicode characters exactly
- retry the translation upload step once if the verification fails

If the user asks for the created message link or preview, call `get_email_message_view_link` for the new message ID.

### `update`

Use the same source-default behavior as `clone`, but call `prepare_email_message_upload(operation="update", message_id=<TARGET_ID>)`, upload the edited `html` and source `css` to the signed upload URLs, and then call Yespo MCP `update_email_message` for the target message ID instead of creating a new message.

Always include the original source message `css` field in the uploaded CSS artifact unless the user explicitly provides replacement CSS. Do not extract CSS from the HTML document.
Send `uploadSessionId`, not `html` or `css`, to `update_email_message`.
For multilingual updates, apply the same rule to every requested translation variant and preserve each translation's dedicated CSS artifact separately.

Allowed changes for `update` are the same as `clone`: edit only text in existing `esd-block-text` and `esd-block-button` blocks, text inside the existing `esd-hidden-preheader` span for full translation/localization or explicit preheader requests, plus `subject` and `preheader` if requested.
For image replacement, the same selected-image rule applies: replace exactly one existing image `src` with a Yespo-hosted asset URL, and change `alt` only when explicitly requested.

`update` needs two IDs:
- source ID: the message you read and use as the default field source
- target ID: the existing message to overwrite with the edited local HTML

Before finalizing a multilingual update:
- verify every requested translation variant has uploaded HTML and uploaded CSS
- verify unchanged translated text preserved emoji and other Unicode characters exactly
- retry the translation upload step once if the verification fails

## Defaults and Notes

- Use Yespo MCP tools for all Yespo operations, not direct API calls or local HTTP scripts.
- Use the MCP tool `get_email_message_export(message_id)` for reads.
- Always download export artifacts using `curl -sL` via the Bash tool. Do not use WebFetch — it loads file content into the conversation context, wasting tokens.
- Always upload signed Yespo HTML and CSS session artifacts with `curl` `PUT` and an explicit `Content-Type` header.
- Never route signed Yespo upload URLs through `/mcp`, and do not invent `?path=` wrappers for them.
- Keep text-only editing centered on `output/yespo/email_<SOURCE_ID>.html`; keep image replacement editing centered on a fresh `output/yespo/runs/email_<SOURCE_ID>_<UTC_TIMESTAMP>/email_<SOURCE_ID>.html`.
- Never hand-edit exported Yespo HTML artifacts under `output/yespo/` with generic file-edit tools; use the bundled validated helpers.
- Use `skills/yespo-email-editor/scripts/edit_yespo_email_html.py` for visible text, button copy, and explicit hidden preheader replacements inside exported Yespo HTML.
- Use `skills/yespo-email-editor/scripts/verify_yespo_email_translation.py` to fail full translation/localization outputs that retain known English source phrases in visible text, anchor text, metadata preheader, or hidden preheader text.
- Use `skills/yespo-email-editor/scripts/edit_yespo_email_images.py` for existing image inventory and image `src` replacement inside exported Yespo HTML.
- When an existing Yespo image is being replaced with a matching variant, download the original image into the run directory first and treat a failed download as a hard blocker.
- Never use stale image files or previous `output/yespo/runs/*` artifacts as a replacement shortcut. The replacement image, source download, HTML, and CSS must belong to the same fresh run directory unless the user explicitly supplied a local file.
- If the user asks to replace an image but does not identify which current image to replace, inventory images and ask for the target image instead of guessing.
- Image replacement may only target an existing `<img>` tag. Do not add image blocks, remove image blocks, move blocks, or rewrite builder markup.
- Image `src` replacement must use a final Yespo-hosted asset URL returned by MCP `upload_image`.
- Yespo image upload finalization must use the exact same `name` passed to `prepare_image_upload`; never finalize with a shortened or alternate filename.
- Treat `subject` and metadata `preheader` as metadata updates outside the HTML edit path.
- Keep hidden preheader HTML unchanged for unrelated copy edits. For full email translation/localization or explicit preheader requests, translate only text inside the existing `esd-hidden-preheader` span with `block_type:"hidden_preheader"`.
- Treat anchor text inside editable blocks as translatable content, and preserve `href` URLs unless URL localization is explicitly requested.
- Translate product and tool labels during translation/localization unless the user explicitly asks to preserve English brand labels.
- If the helper reports a missing, ambiguous, or out-of-scope replacement, stop and report that validation failure instead of retrying with manual file edits.
- Treat malformed JSON from `update_email_message_translation` as an upstream Yespo MCP protocol defect, not a user-content error.
- If `update_email_message_translation` reports malformed JSON or a JSON parse failure, immediately run `get_email_message_export(message_id=<ID>)` to verify the requested translation state.
- If the export confirms the requested translation, save `output/yespo/email_<ID>_verify.json`, report success with a warning about the malformed MCP response, and do not retry the same translation write.
- Persist the original Yespo verbose HTML structure. Never simplify, re-template, prettify, or regenerate the document from scratch.
- This editor may change only text inside existing `esd-block-text` and `esd-block-button` blocks, text inside the existing `esd-hidden-preheader` span when translation/preheader scope requires it, plus `subject` and `preheader` when requested.
- Do not add blocks, remove blocks, move blocks, rename classes, alter `href` URLs unless URL localization is requested, alter image sources outside the selected replacement, alter alt text, alter `lang`, alter head contents, alter inline styles, or alter config/tracking sections.
- Unless the user requests overrides, copy source values for `name`, `from`, `subject`, `languageCode`, `tags`, and `subscriptionsKeys`.
- Always persist the original message `css` when cloning or updating. Missing CSS can make the uploaded email appear stripped even if the HTML structure is preserved.
- Read CSS from the dedicated Yespo `css` field when fetching the message, persist that same field on writes, and never reconstruct CSS from the HTML.
- For multilingual messages, apply the same CSS preservation rule to every translation variant independently.
- Current `yespo-mcp` exports expose the editable document as `html`.
- Current `yespo-mcp` writes require an upload session. Upload `html` and `css` first, then finalize with `uploadSessionId`.
- `get_email_message_export` returns a manifest with signed download URLs for `json`, `html`, and `css` artifacts, plus per-translation artifacts when present.
- Per-translation exports must be preserved as separate artifacts. Do not collapse them into the base message or assume the base CSS covers translated variants.
- Preserve emoji and other Unicode characters exactly across translated variants unless the user explicitly asks for a language-specific change.
- Do not inject duplicate CSS into the HTML document, and do not remove trailing Yespo blocks such as `esd-config-block`.
- This skill supports reading, cloning, updating, and optionally retrieving a view link.
- This revision supports replacing existing email images through Yespo MCP `prepare_image_upload` and `upload_image`.
- Do not use JWT/content upload endpoints, chat-hosted URLs, local paths, temporary signed URLs, or filename-based image URL rewriting in email HTML.
- If an uploaded message looks stripped, that means the local `email_<ID>.html` file was replaced with simplified markup before clone/update. Yespo stored exactly what was sent.

## Resources

Bundled helper scripts are part of the primary workflow in this revision:
- `skills/yespo-email-editor/scripts/edit_yespo_email_html.py` for validated visible text, button copy, and explicit hidden preheader replacements inside exported Yespo HTML
- `skills/yespo-email-editor/scripts/verify_yespo_email_translation.py` for localized artifact checks against retained English source phrases
- `skills/yespo-email-editor/scripts/edit_yespo_email_images.py` for validated existing image inventory and replacement inside exported Yespo HTML
