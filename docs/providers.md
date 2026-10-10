# Provider plan

The live route milestone keeps external providers behind typed adapters. The repository
currently runs in deterministic demo mode because no provider credentials are committed.

The intended provider choices are:

- **Geocoding:** a Nominatim-compatible geocoder, using its search endpoint and required
  attribution/rate limits. It returns a stable place identifier, label, coordinates, and
  timezone when available.
- **Routing:** a provider with alternatives and encoded polylines (such as HERE Routing).
  The adapter must preserve provider route IDs, geometry, distance, duration, and timed
  sections. Ordinary-driving results must be labelled as such; truck restrictions are not
  inferred.
- **Weather:** an hourly forecast provider (such as the National Weather Service where
  coverage permits). The adapter must preserve forecast-valid and retrieval timestamps and
  distinguish wind, rain accumulation, and snowfall units.

`GEOCODING_API_KEY`, `ROUTING_API_KEY`, and `WEATHER_API_KEY` are the reserved environment
variables. Live requests fail with a structured provider configuration error until the
adapters and credentials are enabled. Demo mode uses captured, deterministic values and is
the only mode exercised by the current CI suite.

The next implementation step is to add fixture-backed routing and hourly-weather adapters,
then validate live requests manually with credentials supplied outside the repository.
