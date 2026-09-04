# Platform and Integration Detection

Use this phase before modifying files. Do not print secret values while inspecting configuration.

## 1. Read Repository Instructions

Locate applicable `AGENTS.md`, `CLAUDE.md`, contribution guidance, CI definitions, build scripts, and task-runner configuration. Follow the closest scoped instructions for every file you may edit.

Check working-tree status. Existing changes belong to the user; do not overwrite or reformat unrelated work.

## 2. Identify the Real Platform

Use multiple signals rather than directory names alone.

| Platform | Strong evidence | Typical supporting evidence |
| --- | --- | --- |
| Native iOS | An Xcode application target confirmed for iOS through its build settings or supported destinations, plus a UIKit or SwiftUI app entry point | `.xcodeproj`, `.xcworkspace`, `Package.swift`, `Podfile`, `SDKROOT=iphoneos`, `SUPPORTED_PLATFORMS` containing `iphoneos`/`iphonesimulator`, `IPHONEOS_DEPLOYMENT_TARGET`, `Info.plist`, entitlements, Xcode schemes |
| Native Android | Gradle Android application plugin and an application module | `AndroidManifest.xml`, `settings.gradle(.kts)`, `gradlew`, `Application`, launcher activity |
| Cross-platform wrapper | Flutter, React Native, Expo, Cordova, Ionic, Unity, or another framework owns the app entry point | Generated `ios/` or `android/` directories, wrapper package manifests and build scripts |

Do not select a native flow merely because a wrapper project contains `ios/` or `android/`. Explain that this skill covers native projects and ask whether work should be limited to an explicitly maintained native host layer.

An Xcode project alone is not proof of iOS because macOS, tvOS, watchOS, and multi-platform repositories use the same files. Inspect the selected target's project settings or repository-standard `xcodebuild` output and confirm an iOS destination, SDK, or deployment target before loading the iOS flow.

The current official iOS setup is Swift-based. In an Objective-C-only or mixed project, preserve any verified existing bridge, but do not invent Objective-C API equivalents. Stop and request SDK-owner guidance when a new bridge would be required. Android examples may be translated between Kotlin and Java using the official signatures.

If both native apps are first-class repository products, scope and plan them separately. Do not assume both should change.

## 3. Inventory the Selected App

Record paths and names, not credential values:

- service brand or account evidence when present, without guessing from the `Reteno` SDK name alone;
- app target or Android application module;
- bundle ID or `applicationId`, including relevant variants or flavors;
- language and lifecycle or entry-point model;
- package manager and dependency declaration style;
- Reteno dependency, resolved version when available, and all imports or API calls;
- APNs or FCM setup, notification delegates or services, permission flow, deep-link routes, and extension or capability configuration;
- configuration sources such as build settings, `.xcconfig`, Gradle properties, generated resources, environment injection, or a secrets manager;
- build, test, lint, and dependency-resolution commands used by CI, scripts, README files, Fastlane, Xcode schemes, or Gradle tasks.

Search for names such as `Reteno`, `Reteno.start`, `RetenoConfig`, `Reteno.initWithConfig`, `processRemoteNotificationsToken`, notification delegates, `FirebaseMessagingService`, and Reteno dependency coordinates. Inspect manifests, target membership, and dependency files rather than relying only on text matches.

## 4. Classify the Existing State

Use one of these states:

- `absent`: no Reteno dependency or code is present;
- `dependency-only`: dependency exists but initialization is absent;
- `initialized`: initialization exists but requested notification or lifecycle wiring is missing;
- `push-partial`: some permission, token, delivery, click, extension, or deep-link handling exists but the requested flow is incomplete;
- `complete-but-unverified`: expected code and configuration appear present, but verification has not run;
- `conflicting`: duplicated initialization, mixed token modes/providers, incompatible versions, or competing handlers require a decision.

Do not reinstall an existing dependency or create a second initialization path. For `conflicting`, stop before destructive cleanup and present the exact conflict.

## 5. Present the Preflight

Before editing, give a compact preflight containing:

```text
Platform: <native iOS | native Android>
Service: <Yespo | eSputnik | not established>
Scope: <target/module and variant>
Dependency: <manager and Reteno version/state>
Push provider: <APNs | FCM | not detected>
Configuration: <source path/mechanism; no values>
Verification: <commands discovered>
Plan: <2-5 minimal steps>
```

Ask only for information that cannot be established from the repository or the selected brand's official documentation. A missing real access key does not block dependency and compile-time integration when a safe configuration boundary can be used, but it must block claims of runtime initialization or end-to-end verification.
