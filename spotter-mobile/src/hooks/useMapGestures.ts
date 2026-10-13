import { useEffect, useMemo } from 'react';
import { MapGestureController, type MapGestureOptions } from '../lib/MapGestureController';
export function useMapGestures(options: MapGestureOptions) {
  const controller = useMemo(() => new MapGestureController(), []);
  useEffect(() => { controller.update(options); return () => controller.update(null); }, [controller, options]);
  return controller.responder;
}
