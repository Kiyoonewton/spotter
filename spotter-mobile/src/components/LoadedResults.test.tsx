import { fireEvent, render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { LoadedResults } from './LoadedResults';
import { fixture } from '../services/fixture';
test('reveals laid-out results once, ignoring later form/error/map layout shifts', async () => {
  const onReady = jest.fn();
  const screen = await render(<PaperProvider><LoadedResults trip={fixture()} onReady={onReady} /></PaperProvider>);
  const event = (y: number, height = 100) => ({ nativeEvent: { layout: { y, height } } });
  await fireEvent(screen.getByTestId('loaded-results'), 'layout', event(700, 0));
  expect(onReady).not.toHaveBeenCalled();
  await fireEvent(screen.getByTestId('loaded-results'), 'layout', event(700));
  await fireEvent(screen.getByTestId('loaded-results'), 'layout', event(800));
  expect(onReady).toHaveBeenCalledTimes(1); expect(onReady).toHaveBeenCalledWith(700);
});
