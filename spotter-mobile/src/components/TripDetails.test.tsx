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
