# Geographic route map

Live analysis is drawn from API-owned segment and checkpoint coordinates in Web Mercator.
The map preserves intermediate geometry vertices and uses the backend's segment risk;
it does not recompute risk or ranking. Only checkpoints owned by the selected route
appear. Route and checkpoint interactions share the page's existing selection state.

## Current scope

- Fit all returned alternatives, bounded zoom, directional pan, and reset.
- Colour arrival-time segment risk; Unknown risk is dashed.
- Keyboard-accessible route and checkpoint selection.
- OpenStreetMap raster basemap and visible contributor attribution.
- Missing/invalid geometry produces a clear message, never illustrative live routes.
- Tile failures leave provider geometry and inspection available.
- Coordinates outside Web Mercator's supported latitude range are not rendered.
- Longitude is unwrapped around the first route vertex for dateline crossings.

The corridor forecast playback/heatmap is not implemented in live mode. The demo
retains its explicitly illustrative map. Complete HERE-backed runtime verification
still requires configured provider credentials.

## Basemap operations

The web browser requests only visible tiles from
https://tile.openstreetmap.org/{z}/{x}/{y}.png. Browser HTTP caching and ordinary
Referer/User-Agent headers are preserved. There is no prefetch, offline tile
download, cache-bypassing request, or backend proxy.

The public service is best-effort. Review its policy before production scaling,
and choose a suitable hosted or self-hosted tile service if traffic requires it:
https://operations.osmfoundation.org/policies/tiles/

Automated browser tests intercept tile requests with fixtures. They must not
download public tiles or exercise the public service with automated pan/zoom.
