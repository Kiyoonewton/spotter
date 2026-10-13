import { fireEvent, render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { fixture } from '../services/fixture';
import { TripDetails } from './TripDetails';
test('keeps null recommendation and partial weather, then switches route ownership', async () => {
  const screen = await render(<PaperProvider><TripDetails trip={fixture()} /></PaperProvider>);
  expect(screen.getByText('No recommended route')).toBeTruthy();
  expect(screen.queryByText('Recommended')).toBeNull();
  expect(screen.getByText('Wind: 12.00 mph')).toBeTruthy();
  expect(screen.getByText('Rain: Unavailable')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Inspect Route 2'));
  expect(screen.getByText('Route 2 · Checkpoint 1')).toBeTruthy();
});

test('renders readable recommendation and explanation while retaining UUID ownership', async () => {
  const trip = fixture();
  const id = '742c905d-927c-405b-833d-87150c3268e7';
  trip.routes[0].id = id;
  trip.routes[0].checkpoints[0].route_id = id;
  trip.recommendation.recommended_route_id = id;
  trip.recommendation.explanation = `${id} has the best eligible risk ranking.`;
  const screen = await render(<PaperProvider><TripDetails trip={trip} /></PaperProvider>);
  expect(screen.getByText('Recommended Route 1')).toBeTruthy();
  expect(screen.getByText('Route 1 has the best eligible risk ranking.')).toBeTruthy();
  expect(screen.queryByText(/742c905d/)).toBeNull();
  expect(screen.queryByText('Backend recommendation')).toBeNull();
  expect(trip.routes[0].id).toBe(id);
});
