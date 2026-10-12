import type { MapCoordinate } from '@/services/api';
import type { MapRoute } from '@/lib/geographic-map';
import { estimateTruckPosition } from '@/lib/truck-position';

type Props = {
  route: MapRoute;
  selectedAt: string;
  project: (point: MapCoordinate) => { x: number; y: number };
};
export function EstimatedTruckMarker({ route, selectedAt, project }: Props) {
  const estimate = estimateTruckPosition(route, selectedAt);
  if (!estimate) return null;
  const point = project(estimate.coordinates);
  return (
    <g
      pointerEvents="none"
      transform={`translate(${point.x}, ${point.y})`}
      role="img"
      aria-label={estimate.arrived ? 'Estimated truck at destination' : 'Estimated truck position'}
      data-testid="estimated-truck"
      data-route-id={route.id}
      data-selected-at={selectedAt}
    >
      <title>
        {estimate.arrived
          ? 'Estimated arrival at destination'
          : 'Estimated position from route timing; not live GPS'}
      </title>
      <circle r="17" fill="#143c70" stroke="white" strokeWidth="3" />
      <g transform="translate(-10, -7)" fill="white" aria-hidden="true">
        <rect x="0" y="0" width="12" height="10" rx="1" />
        <path d="M13 3H17L20 7V10H13Z" />
        <circle cx="4" cy="12" r="2" />
        <circle cx="16" cy="12" r="2" />
      </g>
    </g>
  );
}
