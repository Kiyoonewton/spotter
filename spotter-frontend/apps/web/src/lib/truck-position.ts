import type { MapCoordinate } from '@/services/api';
import { ownedSegments, validCoordinate, type MapRoute } from './geographic-map';

const radians = (degrees: number) => (degrees * Math.PI) / 180;
function distance(a: MapCoordinate, b: MapCoordinate) {
  const lat = radians(b.lat - a.lat),
    lon = radians(b.lon - a.lon);
  const h =
    Math.sin(lat / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(lon / 2) ** 2;
  return 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

function alongPath(path: MapCoordinate[], fraction: number): MapCoordinate | null {
  if (path.length < 2 || !path.every(validCoordinate)) return null;
  const lengths = path.slice(1).map((point, index) => distance(path[index]!, point));
  const total = lengths.reduce((sum, value) => sum + value, 0);
  if (!total) return path[0]!;
  let remaining = fraction * total;
  for (let index = 0; index < lengths.length; index++) {
    const length = lengths[index]!;
    if (remaining <= length && length > 0) {
      const a = path[index]!,
        b = path[index + 1]!,
        ratio = remaining / length;
      const delta = ((b.lon - a.lon + 540) % 360) - 180;
      return {
        lat: a.lat + (b.lat - a.lat) * ratio,
        lon: ((a.lon + delta * ratio + 540) % 360) - 180,
      };
    }
    remaining -= length;
  }
  return path[path.length - 1]!;
}

export function estimateTruckPosition(route: MapRoute, selectedAt: string) {
  const checkpoints = route.checkpoints.filter((point) => point.route_id === route.id);
  const times = checkpoints.map((point) => Date.parse(point.arrival_at));
  const target = Date.parse(selectedAt);
  if (
    checkpoints.length < 2 ||
    !Number.isFinite(target) ||
    times.some((time, index) => !Number.isFinite(time) || (index > 0 && time <= times[index - 1]!))
  )
    return null;
  const first = checkpoints[0]!,
    last = checkpoints[checkpoints.length - 1]!;
  if (!validCoordinate(first.coordinates) || !validCoordinate(last.coordinates)) return null;
  if (target <= times[0]!) return { coordinates: first.coordinates, arrived: false };
  if (target >= times[times.length - 1]!) return { coordinates: last.coordinates, arrived: true };
  const end = times.findIndex((time) => time > target);
  const start = end - 1;
  const segment = ownedSegments(route).find(
    (item) =>
      item.start_checkpoint_id === checkpoints[start]!.id &&
      item.end_checkpoint_id === checkpoints[end]!.id,
  );
  if (!segment) return null;
  const fraction = (target - times[start]!) / (times[end]! - times[start]!);
  const coordinates = alongPath(segment.coordinates, fraction);
  return coordinates ? { coordinates, arrived: false } : null;
}
