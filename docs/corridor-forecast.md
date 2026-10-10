# Corridor forecast snapshots

POST /api/corridor-forecasts/ accepts an offset-aware start_at, load_weight_lb,
and 1 to 200 points with id, route_id, and coordinates {lat, lon}.
It returns 49 hourly frames, inclusive of departure +0h through +48h.

Coordinates are deduplicated across routes, while point ownership is preserved.
Provider batches contain at most 50 coordinates. Raw hourly responses are cached
for five minutes through Django's cache backend; risk is recomputed for the
requested load. The default cache is process-local, not a claim of Redis deployment.
A shared Django cache backend is suitable for a future multi-worker deployment.

Open-Meteo wind is instantaneous and uses the nearest scheduled sample, earlier
on ties. Missing nearest wind stays missing. Rain is rain + showers only when
both are present. Rain and snowfall are preceding-hour accumulations converted
to average hourly rates in inches/hour. A snapshot at T uses the precipitation
interval [T, T+1h), labelled separately from wind_valid_at. No out-of-horizon
clamping or extrapolation occurs; missing measurements remain null.

The live map shows sampled checkpoint circles, not radar or a continuous weather
field. Variable controls select wind, rain, or snow; dashed outlines indicate
missing values. Circles use the selected variable's risk category for the applied
load. Route lines and checkpoint inspection retain arrival-time risk.
Changing hours, variable, opacity, or playback cannot mutate ranking,
recommendation, or checkpoint arrival weather.

Times use the applied origin IANA timezone. Provider retrieval time and cache
policy are visible. Forecast request failures leave trip results usable and offer
retry. Requests abort and stale responses are ignored after input changes or unmount.
Forecast start/load are the successfully applied trip values, not unsubmitted edits.

Open-Meteo reference: https://open-meteo.com/en/docs
The public endpoint's usage terms should be reviewed for production deployment.
Live end-to-end HERE verification still requires configured routing credentials.
