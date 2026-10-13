# Submission links and demonstration

- Live web application: https://spotter.kiyoo.online/
- Source repository: https://github.com/Kiyoonewton/spotter
- Integration branch: `develop`
- Architecture and behavior: `spotter-frontend/apps/web/ASSESSMENT.md`
- Requirement evidence and limits: `docs/assessment-audit.md`
- Native app: `spotter-mobile`, with setup in its README
- Android release steps: `docs/android-release.md`

## Suggested submission text

I built Waycast, a weather-aware truck dispatch workspace using React, TypeScript,
Material UI and Django REST APIs. Live analyses combine HERE truck alternatives
with route-owned checkpoints and arrival-time Open-Meteo weather. Deterministic
risk rules, cargo overrides and eligibility-aware ranking produce an explainable
recommendation while preserving unknown weather and blocked routes honestly.

The product includes geographic route inspection, corridor risk visualization,
weather-only departure comparisons, optional truck measurements, saved/shareable
analyses and printable driver briefings. Docker Compose runs the Node frontend,
Django, PostgreSQL, Redis and Nginx. CI covers application tests, browser journeys,
container validation, CodeQL and the authored-file length policy.

A separate Expo/React Native driver app supports direct trip planning, route and
checkpoint inspection, an interactive map and saved-link restoration. Its source
and JavaScript bundles are verified; a signed APK and physical-device verification
are still pending and are not advertised as completed.

Live site: https://spotter.kiyoo.online/
Repository: https://github.com/Kiyoonewton/spotter

## Five-minute review

1. Run Demo; change cargo and inspect route risk/reasons.
2. Run Live Chicago → Pittsburgh with an upcoming origin-local departure.
3. Switch routes/checkpoints; explain recommendation versus selection.
4. Show risk bands and the independent longest-journey weather timeline.
5. Open the decision explanation and departure-window comparison.
6. Show saved analysis/driver briefing, then native planning and source structure.
7. Point to CI and clearly state native-binary and timing/weather limitations.

Use the final merged commit in your submission. Do not describe PR #39's font/icon
changes as deployed before they are merged and the deployment succeeds. Add an APK
link only after signing, installing and verifying the actual binary. Review this
text against the original assessment before sending it. No submission has been sent.
