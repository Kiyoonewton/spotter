import { describe, expect, it } from 'vitest';
import { rankRoutes, tripTime } from './dispatch-data';

describe('illustrative route comparison', () => {
  it('ranks Severe exposure before High exposure and time', () => {
    expect(rankRoutes(42000).map((route) => route.id)).toEqual(['B', 'C', 'A']);
  });

  it('keeps route letters stable when load changes ranking', () => {
    const ranked = rankRoutes(15000);
    expect(ranked.map((route) => route.id)).toEqual(['C', 'B', 'A']);
    expect(ranked.find((route) => route.id === 'A')?.minutes).toBe(462);
  });

  it('calculates arrival from departure with an explicit timezone', () => {
    expect(tripTime('2026-10-10T10:00', 240)).toContain('2:00 PM CDT');
    expect(tripTime('2026-10-10T10:00', 194)).toContain('1:14 PM CDT');
  });
});
