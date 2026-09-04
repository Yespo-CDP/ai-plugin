# Troubleshooting

Load only the section related to an observed failure. Work from evidence, not a generic checklist.

## Method

1. Identify the first failed step and capture the exact command, error, log location, runtime state, or redacted server response.
2. Compare the code with the installed SDK version and the selected service's current official documentation.
3. Form one testable hypothesis and make the smallest safe change.
4. Rerun the affected check, then any downstream check invalidated by the change.
5. After two attempts at the same failure without new evidence, stop. Request the exact missing log, console access, environment detail, or owner decision.

Do not broadly upgrade dependencies, reset package locks, delete caches indiscriminately, weaken signing or transport security, replace notification infrastructure, or fix unrelated failures as a troubleshooting shortcut.

## iOS

### Dependency or import failure

- Confirm the selected scheme uses the expected project or workspace.
- Confirm `Reteno` resolves at the declared version and is linked to every target importing it.
- For CocoaPods, use the workspace and repository-standard install command.
- For an extension failure, check target membership and that its deployment target does not exceed the app's.

### Initialization or startup crash

- Confirm `Reteno.start` runs once and after the key source is available.
- Check that the API matches the installed version, especially after an older SDK integration.
- Inspect exception text and SDK debug logs without exposing keys or tokens.

### Missing token or delivery

- Confirm permission and remote-notification registration state.
- Confirm `.automatic` is paired with direct APNs, or `.manual` with the intended FCM/APNs callback.
- Verify only the correct token type is forwarded and token refresh remains wired.
- For APNs, distinguish sandbox from production signing and the selected Yespo/eSputnik push configuration; tokens are not interchangeable.
- For FCM, check the Firebase project and APNs credential linkage without replacing existing configuration.

### Rich push or click failure

- Check Notification Service Extension embedding, Reteno linkage, class inheritance, deployment target, App Group spelling, and matching entitlements.
- Trace `UNUserNotificationCenterDelegate` ownership and ensure response forwarding and completion handlers are preserved.
- Test the actual supported interaction path; a visible banner or screenshot does not prove a click event.

## Android

### Dependency or build failure

- Inspect the resolved dependency graph for duplicate Reteno or Firebase versions.
- Confirm Maven Central is available through the project's repository policy.
- Preserve the Firebase BoM or catalog rather than adding competing literal versions.
- Confirm Java/Kotlin compatibility and the selected variant before considering any project-wide change.

### Initialization or startup crash

- Confirm the merged manifest names the intended `Application` and `super.onCreate()` runs before Reteno initialization.
- Check the API against the installed SDK version and the availability of the configured access-key source.
- Preserve dependency-injection, WorkManager, multidex, analytics, and other `Application` initialization.

### Missing token, `pushSubscribed=false`, or delivery failure

- Check runtime notification permission, blocked app/channel settings, and whether a custom permission flow calls `updatePushPermissionStatus()`.
- Confirm Firebase registration succeeds and the selected Yespo/eSputnik mobile app uses the matching Firebase project/Sender ID.
- Trace existing `FirebaseMessagingService` ownership before adding any service.
- Check background restrictions and WorkManager/ANR logs independently from SDK registration.
- Treat a stale-looking app label as a warning, not proof of wrong configuration; validate the actual token/provider association in the selected service.

### Click, deep-link, or custom-data failure

- Inspect the merged manifest, activity launch mode, intent filters, Android 12+ App Link configuration, and both `onCreate` and `onNewIntent` paths.
- Preserve authentication and navigation gates.
- Check listener registration and lifecycle removal when using `RetenoNotifications` events.

## Access, MCP, and External Systems

A missing SDK key, console role, device, signing profile, APNs credential, Firebase file, or MCP capability is an external prerequisite, not evidence of a code defect. Continue independent compile-time checks, redact sensitive evidence, and report the exact owner action needed.

If optional service-side validation cannot locate a contact or status, verify that the selected `yespo` or `esputnik` connection has the intended organization/app scope and identifiers before retrying. Never switch brands silently or widen a test send to compensate for lookup failure.
