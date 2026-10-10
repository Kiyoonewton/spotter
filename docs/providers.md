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
- **Weather: [Open-Meteo Forecast API](https://open-meteo.com/en/docs).** NWS's hourly
  endpoint does not guarantee the snowfall field required by this assessment, so Open-Meteo
  is the selected provider for this task. Its hourly API supplies `wind_speed_10m` in km/h,
  `rain` and `showers` in millimetres for the preceding hour, and `snowfall` in centimetres
  for the preceding hour. The response includes UTC-valid hourly timestamps and supports seven days
  of forecast coverage, enough for checkpoint ETAs and the planned 0–48-hour view. The
  public forecast endpoint requires no API key but is subject to fair-use/rate limits.
  The adapter treats precipitation at timestamp `T` as the half-open preceding interval
  `[T-1h, T)`. An ETA at 10:30 selects the 11:00 sample; an ETA exactly at 11:00 selects
  the 12:00 sample. It exposes both interval boundaries and divides the preceding one-hour
  accumulation by one hour as an hourly average rate. Wind is instantaneous and uses the
  nearest available sample without interpolation across missing values or extrapolation.
  Rain is `rain + showers` only when both matching-unit values exist; missing showers remain
  missing. Snowfall remains separate. NWS remains documented as a provisional US-only
  alternative and is not used for this adapter.

`OPENCAGE_API_KEY` is required for live geocoding and `HERE_API_KEY` for live routing.
Live geocoding and routing fail with structured provider configuration errors when keys are
absent. Demo mode uses
captured, deterministic values and remains independent of upstream services.

Open-Meteo weather requests are now implemented without credentials; live validation still
requires network access. Forecast values outside the returned horizon are represented as
missing rather than clamped.
