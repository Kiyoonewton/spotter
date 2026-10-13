import { PanResponder, type PanResponderCallbacks, type GestureResponderEvent, type PanResponderGestureState } from 'react-native';
import { MapGestureController } from './MapGestureController';
afterEach(() => jest.restoreAllMocks());
const event = (xs: number[]): GestureResponderEvent => ({ nativeEvent: {
  locationX: xs[0], locationY: 100, touches: xs.map(x => ({ pageX: x, pageY: 100, locationX: x, locationY: 100 })),
} }) as GestureResponderEvent;
const gesture = (dx = 0, dy = 0) => ({ dx, dy }) as PanResponderGestureState;
test('gesture controller pans, pinches at integer zoom and distinguishes a tap from a drag', () => {
  let callbacks!: PanResponderCallbacks;
  jest.spyOn(PanResponder, 'create').mockImplementation(config => { callbacks = config; return { panHandlers: {} }; });
  const controller = new MapGestureController();
  const onPan = jest.fn(), onZoom = jest.fn(), onTap = jest.fn();
  controller.update({ width: 400, zoom: 0, fitZoom: 8, pan: { x: 0, y: 0 }, onPan, onZoom, onTap });
  callbacks.onPanResponderGrant?.(event([100]), gesture());
  callbacks.onPanResponderMove?.(event([140]), gesture(40, 20));
  expect(onPan).toHaveBeenCalledWith({ x: -80, y: -40 });
  callbacks.onPanResponderRelease?.(event([140]), gesture(40, 20));
  expect(onTap).not.toHaveBeenCalled();
  callbacks.onPanResponderGrant?.(event([100, 200]), gesture());
  callbacks.onPanResponderMove?.(event([50, 250]), gesture());
  expect(onZoom).toHaveBeenCalledWith(1);
  expect(onPan).toHaveBeenCalledWith({ x: -100, y: -20 });
  callbacks.onPanResponderGrant?.(event([120]), gesture());
  callbacks.onPanResponderRelease?.(event([120]), gesture());
  expect(onTap).toHaveBeenCalledWith(120, 100);
  onPan.mockClear();
  callbacks.onPanResponderGrant?.(event([100]), gesture());
  callbacks.onPanResponderMove?.(event([100, 200]), gesture());
  callbacks.onPanResponderMove?.(event([50, 250]), gesture());
  expect(onPan).toHaveBeenCalledWith({ x: -100, y: -20 });
  onTap.mockClear(); controller.update(null);
  callbacks.onPanResponderRelease?.(event([120]), gesture());
  expect(onTap).not.toHaveBeenCalled();
});
