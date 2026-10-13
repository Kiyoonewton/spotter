# Saved arrival-weather analyses and driver briefings

`POST /api/trip-analyses/` accepts optional boolean `save_snapshot` (default false).
The browser requests it for successful analyses. Django saves only its own computed
response plus validated applied inputs; no endpoint accepts client-supplied risk,
geometry or recommendations for persistence. Existing non-saving API clients keep
current behavior. A save failure leaves the analysis usable with a fixed notice.
Snapshots exceeding 2 MB are not saved, avoiding unexpectedly large stored records.

A saved response includes `snapshot.token`, creation/expiry timestamps and
`policy_version`. Tokens have 256 bits of randomness; only their SHA-256 hash is
stored. Snapshots expire after seven days. There is no public enumeration, mutation
or deletion API, and no account history in this milestone.

`POST /api/saved-analyses/restore/` accepts `{ "token": "..." }`. Invalid, absent,
unknown and expired tokens all return the same 404. Database failures return a
fixed 503 message and request ID, logging only operation/category. Successful
restoration returns the original analysis and applied inputs with `Cache-Control:
no-store`. It makes no routing, geocoding or weather request.

Share links carry the token in the URL fragment (`#analysis=...`), not a query or
path. The browser posts it in the restore body, preventing ordinary proxy request
URL logs from recording it. Anyone with the link can read the trip: the UI says
this explicitly before sharing. Tokens are bearer capabilities, not account auth.
The active snapshot token is stored in sessionStorage; blocked browser storage
does not prevent manually opening a share link. This is tab-session restoration,
not a cross-device history list. A shared fragment takes precedence over session
storage. Mode changes clear the saved pointer, and newer submissions prevent an
older restore from replacing current results.

Reopening restores the original mode, locations, timezone, departure, cargo and
spacing. The map retains saved route geometry and checkpoint arrival weather.
The hourly exploration timeline is not saved and is deliberately omitted on
reopened snapshots; no fresh forecast is silently mixed into the saved decision.
Re-analyze explicitly to acquire a new result and snapshot.

## Print / Save PDF

The MUI driver-briefing dialog prints the inspected route, not an invented
recommended route. It labels eligibility and whether that route was recommended,
then lists route-owned checkpoint arrivals, weather, reasons, sample/accumulation
intervals and available provider retrieval provenance. Missing measurements remain
Unavailable. Demo data, timezone, recorded timing provenance and absence of
modeled driver breaks are explicit. Browser Print / Save PDF uses a print layout
that hides the workspace, repeats table headers and permits multiple pages.

## Migration and cleanup

Run `python manage.py migrate` before serving the new endpoints. Compose startup
already runs migrations. Expired records are inaccessible immediately, but physical
removal requires `python manage.py purge_saved_analyses`. Schedule this command
once daily on the deployment server (for example through the existing scheduler,
executing it inside the backend container). This PR does not configure server cron.
Database backups can retain historical records under their own retention policy.

Tests cover real save/restore and token expiry without provider calls, fail-open
saving, safe failures, timezone restoration, stale restore rejection, and a mocked
browser journey through refresh, a fresh share-link tab and print-media rendering.
