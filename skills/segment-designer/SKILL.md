---
name: segment-designer
description: Inspect and explain saved segment audiences and rules, discover live segment definitions, prepare dynamic segment edits, or count an unsaved audience when the selected customer connection authorizes it.
---

# Segment designer

Read [OPERATING_MANUAL.md](OPERATING_MANUAL.md) before segment work and the [SDK reference](references/client/SDK_API_REFERENCE.md) before writing a mutation. All authenticated reads and writes belong to the host's installed Yespo/eSputnik MCP OAuth connection. The bundled SDK runner only prepares local validated payloads; it cannot save or count contacts.

Discover the tools and schemas on the selected connection first. Current Yespo/eSputnik MCP supports `create_dynamic_segment`, `update_dynamic_segment`, and `count_segment_contacts` through customer OAuth, subject to the selected organization's permissions and features. Use an available, authorized operation for the requested task; if it is missing or denied, report that actual restriction. Historical access notes in pinned references do not override live discovery. Never obtain an agent token, switch to another organization, or bypass permissions to complete an operation.

Keep one selected organization. Use live definitions and exact IDs, preserve untouched rules, check each SDK mutation, and inspect final Boolean formulas and warnings. Never report local preparation as a saved segment or a completed count. Pending, failed, denied, or missing counts are unavailable, not zero.
