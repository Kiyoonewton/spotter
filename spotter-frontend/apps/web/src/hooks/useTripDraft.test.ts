import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useTripDraft } from './useTripDraft';
import { localTimestamp } from '@/lib/departure-time';
import { liveMapAnalysis } from '../../tests/fixtures/live-map-analysis';
import type { TripAnalysis } from '@/services/api';

afterEach(() => vi.useRealTimers());

test('default departure is upcoming and user edits are preserved', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-12T12:20:00Z'));
  const { result, rerender } = renderHook(() => useTripDraft(null));
  expect(result.current.departure).toBe('2026-10-12T08:00');
  expect(Date.parse(localTimestamp(result.current.departure, 'America/Chicago'))).toBeGreaterThan(
    Date.now(),
  );
  act(() => result.current.setDeparture('2026-11-01T10:00'));
  rerender();
  expect(result.current.departure).toBe('2026-11-01T10:00');
});

test('restoring a snapshot preserves its past departure rather than updating it', () => {
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
      origin: 'New York',
      destination: 'Boston',
      departure_at: '2026-10-10T14:00:00Z',
      departure_timezone: 'America/New_York',
      load_weight_lb: 42000,
      checkpoint_spacing_miles: 25,
    },
  };
  const { result } = renderHook(() => useTripDraft(saved));
  expect(result.current.departure).toBe('2026-10-10T10:00');
});

test('pristine departure follows the selected origin timezone, but edited dates do not change', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-12T12:20:00Z'));
  const { result } = renderHook(() => useTripDraft(null));
  act(() =>
    result.current.setOriginCandidate({
      provider_id: 'ny',
      label: 'New York',
      latitude: 40.7,
      longitude: -74,
      timezone: 'America/New_York',
    }),
  );
  expect(result.current.departure).toBe('2026-10-12T09:00');
  act(() => result.current.setDeparture('2026-10-13T10:00'));
  act(() =>
    result.current.setOriginCandidate({
      provider_id: 'la',
      label: 'Los Angeles',
      latitude: 34,
      longitude: -118,
      timezone: 'America/Los_Angeles',
    }),
  );
  expect(result.current.departure).toBe('2026-10-13T10:00');
});
