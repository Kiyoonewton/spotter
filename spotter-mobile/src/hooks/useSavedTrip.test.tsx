import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSavedTrip } from './useSavedTrip';
import { fixture } from '../services/fixture';
import * as api from '../services/saved-trip';
afterEach(() => jest.restoreAllMocks());
test('clear invalidates an in-flight request even if its promise ignores abort', async () => {
  let resolve!: (trip: ReturnType<typeof fixture>) => void;
  const spy = jest.spyOn(api, 'restoreTrip').mockImplementation(() => new Promise(r => { resolve = r; }));
  const { result } = await renderHook(useSavedTrip);
  let pending!: Promise<void>;
  await act(() => { pending = result.current.open('a'.repeat(64)); });
  await act(() => { void result.current.open('a'.repeat(64)); });
  expect(spy).toHaveBeenCalledTimes(1);
  await act(() => result.current.clear());
  await act(async () => { resolve(fixture()); await pending; });
  expect(result.current.trip).toBeNull(); expect(result.current.pending).toBe(false);
});
test('failed replacement preserves the previous saved analysis', async () => {
  jest.spyOn(api, 'restoreTrip').mockResolvedValueOnce(fixture()).mockRejectedValueOnce(new Error('private'));
  const { result } = await renderHook(useSavedTrip);
  await act(async () => result.current.open('a'.repeat(64)));
  await act(async () => result.current.open('b'.repeat(64)));
  await waitFor(() => expect(result.current.error).not.toBe(''));
  expect(result.current.trip?.analysis_id).toBe('saved-1');
  expect(result.current.error).not.toContain('private');
});
