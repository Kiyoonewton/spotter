import { PanResponder } from 'react-native';
import { anchoredPan, dragPan, pinchZoom, type Point } from './map-interaction';
import { MAP_WIDTH } from './geographic-map';
export type MapGestureOptions = { zoom: number; fitZoom: number; pan: Point; width: number;
  onZoom: (zoom: number) => void; onPan: (pan: Point) => void; onTap: (x: number, y: number) => void };
export class MapGestureController {
  private options: MapGestureOptions | null = null;
  private start = { zoom: 0, pan: { x: 0, y: 0 }, distance: 0, focal: { x: 0, y: 0 }, moved: false };
  update(options: MapGestureOptions | null) { this.options = options; }
  readonly responder = PanResponder.create({

    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: event => {
      const current = this.options; if (!current) return; const touches = event.nativeEvent.touches;
      const pair = touches.length >= 2;
      this.start = { zoom: current.zoom, pan: current.pan,
        distance: pair ? Math.hypot(touches[1].pageX - touches[0].pageX, touches[1].pageY - touches[0].pageY) : 0,
        focal: { x: (pair ? (touches[0].locationX + touches[1].locationX) / 2 : event.nativeEvent.locationX) * MAP_WIDTH / Math.max(current.width, 1),
          y: (pair ? (touches[0].locationY + touches[1].locationY) / 2 : event.nativeEvent.locationY) * MAP_WIDTH / Math.max(current.width, 1) }, moved: pair };
    },
    onPanResponderMove: (event, gesture) => {
      const current = this.options; if (!current) return; const touches = event.nativeEvent.touches;
      if (touches.length >= 2) {
        const distance = Math.hypot(touches[1].pageX - touches[0].pageX, touches[1].pageY - touches[0].pageY);
        if (!this.start.distance) {
          this.start.distance = distance; this.start.zoom = current.zoom; this.start.pan = current.pan;
          const scale = MAP_WIDTH / Math.max(current.width, 1);
          this.start.focal = { x: (touches[0].locationX + touches[1].locationX) / 2 * scale,
            y: (touches[0].locationY + touches[1].locationY) / 2 * scale };
        }
        this.start.moved = true;
        const zoom = pinchZoom(this.start.zoom, distance / Math.max(this.start.distance, 1), current.fitZoom);
        current.onZoom(zoom); current.onPan(anchoredPan(this.start.pan, zoom - this.start.zoom, this.start.focal));
      } else if (!this.start.distance && Math.hypot(gesture.dx, gesture.dy) > 4) {
        this.start.moved = true; current.onPan(dragPan(this.start.pan, gesture.dx, gesture.dy, current.width));
      }
    },
    onPanResponderRelease: event => {
      if (!this.start.moved) this.options?.onTap(event.nativeEvent.locationX, event.nativeEvent.locationY);
    },
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  });
}
