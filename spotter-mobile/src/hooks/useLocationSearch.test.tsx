import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useLocationSearch } from './useLocationSearch';
import * as api from '../services/trip-planning';
const candidate = (label: string): api.Location => ({ provider_id: label, label, latitude: 41, longitude: -87, timezone: null });
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });
test('old search cannot overwrite a newer query, clearing aborts and invalidates search', async () => {
  jest.useFakeTimers();
  const resolvers: ((value: api.Location[]) => void)[] = [];
  const signals: AbortSignal[] = [];
  jest.spyOn(api, 'searchLocations').mockImplementation((q, m, signal) => {
    signals.push(signal); return new Promise(resolve => resolvers.push(resolve));
  });
  const hook = await renderHook(({ query }: { query: string }) => useLocationSearch(query, 'live', true), { initialProps: { query: 'old' } });
  await act(async () => { jest.advanceTimersByTime(350); });
  await hook.rerender({ query: 'new' });
  expect(signals[0].aborted).toBe(true);
  await act(async () => { jest.advanceTimersByTime(350); resolvers[1]([candidate('new')]); });
  await act(async () => { resolvers[0]([candidate('old')]); });
  expect(hook.result.current.results[0].label).toBe('new');
  await hook.rerender({ query: '' });
  expect(signals[1].aborted).toBe(true); expect(hook.result.current.results).toEqual([]);
});
test('disabling or mode changes invalidates the previous search', async () => {
  jest.useFakeTimers();
  const spy = jest.spyOn(api, 'searchLocations').mockResolvedValue([candidate('Chicago')]);
  const hook = await renderHook(({ enabled, mode }: { enabled: boolean; mode: api.Mode }) => useLocationSearch('Chi', mode, enabled), {
    initialProps: { enabled: true, mode: 'live' },
  });
  await hook.rerender({ enabled: false, mode: 'demo' });
  await act(async () => { jest.advanceTimersByTime(350); });
  expect(spy).not.toHaveBeenCalled();
  await waitFor(() => expect(hook.result.current.pending).toBe(false));
});
