import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSavedTripRestore } from './useSavedTripRestore';
import * as saved from '@/services/saved-analyses';
import { liveMapAnalysis } from '../../tests/fixtures/live-map-analysis';
import type { TripAnalysis } from '@/services/api';
const snapshot: TripAnalysis = {
  ...liveMapAnalysis,
  snapshot: {
    token: 'a'.repeat(64),
    created_at: '2026-10-12T00:00:00Z',
    expires_at: '2026-10-19T00:00:00Z',
    policy_version: 'weather-risk-v1',
    restored: true,
  },
  applied_request: {
    mode: 'live',
    origin: 'New York, NY',
    destination: 'Boston, MA',
    departure_at: '2026-10-10T14:00:00Z',
    departure_timezone: 'America/New_York',
    load_weight_lb: 42000,
    checkpoint_spacing_miles: 25,
  },
};
afterEach(() => vi.restoreAllMocks());
describe('saved trip restoration', () => {
  it('restores applied timezone and metadata without new analysis', async () => {
    vi.spyOn(saved, 'savedToken').mockReturnValue('a'.repeat(64));
    vi.spyOn(saved, 'restoreSnapshot').mockResolvedValue(snapshot);
    const remember = vi.spyOn(saved, 'rememberSnapshot').mockImplementation(() => {});
    const restore = vi.fn().mockReturnValue(true);
    const error = vi.fn();
    renderHook(() => useSavedTripRestore(restore, error));
    await waitFor(() =>
      expect(restore).toHaveBeenCalledWith(
        snapshot,
        expect.objectContaining({
          departure: '2026-10-10T10:00',
          timezone: 'America/New_York',
          weight: 42000,
        }),
      ),
    );
    expect(remember).toHaveBeenCalledWith('a'.repeat(64));
    expect(error).not.toHaveBeenCalled();
  });
  it('does not replace the saved pointer after a newer user action rejects restoration', async () => {
    vi.spyOn(saved, 'savedToken').mockReturnValue('a'.repeat(64));
    vi.spyOn(saved, 'restoreSnapshot').mockResolvedValue(snapshot);
    const remember = vi.spyOn(saved, 'rememberSnapshot').mockImplementation(() => {});
    const restore = vi.fn().mockReturnValue(false);
    renderHook(() => useSavedTripRestore(restore, vi.fn()));
    await waitFor(() => expect(restore).toHaveBeenCalled());
    expect(remember).not.toHaveBeenCalled();
  });
  it('aborts restoration on unmount and gives a fixed expired-link error', async () => {
    vi.spyOn(saved, 'savedToken').mockReturnValue('invalid');
    const request = vi
      .spyOn(saved, 'restoreSnapshot')
      .mockRejectedValue(new Error('internal secret'));
    const error = vi.fn();
    const { unmount } = renderHook(() => useSavedTripRestore(vi.fn(), error));
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        'This saved analysis is unavailable or expired. Plan a new trip.',
      ),
    );
    unmount();
    expect(request.mock.calls[0]?.[1].aborted).toBe(true);
  });
});
