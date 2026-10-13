import { describe, expect, it } from 'vitest';
import {
  fitRoutes,
  ownedSegments,
  project,
  validCoordinate,
  viewport,
  visibleTiles,
} from './geographic-map';

import { route } from '../tests/fixtures/geographic-route';

describe('geographic route geometry', () => {
  it('preserves bends and fits every vertex inside the viewport', () => {
    const fit = fitRoutes([route]);
    expect(fit).not.toBeNull();
    if (!fit) throw new Error('Expected fit');
    const view = viewport(fit, 0, { x: 0, y: 0 });
    const points = ownedSegments(route)[0]?.coordinates ?? [];
    expect(points).toHaveLength(3);
    points.forEach((point) => {
      const pixel = view.point(point);
      expect(pixel.x).toBeGreaterThan(0);
      expect(pixel.x).toBeLessThan(800);
      expect(pixel.y).toBeGreaterThan(0);
      expect(pixel.y).toBeLessThan(440);
    });
    expect(visibleTiles(view).length).toBeLessThanOrEqual(15);
  });

  it('rejects foreign segment and checkpoint ownership and invalid geometry', () => {
    expect(
      ownedSegments({
        ...route,
        segments: (route.segments ?? []).map((s) => ({ ...s, route_id: 'other' })),
      }),
    ).toEqual([]);
    expect(ownedSegments({ ...route, checkpoints: [] })).toEqual([]);
    expect(validCoordinate({ lat: NaN, lon: -74 })).toBe(false);
    expect(validCoordinate({ lat: 91, lon: -74 })).toBe(false);
    expect(fitRoutes([{ ...route, segments: [] }])).toBeNull();
  });

  it('unwraps a dateline crossing and bounds polar inputs', () => {
    const a = project({ lat: 0, lon: 179 }, 179);
    const b = project({ lat: 0, lon: -179 }, 179);
    expect(b.x - a.x).toBeCloseTo(2 / 360);
    expect(validCoordinate({ lat: 89, lon: 0 })).toBe(false);
  });
});
