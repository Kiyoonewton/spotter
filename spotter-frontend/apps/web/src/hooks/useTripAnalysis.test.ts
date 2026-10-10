import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTripAnalysis } from './useTripAnalysis';
import * as api from '@/services/api';

const result = (id: string, recommended: 'A' | 'B' | null) => ({
  analysis_id: id,
  data_source: 'demo' as const,
  demo_notice: 'demo',
  routes: [
    {
      id: 'A' as const,
      name: 'A',
      distance_miles: 1,
      duration_minutes: 1,
      eligibility: 'eligible',
      risk_miles: {},
      average_risk: 1,
      checkpoints: [
        {
          id: 'A-0',
          route_id: 'A',
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
  it('selects a checkpoint owned by the selected route', async () => {
    vi.spyOn(api, 'createTripAnalysis').mockResolvedValue(result('one', 'A'));
    const { result: hook } = renderHook(() => useTripAnalysis());
    await act(() =>
      hook.current.submit({
        origin: 'Chicago, IL',
        destination: 'Pittsburgh, PA',
        departure: '2026-10-10T10:00',
        weight: '42000',
        spacing: '25',
      }),
    );
    expect(hook.current.selectedRouteId).toBe('A');
    expect(hook.current.checkpointIndex).toBe(0);
  });

  it('keeps the newer analysis when responses resolve out of order', async () => {
    let resolveOld!: (value: ReturnType<typeof result>) => void;
    let resolveNew!: (value: ReturnType<typeof result>) => void;
    vi.spyOn(api, 'createTripAnalysis')
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
    const trip = {
      origin: 'Chicago, IL',
      destination: 'Pittsburgh, PA',
      departure: '2026-10-10T10:00',
      weight: '42000',
      spacing: '25',
    };
    let old!: Promise<void>;
    let newer!: Promise<void>;
    await act(async () => {
      old = hook.current.submit(trip);
      newer = hook.current.submit({ ...trip, weight: '30000' });
    });
    await act(async () => {
      resolveNew(result('new', 'A'));
      await newer;
    });
    await act(async () => {
      resolveOld(result('old', 'B'));
      await old;
    });
    expect(hook.current.analysis?.analysis_id).toBe('new');
    expect(hook.current.selectedRouteId).toBe('A');
  });
});
