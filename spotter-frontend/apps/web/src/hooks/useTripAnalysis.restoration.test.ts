import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useTripAnalysis } from './useTripAnalysis';
import * as api from '@/services/api';
import * as saved from '@/services/saved-analyses';
import { liveMapAnalysis } from '../../tests/fixtures/live-map-analysis';
import type { TripAnalysis } from '@/services/api';

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});
it('does not let a delayed restore overwrite a newer submitted trip or its saved token', async () => {
  let resolveOld: ((value: TripAnalysis) => void) | undefined;
  vi.spyOn(saved, 'savedToken').mockReturnValue('a'.repeat(64));
  vi.spyOn(saved, 'restoreSnapshot').mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
  );
  const remember = vi.spyOn(saved, 'rememberSnapshot').mockImplementation(() => {});
  const newer = { ...liveMapAnalysis, analysis_id: 'new-analysis' };
  vi.spyOn(api, 'createTripAnalysis').mockResolvedValue(newer);
  const { result } = renderHook(() => useTripAnalysis());
  await act(async () =>
    result.current.submit({
      mode: 'demo',
      origin: 'Chicago, IL',
      destination: 'Pittsburgh, PA',
      departure: '2026-10-10T10:00',
      timezone: 'America/Chicago',
      weight: '30000',
      spacing: '25',
    }),
  );
  await act(async () =>
    resolveOld?.({
      ...liveMapAnalysis,
      analysis_id: 'old-analysis',
      snapshot: {
        token: 'a'.repeat(64),
        restored: true,
        created_at: '',
        expires_at: '',
        policy_version: 'v1',
      },
      applied_request: {
        origin: 'Old',
        destination: 'Old',
        departure_at: '2026-10-10T14:00:00Z',
        departure_timezone: 'America/New_York',
        load_weight_lb: 42000,
        checkpoint_spacing_miles: 25,
      },
    }),
  );
  expect(result.current.analysis?.analysis_id).toBe('new-analysis');
  expect(result.current.applied?.weight).toBe(30000);
  expect(result.current.selectedRouteId).toBe('here-safe');
  expect(remember).not.toHaveBeenCalledWith('a'.repeat(64));
});
