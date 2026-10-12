# Results layout and departure-date repair

The results workspace used the same analysis ID as the React key for saved-trip
tools, departure comparison and the map. These were sibling elements, so their
keys collided. Replacing a successful analysis could leave orphaned tool panels
in the DOM. The new regression reproduces two saved-trip sections after just one
replacement with the old code; the fix keeps exactly one after repeated updates.
Saved tools and comparison now have distinct key prefixes, and the map has a
separate stable wrapper. The map and route inspection render before sharing and
departure comparison. On mobile, the map precedes the route drawer; secondary
tools follow. Tables keep their own horizontal scrolling rather than widening
the page.

A fixed October 10, 2026 default also caused new live trips to request arrival
weather in the past. Drafts now choose an upcoming time in the origin timezone
after hydration, avoiding clock-dependent SSR mismatches. The untouched default
follows origin timezone changes; user edits and restored snapshot dates are
preserved. DST-ambiguous hours are skipped rather than choosing an arbitrary
offset. Live past departures show a warning and an explicit “Use upcoming
departure” action. Updating a draft does not submit or overwrite a saved analysis.

Past missing arrivals receive a specific forecast-gap explanation when the
snapshot timestamp establishes that they predate the current forecast day.
Future missing forecasts retain the existing explanation. Eligibility, Unknown
weather, null recommendations and provider horizon handling are unchanged;
missing data is not converted into safe weather. No historical weather source or
live-to-demo fallback is introduced. Users still need to submit a new analysis to
obtain a current forecast; restored links preserve the original computed snapshot.

Verification includes repeated-result reconciliation, upcoming/timezone/DST date
selection, preserved edits and restored dates, past-versus-future gap messaging,
and a browser journey checking repeated submissions, one map/tool set, desktop
and mobile ordering, overflow, and the explicit past-date update action.
