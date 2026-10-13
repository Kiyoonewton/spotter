# Corridor risk maps

Web and React Native offer a corridor risk heatmap toggle. It highlights the
API's arrival-time segment risk using translucent bands around owned route
geometry. Band width and smoothing are presentation only: no spatial weather
interpolation, radar, or coverage away from the route is claimed. Unknown and
unsupported risks have no heat fill and remain distinguishable route lines.
Forecast circles on the web continue to show the selected forecast-hour samples,
separately from the static arrival-time risk used for route ranking.

Mobile projects provider geometry using Web Mercator and OpenStreetMap tiles,
with fit/zoom and route/checkpoint selection. Geometry ownership, validity and
antimeridian wrapping follow the web map's rules. Basemap failures preserve the
route lines; absent geometry shows an explicit unavailable message. No live GPS
or turn-by-turn navigation is added.

Public labels use route/checkpoint numbers. IDs remain in API payloads, internal
keys, selection callbacks, test selectors and saved data because they establish
ownership; labels, tooltips and accessibility text must not display provider UUIDs.

Validation includes native map ownership/Unknown-risk tests, readable UUID
recommendation text, web heatmap toggling, and the existing browser map journey
updated to use readable accessibility labels. Physical device and actual tile
rendering verification remain required before Android distribution.
