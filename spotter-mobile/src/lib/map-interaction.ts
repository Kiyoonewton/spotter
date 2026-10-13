import type { Route } from '../services/types';
import { ownedSegments, validCoordinate, MAP_WIDTH, MAP_HEIGHT, type viewport } from './geographic-map';
export type Point = { x: number; y: number };
export function dragPan(start: Point, dx: number, dy: number, width: number): Point {
  const scale = MAP_WIDTH / Math.max(width, 1);
  return { x: start.x - dx * scale, y: start.y - dy * scale };
}
export function pinchZoom(start: number, ratio: number, fitZoom: number) {
  return Math.max(1 - fitZoom, Math.min(17 - fitZoom, start + Math.round(Math.log2(Math.max(ratio, 0.01)))));
}
export function anchoredPan(start: Point, zoomDelta: number, focal: Point): Point {
  const ratio = 2 ** zoomDelta;
  return { x: (start.x + focal.x - MAP_WIDTH / 2) * ratio - focal.x + MAP_WIDTH / 2,
    y: (start.y + focal.y - MAP_HEIGHT / 2) * ratio - focal.y + MAP_HEIGHT / 2 };
}
function distanceToSegment(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}
export function mapHit(routes: readonly Route[], selected: string, view: ReturnType<typeof viewport>, width: number, x: number, y: number) {
  const scale = MAP_WIDTH / Math.max(width, 1), point = { x: x * scale, y: y * scale };
  const route = routes.find(item => item.id === selected);
  let checkpoint: { index: number; distance: number } | null = null;
  route?.checkpoints.forEach((item, index) => {
    if (item.route_id !== selected || !validCoordinate(item.coordinates)) return;
    const position = view.point(item.coordinates), distance = Math.hypot(point.x - position.x, point.y - position.y);
    if (distance <= 22 * scale && (!checkpoint || distance < checkpoint.distance)) checkpoint = { index, distance };
  });
  if (checkpoint) return { checkpoint: (checkpoint as { index: number }).index };
  let closest: { id: string; distance: number } | null = null;
  for (const item of routes) for (const segment of ownedSegments(item)) {
    const points = segment.coordinates.map(view.point);
    for (let index = 1; index < points.length; index++) {
      const distance = distanceToSegment(point, points[index - 1], points[index]);
      if (distance <= 22 * scale && (!closest || distance < closest.distance)) closest = { id: item.id, distance };
    }
  }
  return closest ? { route: closest.id } : null;
}
