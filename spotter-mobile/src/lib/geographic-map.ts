import type { MapCoordinate, Route } from '../services/types';

export type MapRoute = Route;
export const MAP_WIDTH = 800;
export const MAP_HEIGHT = 440;
export const RISK_COLOURS: Record<string, string> = {
  Low: '#23856b',
  Moderate: '#c18a17',
  High: '#dc7629',
  Severe: '#cc394d',
  'No Travel': '#782b61',
  Unknown: '#687787',
};

export function validCoordinate(point: MapCoordinate | undefined): point is MapCoordinate {
  return Boolean(
    point &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lon) &&
    Math.abs(point.lat) <= 85.05112878 &&
    Math.abs(point.lon) <= 180,
  );
}

export function ownedSegments(route: MapRoute) {
  const checkpointIds = new Set(
    route.checkpoints.filter((point) => point.route_id === route.id).map((point) => point.id),
  );
  return (route.segments ?? []).filter(
    (segment) =>
      segment.route_id === route.id &&
      checkpointIds.has(segment.start_checkpoint_id) &&
      checkpointIds.has(segment.end_checkpoint_id) &&
      segment.coordinates.length >= 2 &&
      segment.coordinates.every(validCoordinate),
  );
}

// Normalized Web Mercator coordinates; unwrap longitude around the first point.
export function project(point: MapCoordinate, anchorLongitude: number) {
  let longitude = point.lon;
  while (longitude - anchorLongitude > 180) longitude -= 360;
  while (longitude - anchorLongitude < -180) longitude += 360;
  const latitude = (point.lat * Math.PI) / 180;
  return {
    x: (longitude + 180) / 360,
    y: (1 - Math.log(Math.tan(Math.PI / 4 + latitude / 2)) / Math.PI) / 2,
  };
}

export function fitRoutes(routes: readonly MapRoute[]) {
  const points = routes.flatMap((route) =>
    ownedSegments(route).flatMap((segment) => segment.coordinates),
  );
  const anchor = points[0]?.lon ?? 0;
  const projected = points.map((point) => project(point, anchor));
  if (!projected.length) return null;
  const bounds = projected.reduce(
    (value, point) => ({
      minX: Math.min(value.minX, point.x),
      maxX: Math.max(value.maxX, point.x),
      minY: Math.min(value.minY, point.y),
      maxY: Math.max(value.maxY, point.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
  const { minX, maxX, minY, maxY } = bounds;
  const scale = Math.min(
    (MAP_WIDTH - 100) / Math.max(maxX - minX, 0.00001),
    (MAP_HEIGHT - 100) / Math.max(maxY - minY, 0.00001),
  );
  return {
    anchor,
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    zoom: Math.max(1, Math.min(15, Math.floor(Math.log2(scale / 256)))),
  };
}

export function viewport(
  fit: NonNullable<ReturnType<typeof fitRoutes>>,
  zoomOffset: number,
  pan: { x: number; y: number },
) {
  const zoom = Math.max(1, Math.min(17, fit.zoom + zoomOffset));
  const scale = 256 * 2 ** zoom;
  const left = fit.x * scale - MAP_WIDTH / 2 + pan.x;
  const top = fit.y * scale - MAP_HEIGHT / 2 + pan.y;
  return {
    zoom,
    left,
    top,
    point: (coordinate: MapCoordinate) => {
      const point = project(coordinate, fit.anchor);
      return { x: point.x * scale - left, y: point.y * scale - top };
    },
  };
}

export function visibleTiles(view: ReturnType<typeof viewport>) {
  const tiles: { x: number; y: number; left: number; top: number }[] = [];
  const limit = 2 ** view.zoom;
  for (let x = Math.floor(view.left / 256); x <= Math.floor((view.left + MAP_WIDTH) / 256); x++) {
    for (let y = Math.floor(view.top / 256); y <= Math.floor((view.top + MAP_HEIGHT) / 256); y++) {
      if (y < 0 || y >= limit) continue;
      tiles.push({
        x: ((x % limit) + limit) % limit,
        y,
        left: x * 256 - view.left,
        top: y * 256 - view.top,
      });
    }
  }
  return tiles;
}
