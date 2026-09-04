# Mobile SDK Integration Release Checklist

This checklist separates the implemented instruction package from the external review, infrastructure, and release work required before calling version 0.4.0 published.

## Implemented in This Repository

- [x] Add `skills/mobile-sdk-integration` with a short workflow router.
- [x] Split native platform detection, iOS, Android, verification, troubleshooting, and final reporting into progressive-disclosure references.
- [x] Support both Yespo and eSputnik while preserving the Reteno SDK's real package, API, and App Group identifiers.
- [x] Detect partial integrations and preserve existing architecture, lifecycle, notification, Firebase/APNs, deep-link, analytics, authentication, local-notification, and WorkManager behavior.
- [x] Keep mobile SDK keys and other credentials out of tracked source and reports.
- [x] Make the selected `yespo` or `esputnik` MCP connection optional for repository integration and require explicit approval before a single-contact test push.
- [x] Distinguish code, runtime, and end-to-end service validation.
- [x] Add skill UI metadata and discovery prompts.
- [x] Align Claude, Codex, and Claude marketplace manifests on 0.4.0.
- [x] Defer Codex MCP authentication until an MCP-backed workflow is used.
- [x] Document Claude, Codex marketplace, and project-local installation paths.

## SDK Technical Review

- [ ] Assign an iOS SDK owner and review the Swift, APNs/FCM, Notification Service Extension, App Group, click, and deep-link flow against both branded documentation sites.
- [ ] Assign an Android SDK owner and review Gradle, Firebase, `Application`, permission, service coexistence, WorkManager, and deep-link flow against both branded documentation sites.
- [ ] Confirm all referenced APIs against the stable SDK versions selected for release.
- [ ] Decide whether Objective-C receives a supported bridge or remains explicitly outside the first release.
- [ ] Confirm the core scope and decide whether In-App, App Inbox, ecommerce, custom-event, and advanced identity instructions belong in later feature-specific references.

## Behavioral Test Matrix

- [ ] Integrate into a clean native Swift iOS sample and compile the app plus Notification Service Extension.
- [ ] Integrate into a clean native Android sample and run dependency resolution, assemble, unit tests, lint, and merged-manifest checks.
- [ ] Repeat on one realistic partially integrated iOS project and verify no duplicate initialization or delegates.
- [ ] Repeat on one realistic partially integrated Android project and verify no duplicate Firebase dependencies or services.
- [ ] Run the complete workflow in Claude Code and Codex, including final-report quality, brand selection, and secret redaction.
- [ ] Run install and invocation smoke tests in Cursor and GitHub Copilot only after selecting and documenting supported installation mechanisms.
- [ ] Verify manual fallback instructions when device automation or MCP is unavailable.
- [ ] With explicit authorization, run one single-contact delivery/click test per platform and selected service, and confirm correlation without exposing tokens.

## Automated Quality Gate

- [ ] Add CI validation for skill structure, frontmatter, local references, and `agents/openai.yaml`.
- [ ] Parse every JSON manifest and require matching release versions.
- [ ] Check external documentation links and distinguish transient failures from broken URLs.
- [ ] Scan the repository and generated reports for secrets and private signed URLs.
- [ ] Test a clean Claude Code plugin install.
- [ ] Test a clean Codex marketplace add, plugin install, and skill invocation.

## Release and Distribution

- [ ] Choose the repository license, add `LICENSE`, and replace `UNLICENSED` in the Codex manifest.
- [ ] Configure branch protection and required checks for the release branch.
- [ ] Assign iOS, Android, package-release, and hosting owners.
- [ ] Publish the first reviewed 0.4.0 tag; do not advertise tag pinning until it exists.
- [ ] Choose approved public branded hosting URL or URLs for `latest` and versioned skill artifacts; do not publish an unowned hostname in documentation.
- [ ] Publish `/.well-known/agent-skills/index.json` on each approved skill host and, when feasible, add the corresponding Yespo/eSputnik product-domain index or redirect.
- [ ] Add a stable URL fallback only after the public endpoint resolves and is monitored.
- [ ] Add an “Integrate with an AI coding agent” entry point to both Yespo and eSputnik human documentation after install commands and public URLs are live.
- [ ] Deprecate or archive older standalone skill/plugin copies after consumers have a migration path.

## Sign-off

| Area | Owner | Status | Evidence |
| --- | --- | --- | --- |
| iOS SDK | TBD | Pending | Review and test links |
| Android SDK | TBD | Pending | Review and test links |
| Agent behavior | TBD | Pending | Claude/Codex test runs |
| Package release | TBD | Pending | CI run and release tag |
| Hosting/docs | TBD | Pending | Public endpoints and docs CTA |
