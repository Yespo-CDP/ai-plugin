# Verification

Verification is layered. Record every check as `passed`, `failed`, `not run`, or `manual`, with the command or reason. Never infer runtime success from compilation alone.

## 1. Review the Change

Inspect the complete diff before running builds:

- changes stay inside the selected app target or module;
- no unrelated formatting or generated-file churn appears;
- initialization, dependencies, notification handlers, and configuration are not duplicated;
- existing lifecycle, Firebase or APNs behavior, deep links, local notifications, analytics, authentication, and background work remain intact;
- no credentials, full device tokens, certificates, profiles, or service files were introduced or printed.

Use the repository's own secret scanner if available. A text search can supplement it but is not proof that no secret exists.

## 2. Resolve and Build

Prefer commands already used by the repository or CI. Choose the narrowest target and variant that exercise the change.

### iOS

- Resolve Swift packages or CocoaPods with the repository's normal command.
- List schemes when the intended scheme is uncertain.
- Compile the selected app target or workspace. Prefer a simulator or generic platform command that avoids signing when runtime verification is not required.
- Run existing unit tests, lint, and formatting checks relevant to changed Swift, Objective-C, project, plist, and entitlement files.
- Confirm the main target and, when applicable, Notification Service Extension both link Reteno and share the expected App Group.

### Android

- Use the checked-in Gradle wrapper.
- Resolve the dependency graph for the selected application module and variant when helpful.
- Run the relevant `assemble`, unit-test, and lint tasks rather than every repository task by default.
- Inspect the merged manifest for the selected variant when `Application`, permissions, services, or intent filters changed.
- Confirm the resolved dependency graph contains one compatible Reteno version and preserves the project's Firebase constraints.

If the build is already broken, establish the same failure on an unchanged baseline when practical. Do not repair an unrelated failure unless the user authorizes it; report it separately.

## 3. Local Runtime Verification

Run only when the environment, configured SDK key, app dependencies, and user scope permit it. Record the device or simulator/emulator and build variant.

Check, as applicable:

- startup completes and Reteno initializes without a crash;
- the anonymous device/contact initialization path is reached before login;
- notification permission appears at the intended product moment and its result reaches Reteno;
- the expected APNs or FCM token is produced and forwarded once, without exposing the value;
- foreground/background notification behavior, click handling, deep links, custom data, and rich push preserve existing routing;
- login or `externalCustomerId` behavior uses the stable backend user identity, never a device ID, push token, session ID, or device-generated UUID.

A screenshot proves visible UI state, not delivery or click telemetry. If device automation is unavailable, provide a short manual sequence and keep the result `manual` or `not run`.

## 4. Optional Yespo/eSputnik-Side Verification

MCP is an optional capability, not a prerequisite for code integration. Select the same service established during preflight: use the `yespo` connection for a Yespo account or the `esputnik` connection for an eSputnik account. These connections have independent authorization and account scope. If the repository does not establish the brand, ask before any MCP or dashboard action; never combine data from both connections.

If MCP is connected, authorized, and in scope:

1. Discover the selected connection's available capabilities and confirm its authorized account and mobile app.
2. Prefer read-only lookup of the selected test contact, device, and token state first. Confirm `contactId`, `deviceId` when available, a TZ-database time zone, and an RFC 5646 language code without exposing personal data.
3. Confirm a token exists and its type matches the integration: Android uses FCM; iOS uses the configured FCM or APNs path.
4. Before any test send, show the exact single-contact target and obtain explicit user authorization for that external side effect.
5. Send at most one narrowly scoped test push, ideally with a unique `messageTag`; never send a campaign.
6. Correlate the same contact, device, token, message identifiers, and tag while checking `DELIVERED` and, after an actual user open, `CLICKED`. `SENT` alone does not prove delivery.
7. Validate custom events, in-app messages, attachments, action buttons, or additional statuses only when that feature was integrated, modified, or explicitly requested. Report each separately.

Never expose a full token or credential. If the selected MCP connection is absent or unauthorized, report service-side validation as not performed and provide manual Yespo or eSputnik dashboard steps. Do not fail an otherwise valid compile-time integration solely because MCP is unavailable.

## 5. Completion Labels

Use the highest level actually demonstrated:

- `Code verified`: dependencies resolve and relevant compile, test, and lint checks pass.
- `Runtime verified`: code verification plus successful local launch and applicable permission/token/interaction checks.
- `End-to-end verified`: runtime verification plus authorized validation in the selected Yespo/eSputnik account and the requested delivery/click checks.
- `Partially verified`: one or more required checks failed, were blocked, or were not run.

An implementation may be complete while live validation remains unperformed. State both facts independently.
