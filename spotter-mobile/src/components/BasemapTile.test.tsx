import { fireEvent, render } from '@testing-library/react-native';
import { BasemapTile } from './BasemapTile';
import { isTileAccessBlocked, tileSource } from '../services/basemap-tiles';
jest.mock('expo-image', () => ({ Image: 'ExpoImage' }));
test('uses app identification and disk caching without cache bypass or provider rotation', async () => {
  const screen = await render(<BasemapTile zoom={1} x={1} y={1} left={0} top={0} size={256} onFailure={jest.fn()} />);
  const image = screen.getByTestId('basemap-tile');
  expect(image.props.source).toEqual(tileSource(1, 1, 1));
  expect(image.props.source.headers['User-Agent']).toContain('WaycastDriver');
  expect(image.props.source.headers['X-Requested-With']).toBe('online.kiyoo.spotter.driver');
  expect(image.props.source.headers['Cache-Control']).toBeUndefined();
  expect(image.props.cachePolicy).toBe('memory-disk');
});
test('reports blocked access using a safe category instead of raw errors', async () => {
  const onFailure = jest.fn();
  const screen = await render(<BasemapTile zoom={1} x={1} y={1} left={0} top={0} size={256} onFailure={onFailure} />);
  await fireEvent(screen.getByTestId('basemap-tile'), 'error', { error: 'HTTP 403 https://provider.example/?secret=fake' });
  expect(onFailure).toHaveBeenCalledWith(true);
  expect(isTileAccessBlocked('network timeout')).toBe(false);
  expect(isTileAccessBlocked('network timeout https://tile.openstreetmap.org/10/403/100.png')).toBe(false);
  expect(isTileAccessBlocked('Failed to load resource, status code: 403')).toBe(true);
});
