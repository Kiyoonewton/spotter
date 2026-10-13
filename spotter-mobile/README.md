# Waycast Driver — Spotter React Native companion

An Expo SDK 57 / React Native app with native Material components. This is a
saved-itinerary viewer, not a WebView or Capacitor wrapper.

## Run

Use Node 22.13 or newer:

```sh
cd spotter-mobile
npm ci
npm start
```

Open the matching Expo Go version on an Android/iOS device, or use a development
build if Expo Go for SDK 57 is unavailable for your platform. On a configured
Android emulator, run `npm run android`.

The welcome screen bundles the truck GIF from
`Kiyoonewton/spotter-ui/public/background.gif`, with a manual pause and a static
poster when reduced motion is enabled. The button opens the saved-trip screen.

On the website, save an analysis and copy its share link. Paste the link into the
app. Only HTTPS links from `spotter.kiyoo.online` or a bare 64-character token are
accepted. Tokens are sent in the restore POST body to a fixed endpoint, never to
the pasted hostname. No token or trip is persisted on-device. Clear removes the
current state and invalidates any pending request.

Routes and checkpoints remain owned by the API. A null recommendation stays
null; the first route can still be inspected. Known weather fields remain visible
when another measurement is missing. Saved forecasts are not refreshed. There is
no GPS, turn-by-turn navigation, offline mode, or hours-of-service calculation.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run export:native
```

The export check bundles JavaScript/assets for Android and iOS. It does not prove
that an installable binary works on a device.

## Android download milestone

The preview profile is configured to produce an APK:

```sh
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

EAS account/project association and signing must be set up by the project owner.
Do not commit signing credentials. Install the APK on a real Android device and
verify the welcome GIF, reduced motion, opening a current saved trip, route
switching, checkpoint ownership, and error/clear behavior before publishing a
download link. No verified APK or public download exists yet.
