# Android release checklist

The preview profile produces an installable, signed APK with the bundled React
Native UI. It does not require Metro or Expo Go. Live planning still requires the
hosted API and internet access. No verified APK has been published yet.

## Owner setup and build

From `spotter-mobile`:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile preview
```

`init` links the owner's EAS project and records its real project ID. Review and
commit that configuration; do not insert a guessed ID. Allow EAS to manage the
Android signing key, or use the owner's existing credentials. Never commit keys,
passwords, access tokens or provider API keys. Provider keys stay in Django.
Record the build URL, source commit, application version and signing certificate
fingerprint. Download the APK from the completed build page.

Official instructions: https://docs.expo.dev/build-reference/apk/

## Verify the downloaded binary

Install on a physical Android phone; emulator tests supplement this check.
Record device/Android version, APK SHA-256 and build/source commit.

- Cold-start offline: bundled icon, fonts, welcome poster and GIF load; planning
  explains network requirements. No blank screen when font loading fails.
- Enable reduced motion: static intro and immediate results scrolling.
- Demo analysis: result reveal dismisses the keyboard; no duplicate submission.
- Live origin/destination selection, timezone and departure, truck inputs; confirm
  a complete real provider response and recommendation or honest missing data.
- Route selection and checkpoint ownership, nullable weather and no recommendation.
- Expand map: drag, pinch, checkpoint taps, Fit, Android back and Close map.
- Basemap denial/network loss: fixed safe message; route geometry stays available.
- Large system font and narrow display: labels/buttons remain reachable by scroll.
- Saved-link restore, expired link, cancellation, failed replacement and retry.
- Force-stop/relaunch: no claim of a phone trip history; current results are memory-only.

Save observed results and failures, rather than marking every item passed from CI.
JS exports are not installable APKs and do not establish physical-device behavior.

## Website download

Only after binary verification, publish the reviewed APK to a versioned HTTPS
release asset. Keep the signing key consistent for upgrades. Record SHA-256,
version, minimum supported Android version from the actual build, size, source
commit and known limitations alongside the download.

Add a visible website **Download Android app** link to that exact verified asset,
with installation instructions and the checksum. Do not advertise a placeholder,
Expo Go bundle, unverified build or a fabricated release URL. Test the download
and installation from the public website before claiming distribution complete.
