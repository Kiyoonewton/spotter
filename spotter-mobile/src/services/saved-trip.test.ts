import { fixture } from './fixture';
import { isSavedTrip, readToken, restoreEndpoint, restoreTrip } from './saved-trip';
const token = 'a'.repeat(64);
afterEach(() => jest.restoreAllMocks());
test('accepts only a trusted fragment or bare token', () => {
  expect(readToken(`https://spotter.kiyoo.online/#analysis=${token}`)).toBe(token);
  expect(readToken(token)).toBe(token);
  for (const input of [`https://evil.example/#analysis=${token}`, `http://spotter.kiyoo.online/#analysis=${token}`,
    `https://spotter.kiyoo.online/?analysis=${token}`, `https://spotter.kiyoo.online/#analysis=${token}&analysis=${token}`])
    expect(() => readToken(input)).toThrow();
});
test('posts a token only to the fixed API endpoint and preserves null recommendation', async () => {
  const spy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => fixture() } as Response);
  const signal = new AbortController().signal;
  expect((await restoreTrip(token, signal)).recommendation.recommended_route_id).toBeNull();
  expect(spy).toHaveBeenCalledWith(restoreEndpoint, expect.objectContaining({
    method: 'POST', body: JSON.stringify({ token }), signal, redirect: 'error',
  }));
  expect(restoreEndpoint).not.toContain(token);
});
test('does not surface raw error details or fall back to demo', async () => {
  const spy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, json: async () => ({ error: 'SECRET' }) } as Response);
  await expect(restoreTrip(token, new AbortController().signal)).rejects.toThrow('unavailable or expired');
  expect(spy).toHaveBeenCalledTimes(1);
});
test('rejects malformed snapshots and checkpoints owned by a different route', () => {
  const trip = fixture(); expect(isSavedTrip(trip)).toBe(true);
  trip.routes[0].checkpoints[0].route_id = 'other'; expect(isSavedTrip(trip)).toBe(false);
  expect(isSavedTrip({ routes: [] })).toBe(false);
});
