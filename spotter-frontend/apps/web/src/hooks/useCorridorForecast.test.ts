import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCorridorForecast } from './useCorridorForecast';
import * as api from '@/services/corridor-forecast';
import { route } from '@/tests/fixtures/geographic-route';
import type { TripAnalysis } from '@/services/api';

const analysis: TripAnalysis = {
  analysis_id: 'test',
  data_source: 'live',
  routes: [route],
  recommendation: { status: 'unavailable', recommended_route_id: null, explanation: 'Missing' },
};
const response = (provider: string): api.CorridorForecast => ({
  data_source: 'live',
  provider,
  start_at: '2026-10-11T00:00:00Z',
  retrieved_at: 'retrieved',
  cache_ttl_seconds: 300,
  points: [],
  frames: [],
  units: { wind: 'mph', rain: 'in/hr', snow: 'in/hr' },
});
afterEach(() => vi.restoreAllMocks());
describe('useCorridorForecast', () => {
  it('aborts and ignores old responses after a new analysis', async () => {
    let oldResolve: ((value: api.CorridorForecast) => void) | undefined;
    const fetch = vi
      .spyOn(api, 'fetchCorridorForecast')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            oldResolve = resolve;
          }),
      )
      .mockResolvedValueOnce(response('new'));
    const { result, rerender } = renderHook(
      ({ trip }) => useCorridorForecast(trip, '2026-10-11T00:00:00Z', 30000),
      { initialProps: { trip: analysis } },
    );
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const signal = fetch.mock.calls[0]?.[3];
    rerender({ trip: { ...analysis, analysis_id: 'new' } });
    await waitFor(() => expect(result.current.data?.provider).toBe('new'));
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      oldResolve?.(response('old'));
    });
    expect(result.current.data?.provider).toBe('new');
    expect(analysis.recommendation.recommended_route_id).toBeNull();
  });

  it('keeps forecast errors separate and can retry', async () => {
    vi.spyOn(api, 'fetchCorridorForecast')
      .mockRejectedValueOnce(new Error('provider secret'))
      .mockResolvedValueOnce(response('new'));
    const { result, unmount } = renderHook(() =>
      useCorridorForecast(analysis, '2026-10-11T00:00:00Z', 30000),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain('Arrival-time analysis remains available');
    expect(result.current.error).not.toContain('secret');
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.data?.provider).toBe('new'));
    unmount();
  });
});
