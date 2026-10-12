# Physical truck profiles

Live analysis accepts an optional `truck_profile` object. Configuring it requires
all six measurements; omitted profiles keep the legacy truck-routing request and
return an explicit notice that physical suitability has not been established.
Demo analysis rejects profiles rather than pretending to apply them.

| API field | Meaning | HERE parameter |
| --- | --- | --- |
| `height_ft` | Overall height, including trailers | `vehicle[height]` in cm |
| `width_ft` | Overall width, including trailers | `vehicle[width]` in cm |
| `length_ft` | Overall length, including trailers | `vehicle[length]` in cm |
| `current_weight_lb` | Actual loaded truck, trailers and cargo | `vehicle[currentWeight]` in kg |
| `gross_weight_lb` | Combination weight when loaded at rated capacity | `vehicle[grossWeight]` in kg |
| `weight_per_axle_lb` | Heaviest loaded axle, not an axle-group total | `vehicle[weightPerAxle]` in kg |

Cargo `load_weight_lb` remains the assessment's weather-risk input. It is never
substituted for a vehicle weight, nor replaced by gross weight when applying wind
risk overrides. Loaded vehicle weight must exceed cargo, not exceed rated gross
weight, and not be below heaviest axle weight.

Measurements must be positive, finite JSON numbers. Booleans, strings, partial
profiles, null profiles and unknown fields are rejected before provider calls.
Product input bounds are 25 ft for height/width, 200 ft for length, 500,000 lb for
vehicle weights and 200,000 lb for axle weight. These bounds are not legal limits.
Conversion uses exact decimal factors: ft × 30.48 and lb × 0.45359237, rounded
up to HERE's integer units to avoid understating a restriction boundary.

## Routing notices and ranking

Critical notices at route or section level make a route routing-ineligible.
Malformed notice structures are rejected. Duplicate geometry alternatives merge
critical flags conservatively, so deduplication cannot discard a restriction.
Only a fixed public notice is exposed; raw provider titles, URLs and exception
text are not copied to responses. No Travel miles remain weather-only: a physical
routing restriction can block a route while its weather exposure is Low.

`routing_eligible` and `routing_notice` accompany route results. Existing ranking
criteria apply only after weather and routing eligibility. Weather-only departure
comparison preserves routing restrictions in every window; shifting weather does
not make a restricted road usable. New full routing is needed to reassess it.

## UI and saved trips

The optional MUI panel starts without guessed vehicle values. Every measurement
must be entered when enabled. Invalid profiles stop before the POST. Successful
submission collapses the panel so it does not push the map away. Measurements
remain available for editing. Saved analysis inputs preserve the profile; restore
repopulates the controls and driver briefings print it. Legacy snapshots without
a profile clear stale profile fields and make no physical suitability claim.

Permits, hazardous goods, axle groups, trailer counts, hours of service and field
verification are not covered. Providing basic measurements does not guarantee
that road data is complete or a trip is legally/operationally suitable.

## Verification

Regression coverage checks validation, upward conversion, HERE request parameters,
cargo-based wind thresholds, critical-notice exclusion without fabricated No
Travel miles, duplicate notices, saved-profile restore and persistent restrictions
in departure comparison. The mocked browser journey checks invalid-submit denial,
exact payload, blocked route messaging, printable measurements, preserved values,
post-submit collapse and mobile overflow. Real HERE routing with these parameters
still needs verification using configured credentials after deployment.

References: [HERE truck routing](https://docs.here.com/routing/docs/routing-v8-truck-routing),
[HERE vehicle properties](https://docs.here.com/routing/docs/routing-v8-vehicle-properties).
