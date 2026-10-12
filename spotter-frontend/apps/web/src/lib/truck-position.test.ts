import { describe, expect, it } from 'vitest';
import { route } from '@/tests/fixtures/geographic-route';
import { estimateTruckPosition } from './truck-position';

describe('estimated truck position', () => {
  it('clamps before departure and after arrival to exact endpoints', () => {
    expect(estimateTruckPosition(route, '2026-10-10T14:00:00Z')).toEqual({
      coordinates: route.checkpoints[0]!.coordinates,
      arrived: false,
    });
    expect(estimateTruckPosition(route, '2026-10-10T15:30:00Z')).toEqual({
      coordinates: route.checkpoints[1]!.coordinates,
      arrived: true,
    });
    expect(estimateTruckPosition(route, '2026-10-12T15:30:00Z')?.arrived).toBe(true);
  });
  it('follows bent segment geometry and equivalent timezone offsets', () => {
    const before = JSON.stringify(route);
    const estimate = estimateTruckPosition(route, '2026-10-10T15:15:00Z');
    expect(estimate?.coordinates.lat).toBeGreaterThan(41);
    expect(estimate?.coordinates.lon).toBeGreaterThan(-74);
    expect(estimate?.coordinates.lon).toBeLessThan(-72);
    expect(estimate?.arrived).toBe(false);
    expect(estimateTruckPosition(route, '2026-10-10T11:15:00-04:00')).toEqual(estimate);
    expect(JSON.stringify(route)).toBe(before);
  });
  it('does not invent a position for missing, foreign, or invalid geometry/timing', () => {
    const time = '2026-10-10T15:15:00Z';
    expect(estimateTruckPosition({ ...route, segments: [] }, time)).toBeNull();
    expect(estimateTruckPosition({ ...route, id: 'foreign-route' }, time)).toBeNull();
    expect(estimateTruckPosition(route, 'invalid')).toBeNull();
    expect(
      estimateTruckPosition(
        {
          ...route,
          checkpoints: route.checkpoints.map((cp) => ({
            ...cp,
            arrival_at: '2026-10-10T15:00:00Z',
          })),
        },
        time,
      ),
    ).toBeNull();
  });
});
