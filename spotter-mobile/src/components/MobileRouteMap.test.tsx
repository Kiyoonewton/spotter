import { fireEvent, render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { MobileRouteMap } from './MobileRouteMap';
import { fixture } from '../services/fixture';
import { ownedSegments, fitRoutes } from '../lib/geographic-map';
import { routeText } from '../lib/route-labels';
test('maps only owned valid geometry and leaves absent geometry unavailable', () => {
  const route = fixture().routes[0];
  expect(fitRoutes([route])).toBeNull();
  route.checkpoints[0].coordinates = { lat: 41, lon: -87 };
  route.checkpoints.push({ ...route.checkpoints[0], id: 'end', coordinates: { lat: 40, lon: -79 } });
  route.segments = [{ id: 'segment', route_id: route.id, start_checkpoint_id: route.checkpoints[0].id,
    end_checkpoint_id: 'end', coordinates: [{ lat: 41, lon: -87 }, { lat: 40, lon: -79 }], risk: 'Unknown' }];
  expect(fitRoutes([route])).not.toBeNull(); expect(ownedSegments(route)).toHaveLength(1);
  route.segments[0].route_id = 'someone-else'; expect(ownedSegments(route)).toHaveLength(0);
});
test('native map labels use route numbers, preserves unknown risk, and supports heatmap toggle', async () => {
  const route = fixture().routes[0]; const id = route.id;
  route.checkpoints[0].coordinates = { lat: 41, lon: -87 };
  route.checkpoints.push({ ...route.checkpoints[0], id: 'end', coordinates: { lat: 40, lon: -79 } });
  route.segments = [{ id: 'segment', route_id: id, start_checkpoint_id: route.checkpoints[0].id, end_checkpoint_id: 'end',
    coordinates: [{ lat: 41, lon: -87 }, { lat: 40, lon: -79 }], risk: 'Unknown' }];
  const onRoute = jest.fn();
  const screen = await render(<PaperProvider><MobileRouteMap routes={[route]} selected={id} checkpoint={0} onRoute={onRoute} onCheckpoint={jest.fn()} /></PaperProvider>);
  expect(screen.getByLabelText('Inspect Route 1')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Inspect Route 1')); expect(onRoute).toHaveBeenCalledWith(id);
  await fireEvent.press(screen.getByLabelText('Corridor risk heatmap'));
  expect(screen.getByText(/Unknown segments have no heat fill/)).toBeTruthy();
  expect(screen.queryByTestId('corridor-risk-heat')).toBeNull();
  route.segments[0].risk = 'Severe';
  await screen.rerender(<PaperProvider><MobileRouteMap routes={[route]} selected={id} checkpoint={0} onRoute={onRoute} onCheckpoint={jest.fn()} /></PaperProvider>);
  expect(screen.getByTestId('corridor-risk-heat')).toBeTruthy();
});
test('recommendation text replaces UUIDs without changing API ownership', () => {
  const route = { ...fixture().routes[0], id: '742c905d-927c-405b-833d-87150c3268e7' };
  expect(routeText(`${route.id} has the best eligible risk ranking.`, [route])).toBe('Route 1 has the best eligible risk ranking.');
  expect(route.id).toBe('742c905d-927c-405b-833d-87150c3268e7');
});
