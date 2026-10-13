# Assessment and job requirement audit

Scope: repository implementation after PR #38, plus this mobile polish change.
The job description is available; the original assessment document must be checked
before claiming full assessment compliance. This is an evidence inventory, not a
claim that every feature is deployed or device verified.

| Requirement | Implemented evidence | Verification still needed |
| --- | --- | --- |
| End-to-end React + Django features | Trip form, typed clients, Django analysis and saved-analysis APIs | Record a current deployed complete live trip |
| React and Material UI | Web MUI components, icons, responsive workspace | Final narrow-screen and keyboard review |
| REST API/data models | Validated requests, structured safe errors, persisted token-hashed snapshots | Final API walkthrough and retention job configuration |
| Algorithms/business logic | Deterministic risk thresholds, cargo overrides, eligible ranking, checkpoint sampling and departure comparison | Compare exact original assessment rules with implementation |
| Performance/query behavior | Bounded checkpoints, weather batching, validated Redis cache, snapshot lookup | Record realistic provider latency and query evidence |
| Docker/Redis | Compose stack, readiness, deployment and backup checks | Current restore drill and deployed readiness evidence |
| React Native bonus | Native Expo app, direct planning, geographic map, corridor risk bands, saved links | Signed APK and physical Android QA |
| Attention to detail | Shared teal/warm theme, readable route ordinals, typography, reduced motion, explicit unknown states | Device screenshots and large-font/narrow-screen QA |
| Independent delivery | Focused PRs, CI, CodeQL, contribution rules, file-length policy | Final reviewer-friendly release/demo record |
| AI assistant familiarity | Iterative implementation and regression tests | Brief honest account of assistant use and human verification |
| GCP/Kubernetes | Not included; existing server/Docker deployment | Not required; avoid unnecessary infrastructure expansion |

## Reviewer walkthrough

1. Open the public workspace and run deterministic Demo mode.
2. Change cargo load and inspect returned exposure and recommendation changes.
3. Select a different route; verify its own checkpoint arrival weather and reasons.
4. Run Live mode with selected locations and an upcoming origin-local departure.
5. Explain incomplete coverage without fabricating measurements or a winner.
6. Inspect geographic route geometry, corridor risk bands and the manual weather
   timeline. Distinguish arrival-time ranking from forecast preview time.
7. Review decision trade-offs, optional truck restrictions and departure windows.
8. Save/share/restore the analysis and print its original-input driver briefing.
9. Show the native app performing planning and route/checkpoint selection directly.
10. Show passing CI, provider normalization tests, safe error responses and the
    documented limitations; demonstrate a verified APK only when one exists.

## Remaining release evidence

- Signed Android APK, actual installation and public download verification.
- Current complete HERE/Open-Meteo live trip through the deployed frontend/API.
- Original assessment cross-check; no invented AI/scoring claims.
- Mobile map gestures, OSM access, keyboard/result reveal, large fonts and focus on
  a physical device. Component tests cannot establish those observations.
- Server snapshot cleanup scheduling and operational backup/restore evidence.
- On-device saved-trip list remains a separate unimplemented milestone.

## Product boundaries

Risk scoring is deterministic business logic, not a trained AI model. Route bands
are arrival-time segment risk, not radar or a continuous meteorological field.
The driver marker is estimated, not GPS. Timing excludes breaks and hours of
service. Missing weather remains Unknown; ineligible routes are not recommended.
Departure comparison does not perform time-dependent traffic rerouting. The
mobile UI is standalone, while live API/provider calls require internet access.

## Verification record — 13 October 2026

This change passed local native TypeScript, lint, all 35 tests, Android/iOS JS
exports, authored-file policy and diff whitespace checks. Font assets were included
in both exports. The launcher icon was visually inspected; no native screen or
physical-device QA was performed.

Execution-environment probes for deployed health, readiness, live location search
and live trip analysis each received HTTP 403. Since even health was refused, this
record does not establish a provider failure or an application regression. A
browser/device or server-side complete live trip remains unverified in this pass.
EAS project association is absent, and no authenticated EAS build or Android device
is available here. APK creation, installation and download publication remain open.
