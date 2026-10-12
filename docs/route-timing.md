# Checkpoint timing

Live HERE requests now include `spans=duration,length,dynamicSpeedInfo`, in addition
to polyline and section summaries. Speed-change spans give more local timing
information than one average speed for the entire route. HERE's `duration` is used;
`baseDuration` and guessed speed limits are not substituted.

## Validated interpolation

The adapter decodes each section separately. A span starts at its polyline offset
and ends at the next offset, or the last section coordinate. Cumulative decoded
geometry distance aligns these boundaries with the existing checkpoint geometry.
Elapsed seconds are interpolated inside each span. Connected section boundaries
accumulate both distance and time; offsets stay local to their own section.

All sections must have complete usable spans, ordered distinct integer offsets
starting at zero, finite non-negative lengths and durations, and positive geometry.
Span length totals must match the section distance within the greater of 2 meters
or 1%. Duration totals must match within the greater of 2 seconds or 1%.
Small duration rounding differences are reconciled within that section to preserve
its exact reported duration. Destination arrival equals departure plus the sum of
section durations. Lookup uses a binary search in the timing profile.

If any section fails these checks, the **whole route** retains
`distance_proportional_estimate`. Bad optional spans do not discard otherwise valid
routing geometry. Invalid mandatory section summaries still fail routing. Detailed
and fallback timing are never silently mixed. Legacy normalized fixtures without
spans retain the existing fallback.

## Contract and limits

Routes expose `timing_method`, `timing_span_count`, and a fixed safe `timing_notice`.
Checkpoints expose `timing_method`, exact integer `elapsed_seconds`, and offset-aware
UTC `arrival_at`. Weather retrieval uses these arrivals, so a different local speed
can select a different forecast interval and change risk exposure honestly.
The original checkpoint spacing, provider-distance-to-geometry mapping, segment
ownership, route totals and ranking rules remain unchanged.

`here_span_interpolation` is an estimate, not observed progress or per-vertex ground
truth. Sampling positions still use the existing provider-to-decoded-distance
mapping, and speed inside a span is assumed uniform. Driver breaks and hours of
service are not modeled. Provider timing reflects the original routing request;
weather-only departure comparison shifts saved timing and does **not** reroute or
recalculate traffic at the later departure. The truck preview still interpolates
between checkpoint arrivals, not every provider span, and is not live GPS.

The map and printable driver briefing show the selected route's timing provenance.
Old snapshots without timing metadata state that timing detail is unavailable;
they are not retroactively labeled as span-derived. New snapshots preserve the
method with their computed arrivals.

## Verification

Fixture tests cover unequal speeds, interpolation, connected multi-section routes,
exact destination time, midnight/timezone rollover, incomplete or malformed spans,
non-finite summaries, bounded rounding reconciliation and provider request fields.
An orchestration regression proves weather uses span-derived ETA rather than the
old route-average ETA. No live HERE credential is available in this environment;
fixture verification does not establish a complete real-provider journey.

References: [HERE spans](https://docs.here.com/routing/docs/routing-v8-span),
[HERE durations](https://docs.here.com/routing/docs/routing-v8-duration).
