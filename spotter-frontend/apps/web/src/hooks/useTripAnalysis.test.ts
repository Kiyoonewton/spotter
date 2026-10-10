import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTripAnalysis, localTimestamp } from './useTripAnalysis';
import * as api from '@/services/api';

const trip = {
  mode: 'demo' as const,
  origin: 'Chicago, IL',
  destination: 'Pittsburgh, PA',
  departure: '2026-10-10T10:00',
  timezone: 'America/Chicago',
  weight: '42000',
  spacing: '25',
};
const result = (id: string, recommended: string | null) => ({
  analysis_id: id,
  data_source: 'demo' as const,
  demo_notice: 'demo',
  routes: [
    {
      id: recommended ?? 'route-old',
      name: 'Route',
      distance_miles: 1,
      duration_minutes: 1,
      eligibility: 'eligible',
      risk_miles: {},
      average_risk: 1,
      checkpoints: [
        {
          id: 'cp',
          route_id: recommended ?? 'route-old',
          distance_from_origin_miles: 0,
          arrival_at: '',
          risk: 'Low',
          weather: { wind_mph: 1, rain_in_hr: 0, snow_in_hr: 0 },
          reasons: [],
        },
      ],
    },
  ],
  recommendation: {
    status: recommended ? 'recommended' : 'unavailable',
    recommended_route_id: recommended,
    explanation: '',
  },
});

describe('useTripAnalysis', () => {
  it('submits valid fixtures and selects an owned checkpoint', async () => {
    const create = vi
      .spyOn(api, 'createTripAnalysis')
      .mockResolvedValue(result('one', 'route-one'));
    const { result: hook } = renderHook(() => useTripAnalysis());
    await act(() => hook.current.submit(trip));
    expect(create).toHaveBeenCalledOnce();
    expect(hook.current.analysis?.analysis_id).toBe('one');
    expect(hook.current.applied?.timezone).toBe('America/Chicago');
    expect(hook.current.selectedRouteId).toBe('route-one');
    expect(hook.current.checkpointIndex).toBe(0);
  });

  it('keeps the newer request after reset and out-of-order resolution', async () => {
    let resolveOld!: (value: ReturnType<typeof result>) => void;
    let resolveNew!: (value: ReturnType<typeof result>) => void;
    const create = vi
      .spyOn(api, 'createTripAnalysis')
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveNew = resolve;
        }),
      );
    const { result: hook } = renderHook(() => useTripAnalysis());
    let old!: Promise<void>;
    await act(async () => {
      old = hook.current.submit(trip);
    });
    act(() => hook.current.reset());
    let newer!: Promise<void>;
    await act(async () => {
      newer = hook.current.submit({ ...trip, weight: '30000' });
    });
    expect(create).toHaveBeenCalledTimes(2);
    await act(async () => {
      resolveNew(result('new', 'route-new'));
      await newer;
    });
    await act(async () => {
      resolveOld(result('old', 'route-old'));
      await old;
    });
    expect(hook.current.analysis?.analysis_id).toBe('new');
    expect(hook.current.applied?.weight).toBe(30000);
    expect(hook.current.selectedRouteId).toBe('route-new');
    expect(hook.current.pending).toBe(false);
  });

  it('guards rapid duplicate submissions', async () => {
    const create = vi
      .spyOn(api, 'createTripAnalysis')
      .mockReturnValue(new Promise(() => undefined));
    const { result: hook } = renderHook(() => useTripAnalysis());
    act(() => {
      void hook.current.submit(trip);
      void hook.current.submit(trip);
    });
    expect(create).toHaveBeenCalledOnce();
  });

  it('preserves the previous successful trip when a later request fails', async () => {
    const create = vi
      .spyOn(api, 'createTripAnalysis')
      .mockResolvedValueOnce(result('kept', 'route-kept'))
      .mockRejectedValueOnce(new Error('provider unavailable'));
    const { result: hook } = renderHook(() => useTripAnalysis());
    await act(() => hook.current.submit(trip));
    await act(() => hook.current.submit({ ...trip, origin: 'Other', weight: '30000' }));
    expect(create).toHaveBeenCalledTimes(2);
    expect(hook.current.analysis?.analysis_id).toBe('kept');
    expect(hook.current.applied?.origin).toBe('Chicago, IL');
    expect(hook.current.applied?.weight).toBe(42000);
    expect(hook.current.error).toBe('provider unavailable');
  });

  it('rejects live submissions without location timezones before calling the API', async () => {
    const create = vi.spyOn(api, 'createTripAnalysis');
    const { result: hook } = renderHook(() => useTripAnalysis());
    await act(() =>
      hook.current.submit({
        ...trip,
        mode: 'live',
        origin: 'New York, NY',
        destination: 'Boston, MA',
        timezone: undefined,
        originCandidate: { provider_id: 'o', label: 'New York, NY', latitude: 40, longitude: -74 },
        destinationCandidate: {
          provider_id: 'd',
          label: 'Boston, MA',
          latitude: 42,
          longitude: -71,
        },
      }),
    );
    expect(create).not.toHaveBeenCalled();
    expect(hook.current.error).toMatch(/timezone/i);
  });
});

describe('departure timezone conversion', () => {
  it('converts Chicago summer and winter wall time', () => {
    expect(localTimestamp('2026-07-01T10:00', 'America/Chicago')).toBe('2026-07-01T15:00:00.000Z');
    expect(localTimestamp('2026-01-01T10:00', 'America/Chicago')).toBe('2026-01-01T16:00:00.000Z');
  });
  it('rejects DST gaps and overlaps', () => {
    expect(() => localTimestamp('2026-03-08T02:30', 'America/Chicago')).toThrow(/does not exist/);
    expect(() => localTimestamp('2026-11-01T01:30', 'America/Chicago')).toThrow(/ambiguous/);
  });
});
