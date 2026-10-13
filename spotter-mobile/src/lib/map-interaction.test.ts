import { anchoredPan, dragPan, mapHit, pinchZoom } from './map-interaction';
import { fitRoutes, viewport } from './geographic-map';
import { fixture } from '../services/fixture';
test('drag and pinch use native screen scale, integer tile zooms, bounded zoom and anchored focal point', () => {
  expect(dragPan({ x: 0, y: 0 }, 40, 20, 400)).toEqual({ x: -80, y: -40 });
  expect(pinchZoom(0, 2, 8)).toBe(1);
  expect(Number.isInteger(pinchZoom(0, 1.8, 8))).toBe(true);
  expect(pinchZoom(0, 1000000, 8)).toBe(9);
  expect(pinchZoom(0, 0.0001, 8)).toBe(-7);
  expect(anchoredPan({ x: 0, y: 0 }, 1, { x: 500, y: 220 })).toEqual({ x: 100, y: 0 });
});
test('tap targets pick owned checkpoints/routes and ignore geometry from another route', () => {
  const route = fixture().routes[0];
  route.checkpoints[0].coordinates = { lat: 41, lon: -87 };
  route.checkpoints.push({ ...route.checkpoints[0], id: 'end', coordinates: { lat: 40, lon: -79 } });
  route.segments = [{ id: 'seg', route_id: route.id, start_checkpoint_id: route.checkpoints[0].id, end_checkpoint_id: 'end', risk: 'Low', coordinates: [{ lat: 41, lon: -87 }, { lat: 40, lon: -79 }] }];
  const fit = fitRoutes([route]); if (!fit) throw new Error('Expected valid geometry');
  const view = viewport(fit, 0, { x: 0, y: 0 });
  const point = view.point(route.checkpoints[0].coordinates);
  expect(mapHit([route], route.id, view, 400, point.x / 2 + 10, point.y / 2)).toEqual({ checkpoint: 0 });
  const end = view.point(route.checkpoints[1].coordinates!);
  expect(mapHit([route], 'none', view, 400, (point.x + end.x) / 4, (point.y + end.y) / 4)).toEqual({ route: route.id });
  route.segments[0].route_id = 'foreign';
  expect(mapHit([route], 'none', view, 400, (point.x + end.x) / 4, (point.y + end.y) / 4)).toBeNull();
});
