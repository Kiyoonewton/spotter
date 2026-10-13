import { describe, expect, it } from 'vitest';
import type { RouteView } from '@/components/RouteCard';
import { explainRouteDecision } from './route-decision';
const route = (id: string, overrides: Partial<RouteView> = {}): RouteView => ({
  id,
  name: id,
  roads: '',
  eligibility: 'eligible',
  miles: 100,
  minutes: 100,
  severe: 0,
  high: 0,
  average: 1,
  ...overrides,
});
describe('returned recommendation explanation', () => {
  it.each([
    ['severe', { severe: 1 }],
    ['high', { high: 1 }],
    ['average', { average: 2 }],
    ['minutes', { minutes: 101 }],
  ] as const)('identifies %s as the first deciding criterion', (key, values) => {
    const routes = [route('other', values), route('winner')];
    const before = JSON.stringify(routes);
    expect(explainRouteDecision(routes, 'winner')?.deciding).toBe(key);
    expect(JSON.stringify(routes)).toBe(before);
  });
  it('compares only eligible alternatives and reports time and distance trade-offs', () => {
    const result = explainRouteDecision(
      [
        route('blocked', { eligibility: 'blocked', minutes: 10 }),
        route('fastest', { high: 20, minutes: 80, miles: 120 }),
        route('winner', { minutes: 100, miles: 110 }),
        route('unknown', { eligibility: 'incomplete', minutes: 20, average: null }),
      ],
      'winner',
    );
    expect(result?.fastest?.id).toBe('fastest');
    expect(result?.deciding).toBe('high');
    expect(result?.extraMinutes).toBe(20);
    expect(result?.distanceDifference).toBe(-10);
  });
  it('preserves absent or invalid recommendations instead of inventing a winner', () => {
    expect(explainRouteDecision([route('a')], null)).toBeNull();
    expect(explainRouteDecision([route('a')], 'missing')).toBeNull();
    expect(explainRouteDecision([route('a', { eligibility: 'blocked' })], 'a')).toBeNull();
  });
  it('handles a single eligible route, exact ties, null averages and inconsistent API winners', () => {
    expect(explainRouteDecision([route('a')], 'a')?.runnerUp).toBeUndefined();
    expect(explainRouteDecision([route('b'), route('a')], 'a')?.deciding).toBeNull();
    expect(
      explainRouteDecision(
        [route('a', { average: null }), route('b', { average: null, minutes: 110 })],
        'a',
      )?.deciding,
    ).toBe('minutes');
    const mismatch = explainRouteDecision([route('a'), route('b', { severe: 10 })], 'b');
    expect(mismatch?.consistent).toBe(false);
    expect(mismatch?.winner.id).toBe('b');
    expect(mismatch?.deciding).toBeNull();
  });
});
