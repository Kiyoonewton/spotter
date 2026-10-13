# Waycast Driver — Spotter React Native companion

An Expo SDK 57 / React Native app with native Material components. This is a
native trip planner and saved-itinerary viewer. It uses the shared Django API.

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
poster when reduced motion is enabled. The button opens the planner.

## Native trip planning

The planner opens in Demo mode for deterministic Chicago → Pittsburgh results.
Switch to Live, search and select both locations, enter the origin-local departure
(`YYYY-MM-DDTHH:mm`), cargo weight and checkpoint spacing, and analyze directly.
No website visit or saved link is needed. Missing origin timezone requires an
explicit IANA timezone; there is no silent Chicago fallback. DST gaps/overlaps
and past live departures are rejected. Optional six-field truck measurements
preserve cargo/loaded/rated/axle weight distinctions.

New successful results replace the applied trip. Failed replacements preserve the
previous results with an error notice. Draft changes do not mutate previous
results. Mode/tool changes clear results. Live failures never substitute demo.
The API saves snapshots when available; a save failure still displays successful
analysis results. Device persistence and offline mode are later milestones. An internet connection and reachable Django API are required.

## Saved links

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

## Geographic map and corridor heatmap

Live geometry uses a native SVG Web Mercator map with OpenStreetMap tiles, route
and checkpoint selection, fit/zoom controls, and arrival-time segment risk colors.
Missing or invalid geometry is never replaced with an invented path. Demo
analyses without geographic geometry keep route/checkpoint details available.

The optional corridor risk heatmap shows translucent bands along known-risk
segments. Smoothing and width are visual only, not an estimate of weather away
from the road. Unknown/unsupported risks have no heat fill. This layer is not
radar and does not change ranking or weather classification.

Provider IDs remain in API data, ownership checks and callbacks; public route
labels are response-order Route 1/2/3, independent of eligibility rank.
