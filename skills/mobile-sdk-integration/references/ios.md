# Native iOS Integration

Use this guide only after native iOS and the intended app target are confirmed.

## Sources and Version Policy

Use the official documentation matching the selected service. If the service remains `not established` during code-only work, compare both sets below, follow only their shared Reteno SDK flow, and let the installed or locked SDK version select the applicable API. Do not infer a brand or use MCP merely to resolve documentation routing.

- Yespo: [SDK overview](https://docs.yespo.io/reference/sdk-release-notes), [iOS setup](https://docs.yespo.io/reference/ios-sdk-setup), [iOS release notes](https://docs.yespo.io/page/ios-sdk-release-notes), and [SDK access keys](https://docs.yespo.io/reference/managing-mobile-sdk-access-keys).
- eSputnik: [SDK overview](https://docs.esputnik.com/reference/sdk-release-notes), [iOS setup](https://docs.esputnik.com/reference/ios-sdk-setup), [iOS release notes](https://docs.esputnik.com/page/ios-sdk-release-notes), and [SDK access keys](https://docs.esputnik.com/reference/managing-mobile-sdk-access-keys).

Both services use the `Reteno` SDK package and API names. At the 2026-09-04 review, the Yespo SDK overview lists iOS SDK 2.7.3, and both setup guides recommend iOS 14+, Xcode 15+, and Swift 5.7+. Recheck the selected service's official pages before choosing a version because branded documentation may update at different times. Keep an already installed stable version unless the user requests an upgrade or current documentation proves the requested feature requires one. Never select a prerelease automatically.

## Dependency

Keep the project's existing dependency manager.

- Swift Package Manager URL: `https://github.com/reteno-com/reteno-mobile-ios-sdk.git`
- Package product and module: `Reteno`
- CocoaPods pod: `Reteno`

Add the dependency only to targets that use it. For a complete push integration, the official flow uses `Reteno` in both the main app and a Notification Service Extension so the SDK can process notifications and record delivery while the app is terminated, as well as support rich content. If push is in scope, inspect, reuse, or configure the extension unless current official documentation for the installed version and intended behavior explicitly says it is unnecessary. A dependency-only or non-push integration does not require a new extension.

Resolve dependencies after editing. Avoid hand-editing `project.pbxproj` if target membership and capabilities cannot be changed reliably; give exact Xcode steps instead of risking project corruption.

## Initialization

Initialize once, early in application launch, after the configuration source is available. Reuse the existing `AppDelegate`. For a pure SwiftUI app without one, add a minimal `UIApplicationDelegate` and connect it with `@UIApplicationDelegateAdaptor` without replacing the SwiftUI entry point.

The current API shape is:

```swift
import Reteno

Reteno.start(
    apiKey: sdkAccessKey,
    deviceTokenHandlingMode: .automatic
)
```

Here `sdkAccessKey` represents a value obtained through the project's approved configuration mechanism; do not add a literal key or commit a realistic placeholder. If the app has no suitable injection mechanism, make the smallest safe configuration seam and mark key provisioning as manual.

Choose token handling deliberately:

- `.automatic` for a direct APNs integration when the SDK should obtain and forward the APNs token;
- `.manual` for FCM or when the app already owns token registration and forwarding.

Do not change an existing mode without tracing its token source. Never pass an APNs token to an FCM-configured Yespo/eSputnik mobile app or an FCM token to an APNs-configured one.

Pass a `RetenoConfiguration` only for settings the project actually needs. Preserve established lifecycle, debug-mode, in-app, and tracking choices.

## Notification Permission and Registration

Preserve the app's existing permission timing and onboarding UX. If no permission flow exists and the requested scope includes push, the SDK helper is available after `Reteno.start`:

```swift
Reteno.userNotificationService.registerForRemoteNotifications(
    with: [.sound, .alert, .badge],
    application: application
)
```

Do not trigger a system prompt merely to test the integration. Runtime permission requires user interaction in the app.

## Existing Notification Delegates

Do not replace `UNUserNotificationCenterDelegate`, Firebase `MessagingDelegate`, local-notification behavior, analytics, or app routing. Merge Reteno forwarding into the established callbacks and ensure every completion handler is called exactly once.

For notification responses, preserve current behavior and forward the response:

```swift
Reteno.userNotificationService.processRemoteNotificationResponse(response)
completionHandler()
```

Configure Reteno foreground-presentation handlers only when needed and preserve the app's chosen presentation options.

## Manual Token Handling

Use these paths only with `.manual`.

For FCM, forward the non-empty token supplied by `MessagingDelegate`:

```swift
func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    guard let fcmToken else { return }
    Reteno.userNotificationService.processRemoteNotificationsToken(fcmToken)
}
```

For direct APNs, convert the device token to lowercase hexadecimal and forward it:

```swift
func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    Reteno.userNotificationService.processRemoteNotificationsToken(token)
}
```

Preserve any Firebase token refresh, backend registration, or analytics work already performed in these callbacks.

## Push Notification Service Extension and App Groups

When full push processing, terminated-app delivery tracking, or rich push is in scope:

1. Reuse an existing Notification Service Extension when present.
2. Ensure its deployment target is not higher than the main app target.
3. Link `Reteno` to the extension target.
4. Make its notification service class inherit from `RetenoNotificationServiceExtension` while preserving unrelated custom processing only when the SDK extension supports that composition.
5. Configure the same App Group on the app and extension: `group.<main-bundle-id>.reteno-local-storage`.

The class normally reduces to:

```swift
import UserNotifications
import Reteno

class NotificationService: RetenoNotificationServiceExtension {}
```

Capabilities, App Groups, signing, certificates, provisioning, APNs credentials, and Firebase or selected Yespo/eSputnik console changes can require external authority. Apply repository changes when safe; list console or signing work separately.

## Deep Links

Touch deep-link handling only when requested or needed for notification clicks. Keep the existing coordinator or router. Consult the selected service's current guide: [Yespo links handler](https://docs.yespo.io/reference/ios-links-handler) or [eSputnik links handler](https://docs.esputnik.com/reference/links-handler). For SDK 2.0.2 and later, the current handler shape is:

```swift
Reteno.addLinkHandler { linkInfo in
    // Route linkInfo.url and preserve handling for customData and source.
}
```

Use the API matching the installed SDK version. Do not install a parallel router or bypass existing authentication and navigation gates.

## Platform Checks

In addition to the shared verification guide, confirm:

- Reteno initializes exactly once in the selected target;
- token mode matches APNs or FCM wiring;
- delegates and completion handlers preserve all prior behavior;
- the package is linked to every target importing it;
- app and extension entitlements use the same exact App Group when rich push is enabled;
- no SDK key, push token, certificate, profile, or service credential entered tracked files or logs.
