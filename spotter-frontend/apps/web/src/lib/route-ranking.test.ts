import { describe, expect, it } from 'vitest';
import { rankRoutes } from './route-ranking';
import type { RouteView } from '@/components/RouteCard';

const route = (
  id: string,
  eligibility: string,
  severe: number,
  high: number,
  average: number | null,
): RouteView => ({
  id,
  name: id,
  roads: id,
  miles: 100,
  minutes: 100,
  severe,
  high,
  average,
  eligibility,
});

describe('rankRoutes', () => {
  it('sorts eligible routes deterministically and leaves ineligible routes outside ranking', () => {
    const routes = [
      route('zeta', 'incomplete', 0, 0, null),
      route('beta', 'eligible', 1, 2, 3),
      route('alpha', 'eligible', 1, 2, 3),
      route('blocked', 'blocked', 0, 0, null),
    ];
    const ranked = rankRoutes(routes);
    expect(ranked.map((item) => item.id)).toEqual(['alpha', 'beta', 'zeta', 'blocked']);
    expect(routes[0]?.id).toBe('zeta');
  });
});
