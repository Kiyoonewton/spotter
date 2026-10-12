import { describe, expect, it } from 'vitest';
import { journeyHorizon, forecastTicks } from './journey-horizon';

describe('journey forecast window', () => {
  it('uses the longest alternative, rounds up, and never assumes route C', () => {
    const routes = [
      { duration_minutes: 480 },
      { duration_minutes: 522 },
      { duration_minutes: 462 },
    ];
    expect(journeyHorizon(routes)).toBe(9);
    expect(journeyHorizon([...routes].reverse())).toBe(9);
    expect(journeyHorizon([{ duration_minutes: 3001 }])).toBe(51);
    expect(journeyHorizon([{ duration_minutes: 60 }])).toBe(1);
  });
  it('keeps tick endpoints and avoids duplicates on short journeys', () => {
    expect(forecastTicks(1)).toEqual([0, 1]);
    expect(forecastTicks(9)).toEqual([0, 2, 5, 7, 9]);
    expect(journeyHorizon([])).toBe(1);
  });
});
