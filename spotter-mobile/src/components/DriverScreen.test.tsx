import mockSafeArea from 'react-native-safe-area-context/jest/mock';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import DriverScreen from '../app/trip';
import { fixture } from '../services/fixture';
jest.mock('react-native-safe-area-context', () => mockSafeArea);
afterEach(() => jest.restoreAllMocks());
test('native live journey posts selected locations and renders API recommendation and route ownership', async () => {
  let payload: Record<string, unknown> | undefined;
  const spy = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.includes('/locations/')) {
      const origin = new URL(url).searchParams.get('q') === 'Chicago';
      return { ok: true, json: async () => ({ results: [{ provider_id: origin ? 'chicago' : 'pittsburgh',
        label: origin ? 'Chicago selected' : 'Pittsburgh selected', latitude: origin ? 41.8 : 40.4,
        longitude: origin ? -87.6 : -79.9, timezone: origin ? 'America/Chicago' : 'America/New_York' }] }) } as Response;
    }
    payload = JSON.parse(String(init?.body));
    const trip = fixture(); trip.recommendation.recommended_route_id = 'beta';
    trip.recommendation.explanation = 'Route beta has the least exposure.';
    trip.routes[0].eligibility = 'blocked'; trip.routes[1].eligibility = 'eligible';
    trip.applied_request.origin = 'Chicago selected'; trip.applied_request.destination = 'Pittsburgh selected';
    return { ok: true, json: async () => trip } as Response;
  });
  const screen = await render(<PaperProvider><DriverScreen /></PaperProvider>);
  await fireEvent.press(screen.getByText('Live'));
  await fireEvent.changeText(screen.getByLabelText('Origin'), 'Chicago');
  await waitFor(() => expect(screen.getByLabelText('Select Origin: Chicago selected')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Select Origin: Chicago selected'));
  await fireEvent.changeText(screen.getByLabelText('Destination'), 'Pittsburgh');
  await waitFor(() => expect(screen.getByLabelText('Select Destination: Pittsburgh selected')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Select Destination: Pittsburgh selected'));
  await fireEvent.press(screen.getByText('Analyze trip'));
  await waitFor(() => expect(screen.getByText('Recommended')).toBeTruthy());
  expect(payload).toEqual(expect.objectContaining({ mode: 'live', origin: 'Chicago selected', destination: 'Pittsburgh selected',
    origin_coordinates: { lat: 41.8, lon: -87.6 }, destination_coordinates: { lat: 40.4, lon: -79.9 },
    departure_timezone: 'America/Chicago', load_weight_lb: 42000, checkpoint_spacing_miles: 25 }));
  expect(String(payload?.departure_at)).toMatch(/Z$/);
  expect(screen.getByText('Route 2 · Checkpoint 1')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Inspect Route 1'));
  expect(screen.getByText('Route 1 · Checkpoint 1')).toBeTruthy();
  expect(screen.getByText('blocked')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Origin'), 'edited');
  await fireEvent.press(screen.getByText('Analyze trip'));
  expect(spy.mock.calls.filter(([url]) => String(url).endsWith('/trip-analyses/'))).toHaveLength(1);
});
