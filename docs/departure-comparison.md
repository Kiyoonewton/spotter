# Route × Departure comparison

POST `/api/departure-comparisons/` accepts only a saved snapshot token in the body.
It resolves an unexpired server-produced record and rejects unsupported risk-policy
versions. No client-supplied geometry, risk scores or recommendation are accepted.
Failures use fixed public messages and safe diagnostic categories. Results are
not cached by browsers (`Cache-Control: no-store`).

## Scope: weather-only scenarios

The four departures are the saved departure, +2h, +4h and +6h. Every returned
route is evaluated in each window. Saved road geometry and recorded checkpoint
driving times remain fixed: checkpoint arrivals shift by the departure offset.
Routing, traffic, closures, physical truck restrictions and HOS are not recalculated.
The UI labels these assumptions and asks for a new full trip analysis before adopting
a different departure. Comparison does not alter or overwrite the saved analysis.

Live comparisons acquire/reuse one raw hourly forecast series per deduplicated
coordinate through the same five-minute Redis-backed boundary as the corridor
forecast. Provider batches are capped at 50 coordinates and total checkpoint work
at 200. All four windows, including the baseline, use that same forecast vintage.
This means an old saved recommendation can differ from a fresh comparison’s baseline;
no old forecast is mixed with the new scenario data. Out-of-horizon weather remains
missing, not clamped. Demo comparisons reuse fixed illustrative weather and do not
call live providers, so waiting provides no artificial demo improvement.

Wind, preceding-hour rain plus showers, separate snowfall, missing values and
cargo overrides use the existing normalization and classification rules. Segment
exposure follows the original route-owned segment distances and start-checkpoint
risk. Risk coverage is distance with a known classification, not a claim that every
weather variable is present (a known No Travel trigger can survive missing variables).

## Ranking and trade-offs

Within a departure window, eligible routes rank by Severe miles, High miles,
distance-weighted average risk, driving time, then stable route ID. Blocked and
incomplete routes never win. Across windows, compare Severe miles, High miles,
average risk, absolute estimated arrival, waiting offset, then route ID. Waiting
cannot win a risk/arrival tie. No eligible candidate yields `best_choice: null`.

Risk-mile and average-risk reductions and signed arrival-delay minutes are measured
against the eligible winner of this comparison’s offset-zero window. Positive arrival
delay means arriving later; negative means earlier. If there is no eligible baseline,
these deltas remain null rather than inventing a reference route or improvement.
Response includes forecast retrieval and comparison timestamps.

## UI and verification

The MUI matrix has stable route labels and a horizontally scrollable four-window
view on phones. The backend’s best option is displayed without frontend reranking.
Each cell opens a separate owned-route map and itinerary; route/checkpoint inspection
and scenario printing do not change the original form, recommendation or snapshot.
Geometry is joined by route/checkpoint/segment IDs from the immutable source,
avoiding duplication in the comparison response. Comparison is not saved/shared
in this milestone; only the original analysis’s existing share capability is used.

Domain/API tests cover every route/window, load escalation, eligibility, forecast
horizon, risk/arrival/waiting ties, measured baseline benefits, budgets, ownership,
source immutability, expiry/policy guards and safe provider failures. Frontend tests
cover projection, absent best options, response ownership, duplicate requests,
stale aborts and prior-result preservation. A mocked real-page browser journey
covers the matrix, phone overflow, shifted inspection and all-blocked refresh.
Fixture verification does not establish weather accuracy or refreshed traffic ETAs.
