import { act, renderHook } from '@testing-library/react';
import { expect, test } from 'vitest';
import { useTruckProfile } from './useTruckProfile';
import { liveMapAnalysis } from '../../tests/fixtures/live-map-analysis';
import type { TripAnalysis } from '@/services/api';
test('restored profiles repopulate exact measurements; legacy snapshots clear stale profile state', () => {
  const saved: TripAnalysis = {
    ...liveMapAnalysis,
    snapshot: {
      token: 'a'.repeat(64),
      created_at: '2026-10-12T00:00:00Z',
      expires_at: '2026-10-19T00:00:00Z',
      policy_version: 'weather-risk-v1',
      restored: true,
    },
    applied_request: {
      origin: 'NY',
      destination: 'Boston',
      departure_at: '2026-10-13T12:00:00Z',
      departure_timezone: 'America/New_York',
      load_weight_lb: 42000,
      checkpoint_spacing_miles: 25,
      truck_profile: {
        height_ft: 13.5,
        width_ft: 8.5,
        length_ft: 70,
        current_weight_lb: 70000,
        gross_weight_lb: 80000,
        weight_per_axle_lb: 17000,
      },
    },
  };
  const { result, rerender } = renderHook(({ analysis }) => useTruckProfile(analysis), {
    initialProps: { analysis: saved },
  });
  expect(result.current.enabled).toBe(true);
  expect(result.current.draft.current_weight_lb).toBe('70000');
  act(() => result.current.formProps.onChange({ ...result.current.draft, height_ft: '14' }));
  const { truck_profile: _profile, ...legacy } = saved.applied_request!;
  rerender({ analysis: { ...saved, applied_request: legacy } });
  expect(result.current.enabled).toBe(false);
  expect(result.current.draft.height_ft).toBe('');
});
