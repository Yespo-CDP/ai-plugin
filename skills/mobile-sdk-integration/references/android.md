# Native Android Integration

Use this guide only after native Android, the application module, and the intended variant or flavor are confirmed.

## Sources and Version Policy

Use the official documentation for the service selected during preflight. If the service remains `not established` during code-only work, compare both sets below, follow only their shared Reteno SDK flow, and let the installed or locked SDK version select the applicable API. Do not infer a brand or use MCP merely to resolve documentation routing.

- Yespo: [SDK overview](https://docs.yespo.io/reference/sdk-release-notes), [Android setup](https://docs.yespo.io/reference/android-sdk-setup), [push handling](https://docs.yespo.io/reference/android-push-handling), [Android release notes](https://docs.yespo.io/page/android-sdk-release-notes), and [mobile SDK access keys](https://docs.yespo.io/reference/managing-mobile-sdk-access-keys).
- eSputnik: [SDK overview](https://docs.esputnik.com/reference/sdk-release-notes), [Android setup](https://docs.esputnik.com/reference/android-sdk-setup), [push handling](https://docs.esputnik.com/reference/android-push-handling), [Android release notes](https://docs.esputnik.com/page/android-sdk-release-notes), and [mobile SDK access keys](https://docs.esputnik.com/reference/managing-mobile-sdk-access-keys).

Both services use the Reteno Android SDK package and APIs shown below. At the 2026-09-04 review, the Yespo SDK overview lists Android 2.10.1, and the setup guide states Android 8.0+ functionality and Java 8 compatibility. Recheck the selected brand's current pages before choosing a version because documentation can be published at different times. Existing SDK versions may support lower `minSdk` with reduced behavior: never raise `minSdk` without explicit approval and a clear report of affected devices. Keep an installed stable version unless an upgrade is requested or required for the requested feature. Never select a prerelease automatically.

## Gradle Dependency

Respect the existing Groovy or Kotlin DSL, version catalog, plugin management, repository declarations, Firebase BoM, and dependency constraints.

- Repository: Maven Central
- SDK coordinate: `com.reteno:fcm:<stable-version>`

For push integration, also verify the project has the Google Services plugin, the Firebase Messaging dependency or dependencies required by the current setup guide, and an existing `google-services.json` that belongs to the selected application ID and variant. Add only missing build declarations. Do not invent, download, or replace `google-services.json`; obtaining the correct file is a manual Firebase-owner step when it is absent.

Do not duplicate or downgrade Firebase Messaging. If the project already resolves Firebase through a BoM or catalog, follow that convention rather than copying literal versions from the setup guide. If Firebase is absent, follow the selected service's current official guide and Firebase setup using the project's Gradle style; do not freeze the example Firebase version from the documentation into this skill.

Java 8 compatibility is the minimum shown by the SDK guide. Preserve a higher existing Java or Kotlin target. Add compatibility configuration only when missing and required by dependency resolution or compilation.

## Initialization

Initialize once from the existing custom `Application`. Create one only if none exists and register it without displacing another framework's application class.

The current Kotlin API shape is:

```kotlin
import com.reteno.core.Reteno
import com.reteno.core.RetenoConfig

override fun onCreate() {
    super.onCreate()
    Reteno.initWithConfig(
        RetenoConfig.Builder()
            .accessKey(sdkAccessKey)
            .build()
    )
}
```

Here `sdkAccessKey` represents a value obtained through the project's approved configuration mechanism. Do not add a literal key or a realistic placeholder. Keep flavor-specific values in the established build configuration or secret injection path, and report only the source mechanism.

For a Java application, use the same builder without translating the project to Kotlin:

```java
@Override
public void onCreate() {
    super.onCreate();
    Reteno.initWithConfig(
        new RetenoConfig.Builder()
            .accessKey(sdkAccessKey)
            .build()
    );
}
```

If an `Application` subclass is added or changed, confirm the merged manifest resolves the intended `android:name`. Preserve dependency-injection, analytics, WorkManager, multidex, and lifecycle initialization order.

Add advanced `RetenoConfig.Builder` options only for a demonstrated requirement. Do not silently change in-app, lifecycle, device ID, debug, or default-channel behavior.

## Notification Permission

Preserve existing permission UX and timing. On Android 13+, if no permission flow exists and push is in scope, the built-in helper may be used from a suitable lifecycle-aware UI context:

```kotlin
lifecycleScope.launch {
    val isGranted = RetenoNotifications.requestNotificationPermission()
    // Preserve the app's result handling.
}
```

If the app owns the permission request, notify Reteno after the grant state changes:

```kotlin
Reteno.instance.updatePushPermissionStatus()
```

The Java equivalent is `Reteno.getInstance().updatePushPermissionStatus();`.

Do not request permission automatically on startup merely for verification. Add manifest permissions only when required by the selected target SDK and current official setup.

## Firebase and Existing Handlers

Reteno uses FCM data messages and normally displays the notification. Preserve the current Firebase project, Google Services configuration, token refresh path, custom `FirebaseMessagingService`, analytics, and other notification providers.

Before editing service declarations or callbacks, determine whether the existing handler:

- consumes or forwards FCM data messages;
- uploads refreshed tokens elsewhere;
- creates custom notifications or channels;
- handles authentication, analytics, deep links, or background work.

Merge the minimum Reteno-compatible behavior. Do not register competing services or remove another provider. If ownership of incoming messages cannot be reconciled from the code and official guide, stop and report the conflict.

## Deep Links, Custom Data, and Events

Touch these only when in scope.

- Preserve existing manifest intent filters, verified App Links, navigation graphs, authentication gates, and fallback behavior.
- Android 12+ web links require compatible intent resolution; do not broaden URL ownership without the user's domain and product intent.
- Reteno custom data arrives in the launch or deep-link activity intent extras. Read it in both `onCreate` and `onNewIntent` when the app's launch mode requires both.
- Use `RetenoNotifications.received`, `.click`, or `.close` listeners only when the app needs those events. Retain listener references and remove them with the lifecycle expected by the app.
- Configure the default notification channel only when required; Android limits many channel changes after creation.

## Variants and External Configuration

Apply dependencies, manifests, resources, and the SDK key to the selected application module and variant. Do not assume debug and release use the same Yespo/eSputnik mobile app, Firebase project, `applicationIdSuffix`, or credentials.

Firebase console, service accounts, `google-services.json`, signing keys, the selected Yespo/eSputnik mobile app settings, and production push changes may require external authority. Never fabricate or overwrite them. Continue compile-time work where possible and list exact manual prerequisites.

## Platform Checks

In addition to the shared verification guide, confirm:

- the dependency resolves once for the selected module and variant;
- Reteno initializes exactly once and the merged manifest points to the intended `Application`;
- Firebase dependencies and service declarations are not duplicated or downgraded;
- the Google Services plugin and the selected variant's Firebase configuration resolve when push is in scope;
- permission state is reported after a custom request flow;
- deep links and custom data preserve existing routing;
- `minSdk`, target compatibility, notification channel, and WorkManager behavior were not changed without need;
- no SDK key, FCM token, service credential, or signing material entered tracked files or logs.
