import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useDepartureComparison } from './useDepartureComparison';
import * as api from '@/services/departure-comparison';
import { liveMapAnalysis } from '../../tests/fixtures/live-map-analysis';
import { comparisonFixture } from '../../tests/fixtures/departure-comparison';
afterEach(() => vi.restoreAllMocks());
it('guards duplicate requests, retains prior comparison after failure and aborts on unmount', async () => {
  let resolve: ((result: api.DepartureComparison) => void) | undefined;
  const fetch = vi
    .spyOn(api, 'fetchDepartureComparison')
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    )
    .mockRejectedValueOnce(new Error('secret provider url'));
  const { result, unmount } = renderHook(() => useDepartureComparison(liveMapAnalysis));
  act(() => {
    void result.current.compare();
    void result.current.compare();
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  await act(async () => resolve?.(comparisonFixture(liveMapAnalysis)));
  const before = result.current.data;
  await act(async () => result.current.compare());
  expect(result.current.data).toBe(before);
  expect(result.current.error).not.toContain('secret');
  expect(result.current.pending).toBe(false);
  unmount();
});
it('aborts and ignores a stale response after analysis changes', async () => {
  let resolve: ((result: api.DepartureComparison) => void) | undefined;
  const fetch = vi.spyOn(api, 'fetchDepartureComparison').mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { result, rerender } = renderHook(({ trip }) => useDepartureComparison(trip), {
    initialProps: { trip: liveMapAnalysis },
  });
  act(() => {
    void result.current.compare();
  });
  const signal = fetch.mock.calls[0]![1];
  rerender({ trip: { ...liveMapAnalysis, analysis_id: 'new' } });
  expect(signal.aborted).toBe(true);
  await act(async () => resolve?.(comparisonFixture(liveMapAnalysis)));
  await waitFor(() => expect(result.current.data).toBeNull());
});
