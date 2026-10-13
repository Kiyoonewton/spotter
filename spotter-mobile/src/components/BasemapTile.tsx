import { Image } from 'expo-image';
import { isTileAccessBlocked, tileSource } from '../services/basemap-tiles';
export function BasemapTile({ zoom, x, y, left, top, size, onFailure }: {
  zoom: number; x: number; y: number; left: number; top: number; size: number;
  onFailure: (blocked: boolean) => void;
}) {
  return <Image testID="basemap-tile" source={tileSource(zoom, x, y)}
    cachePolicy="memory-disk" contentFit="fill" transition={0}
    style={{ position: 'absolute', left, top, width: size, height: size }}
    onError={event => onFailure(isTileAccessBlocked(event.error))} />;
}
