---
name: mobile-sdk-integration
description: Integrate, complete, diagnose, or verify the Reteno Mobile SDK for Yespo or eSputnik in an existing native Swift iOS or Kotlin/Java Android app. Use when the user asks to add the Yespo/eSputnik mobile SDK, finish a partial Reteno integration, configure mobile push, permissions, token handling, a notification service extension, Android Application setup, deep links, or validate an existing integration. Do not use for Flutter, React Native, Expo, Cordova, Ionic, Unity, or another wrapper unless the task is explicitly limited to its native host project.
---

# Yespo / eSputnik Mobile SDK Integration

Integrate the Reteno SDK used by Yespo and eSputnik into the project that is actually present. Prefer the smallest compatible change over a fresh generic setup.

This workflow covers core dependency, initialization, mobile-push, permission, token, lifecycle, and deep-link integration. When the user explicitly requests another Reteno feature such as In-App, App Inbox, ecommerce, or custom-event tracking, use the matching current official documentation and extend the plan only for that feature.

## Account Selection

Yespo and eSputnik use the same underlying platform and Reteno mobile SDK, but represent different brands, accounts, app configurations, documentation sites, and OAuth connections.

- Preserve the technical SDK identifiers `Reteno`, `com.reteno:fcm`, and the `reteno-local-storage` App Group suffix for both brands. Never rename them to Yespo or eSputnik identifiers.
- Use repository or user context to select Yespo or eSputnik documentation and console instructions.
- This plugin declares independent `yespo` and `esputnik` MCP connections. One authorization does not grant the other, and data must never be mixed between them.
- If an MCP or dashboard action is requested and the target brand/account is unclear, ask one focused question before that action. Brand ambiguity does not block code-only inspection or compile-time integration.
- When the brand remains unknown during code-only work, compare both branded documentation sets and use only their shared Reteno SDK flow. Let the installed or locked SDK version determine the applicable API, keep the final report at `Service: not established`, and do not select an MCP connection. Ask only if a material code choice cannot be resolved from the repository, installed SDK, and instructions common to both brands.

## Workflow

1. Read [references/platform-detection.md](references/platform-detection.md). Inspect the repository before editing or asking questions.
2. Summarize the detected service brand when known, platform, target or module, dependency manager, installed Reteno version and integration state, configuration mechanism, and repository-native verification commands. Show a short implementation plan.
3. Load exactly the applicable platform guide:
   - Native iOS: [references/ios.md](references/ios.md)
   - Native Android: [references/android.md](references/android.md)
4. Extend an existing integration instead of duplicating it. Preserve lifecycle code, notification delegates and services, Firebase or APNs setup, deep-link routing, authentication, analytics, local notifications, WorkManager configuration, and repository conventions.
5. Read and apply [references/verification.md](references/verification.md). Run the narrowest relevant dependency, build, test, and lint checks supported by the repository.
6. If a check fails, load only the relevant section of [references/troubleshooting.md](references/troubleshooting.md), form an evidence-backed hypothesis, make the smallest safe correction, and rerun the affected check.
7. End with the structure in [references/final-report.md](references/final-report.md), including manual console or device steps and everything that remains unverified.

## Boundaries

- Treat discovery as read-only. Respect repository-local instructions and preserve unrelated or pre-existing changes.
- Do not switch package managers, redesign app architecture, broadly upgrade dependencies, raise deployment targets or `minSdk`, or create duplicate notification handlers to make the integration fit.
- Never invent a mobile SDK access key, Yespo/eSputnik App ID, bundle ID, package name, Firebase configuration, signing value, or console state.
- Never place credentials in tracked source, command output, logs, screenshots, prompts, or the final report. Reuse the project's approved configuration injection. If none exists, leave an explicit safe integration point and list provisioning as a manual step.
- Do not commit, push, merge, create a release, or change Apple, Google, Firebase, or the selected Yespo/eSputnik console state unless the user explicitly asks.
- MCP is optional. The code integration must work without it. If the user wants server-side validation, use only the selected `yespo` or `esputnik` connection within its authorized account and app.
- Sending a push or changing a contact is an external side effect. Obtain explicit authorization immediately before doing so, target one confirmed test contact, and never substitute a broad campaign.
- Distinguish code/build verification, local runtime verification, and Yespo/eSputnik end-to-end verification. Never label an unperformed layer as verified.

## Stop Conditions

Pause before editing when the repository is a cross-platform wrapper, the iOS app is Objective-C-only and has no verified existing Reteno bridge, the intended app target or flavor is ambiguous, multiple incompatible push providers appear active, the requested runtime behavior requires a configuration value but neither an existing injection mechanism nor a safe compile-time seam can be established, or the requested change would remove existing behavior. Report the evidence and ask one focused question.
