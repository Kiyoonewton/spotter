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
  Its API supports `transportMode=truck`, `alternatives` from 0 through 6 (we request 2,
  for at most 3 total routes), Flexible Polyline geometry, route summaries, and section
  timing. It requires `HERE_API_KEY` and has account-specific quotas. The adapter requests
  `routingMode=fast`, `departureTime`, `return=polyline,summary,travelSummary`, and imperial
  units. It does not claim hazardous-material, clearance, or commercial suitability beyond
  HERE's truck profile. Duplicate alternatives are removed when their complete decoded
  coordinate sequences are identical. It uses an eight-second timeout and does not retry
  authentication or invalid requests.
- **Weather: [National Weather Service API](https://www.weather.gov/documentation/services-web-api).**
  The `/points/{lat},{lon}` endpoint identifies a grid and `/gridpoints/.../forecast/hourly`
  provides hourly periods. It requires a descriptive User-Agent rather than an API key,
  is limited by NWS service policy, and covers the United States. Its standard hourly period
  fields provide wind speed, probability of precipitation, and quantitative precipitation;
  snowfall accumulation is not guaranteed as a standard hourly field across grids. Required
  snowfall therefore needs a `forecastGridData` field or a replacement provider before
  weather orchestration. All values require explicit unit normalization.

`OPENCAGE_API_KEY` is required for live geocoding and `HERE_API_KEY` for live routing.
Live geocoding and routing fail with structured provider configuration errors when keys are
absent. Demo mode uses
captured, deterministic values and remains independent of upstream services.

The weather adapter remains blocked on a documented snowfall source decision. Live requests
must be validated manually with credentials supplied outside the repository.
