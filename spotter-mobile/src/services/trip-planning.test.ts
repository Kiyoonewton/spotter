import { upcomingDeparture } from '../lib/departure-time';
import { fixture } from './fixture';
import { analyzeTrip, buildRequest, type Draft, searchLocations } from './trip-planning';
import { emptyTruckProfile } from './truck-profile';
export const liveDraft = (): Draft => ({ mode: 'live',
  origin: { provider_id: 'one', label: 'Origin label', latitude: 41, longitude: -87, timezone: 'America/Chicago' },
  destination: { provider_id: 'two', label: 'Destination label', latitude: 40, longitude: -79, timezone: null },
  departure: upcomingDeparture('America/Chicago', Date.now() + 86400000), timezone: 'America/Chicago',
  cargo: '42000', spacing: '50', truck: null,
});
afterEach(() => jest.restoreAllMocks());
test('uses selected coordinates, origin timezone, cargo, spacing and timezone-aware UTC departure', () => {
  const request = buildRequest(liveDraft());
  expect(request).toEqual(expect.objectContaining({ mode: 'live', origin: 'Origin label', destination: 'Destination label',
    origin_coordinates: { lat: 41, lon: -87 }, destination_coordinates: { lat: 40, lon: -79 },
    departure_timezone: 'America/Chicago', load_weight_lb: 42000, checkpoint_spacing_miles: 50, save_snapshot: true }));
  expect(request.departure_at).toMatch(/Z$/);
});
test('rejects missing selections/timezone, non-finite cargo, past departures and DST gaps/overlaps', () => {
  for (const update of [{ origin: null }, { timezone: '' }, { cargo: 'NaN' }, { cargo: '' },
    { departure: '2020-01-01T12:00' }, { departure: '2027-03-14T02:30' }, { departure: '2026-11-01T01:30' }])
    expect(() => buildRequest({ ...liveDraft(), ...update })).toThrow();
});
test('keeps vehicle weights separate and validates the entire optional profile', () => {
  expect(() => buildRequest({ ...liveDraft(), truck: emptyTruckProfile() })).toThrow();
  const truck = { height_ft: '13.5', width_ft: '8.5', length_ft: '70', current_weight_lb: '70000', gross_weight_lb: '80000', weight_per_axle_lb: '17000' };
  const request = buildRequest({ ...liveDraft(), truck });
  expect(request.load_weight_lb).toBe(42000); expect(request.truck_profile?.current_weight_lb).toBe(70000);
});
test('live analysis succeeds without a saved snapshot when saving fails', async () => {
  const result = fixture(); delete (result as { snapshot?: unknown }).snapshot;
  const spy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => result } as Response);
  expect((await analyzeTrip(buildRequest(liveDraft()), new AbortController().signal)).snapshot).toBeUndefined();
  expect(spy).toHaveBeenCalledWith('https://spotter.kiyoo.online/api/trip-analyses/', expect.objectContaining({ method: 'POST' }));
});
test('live failures never call demo or expose provider details', async () => {
  const spy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, json: async () => ({ error: 'API_KEY=secret' }) } as Response);
  await expect(analyzeTrip(buildRequest(liveDraft()), new AbortController().signal)).rejects.toThrow('Trip analysis is unavailable');
  expect(spy).toHaveBeenCalledTimes(1);
});
test('search validates coordinates and bounds candidates', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ results: [{ latitude: Infinity }] }) } as Response);
  await expect(searchLocations('Chicago', 'live', new AbortController().signal)).rejects.toThrow('Invalid location');
});
