# Provider plan

The live route milestone keeps external providers behind typed adapters. The repository
currently runs in deterministic demo mode because no provider credentials are committed.

The selected providers are:

- **Geocoding: [OpenCage Geocoding API](https://opencagedata.com/api).** It uses an
  `OPENCAGE_API_KEY`, returns formatted labels, coordinates, timezone annotations, and a
  bounded `limit` (the adapter caps responses at five). Authentication failures and HTTP
  429 rate limits are surfaced as structured errors. OpenCage is a geocoder only; it does
  not provide truck routing or road restrictions. The implemented adapter uses a five-second
  timeout and validates every coordinate.
- **Routing: [HERE Routing API v8](https://docs.here.com/routing/reference/routing-v8-api-overview).**
  Its API supports truck transport mode, alternatives, flexible-polyline geometry, route
  summaries, and timed sections. It requires a HERE API key and has account-specific quotas.
  Truck restrictions are only those represented by HERE vehicle attributes; ordinary-driving
  mode must never be described as truck-safe. This adapter is not implemented in this task.
- **Weather: [National Weather Service API](https://www.weather.gov/documentation/services-web-api).**
  The `/points/{lat},{lon}` endpoint identifies a grid and `/gridpoints/.../forecast/hourly`
  provides hourly periods. It requires a descriptive User-Agent rather than an API key,
  is limited by NWS service policy, and covers the United States. Wind speed, rain
  precipitation, and snowfall fields require explicit unit normalization. This adapter is
  not implemented in this task.

`OPENCAGE_API_KEY` is required only for live geocoding. `ROUTING_API_KEY` and
`WEATHER_API_KEY` are not used yet and are not required. Live geocoding fails with a
structured provider configuration error when the OpenCage key is absent. Demo mode uses
captured, deterministic values and remains independent of upstream services.

The next implementation step is to add fixture-backed HERE routing and NWS hourly-weather
adapters, then validate live requests manually with credentials/configuration supplied
outside the repository.
