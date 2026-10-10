import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLocationSearch } from './useLocationSearch';
import * as api from '@/services/api';

const candidate = { provider_id: 'one', label: 'One', latitude: 1, longitude: 2, timezone: 'UTC' };

describe('useLocationSearch', () => {
  it('debounces input and ignores responses after clearing, disabling, mode changes, or unmount', async () => {
    vi.useFakeTimers();
    const deferred: Array<(value: (typeof candidate)[]) => void> = [];
    vi.spyOn(api, 'searchLocations').mockImplementation(
      () => new Promise((resolve) => deferred.push(resolve)),
    );
    const { result, rerender, unmount } = renderHook(
      ({ mode, value, enabled }: { mode: 'demo' | 'live'; value: string; enabled: boolean }) =>
        useLocationSearch(mode, value, enabled),
      { initialProps: { mode: 'live' as 'demo' | 'live', value: 'Ch', enabled: true } },
    );
    await act(async () => {
      vi.advanceTimersByTime(299);
    });
    expect(api.searchLocations).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(api.searchLocations).toHaveBeenCalledOnce();
    rerender({ mode: 'live', value: 'C', enabled: true });
    expect(result.current.options).toEqual([]);
    deferred[0]?.([candidate]);
    await act(async () => Promise.resolve());
    expect(result.current.options).toEqual([]);
    rerender({ mode: 'live', value: 'Chicago', enabled: true });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(api.searchLocations).toHaveBeenCalledTimes(2);
    rerender({ mode: 'demo', value: 'Chicago', enabled: true });
    deferred[1]?.([candidate]);
    await act(async () => Promise.resolve());
    expect(result.current.options).toEqual([]);
    rerender({ mode: 'demo', value: 'Chicago', enabled: false });
    expect(result.current.options).toEqual([]);
    unmount();
    vi.useRealTimers();
  });

  it('surfaces provider errors without fallback results', async () => {
    vi.useFakeTimers();
    vi.spyOn(api, 'searchLocations').mockRejectedValue(
      new Error('Location search is temporarily unavailable.'),
    );
    const { result } = renderHook(() => useLocationSearch('live', 'Chicago'));
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });
    expect(result.current.options).toEqual([]);
    expect(result.current.error).toContain('temporarily unavailable');
    vi.useRealTimers();
  });
});
