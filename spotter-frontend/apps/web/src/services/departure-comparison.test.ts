import { afterEach, describe, expect, it, vi } from 'vitest';
import { scenarioAnalysis, fetchDepartureComparison } from './departure-comparison';
import { liveMapAnalysis } from '../../tests/fixtures/live-map-analysis';
import { comparisonFixture } from '../../tests/fixtures/departure-comparison';
afterEach(() => vi.unstubAllGlobals());
describe('departure scenario ownership', () => {
  it('merges shifted risk and arrivals while preserving original geometry and recommendation', () => {
    const before = JSON.stringify(liveMapAnalysis);
    const window = comparisonFixture(liveMapAnalysis).windows[1]!;
    const preview = scenarioAnalysis(liveMapAnalysis, window);
    expect(preview.routes[0]?.checkpoints[0]?.arrival_at).toBe('2026-10-10T16:00:00.000Z');
    expect(preview.routes[0]?.segments?.[0]?.coordinates).toEqual(
      liveMapAnalysis.routes[0]?.segments?.[0]?.coordinates,
    );
    expect(preview.routes[0]?.segments?.[0]?.risk).toBe('Severe');
    expect(JSON.stringify(liveMapAnalysis)).toBe(before);
  });
  it('preserves null recommendations and rejects foreign checkpoint ownership', () => {
    const window = comparisonFixture(liveMapAnalysis, true).windows[0]!;
    expect(
      scenarioAnalysis(liveMapAnalysis, window).recommendation.recommended_route_id,
    ).toBeNull();
    window.routes[0]!.checkpoints[0]!.route_id = 'foreign';
    expect(() => scenarioAnalysis(liveMapAnalysis, window)).toThrow('route-owned checkpoint');
  });
  it('rejects a response for another snapshot and sends the capability in the body', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...comparisonFixture(liveMapAnalysis), source_analysis_id: 'other' }),
    });
    vi.stubGlobal('fetch', fetch);
    await expect(
      fetchDepartureComparison(
        {
          ...liveMapAnalysis,
          snapshot: { token: 'a'.repeat(64), created_at: '', expires_at: '', policy_version: 'v1' },
        },
        new AbortController().signal,
      ),
    ).rejects.toThrow('match this saved analysis');
    expect(JSON.parse(fetch.mock.calls[0]?.[1].body)).toEqual({ token: 'a'.repeat(64) });
  });
});
