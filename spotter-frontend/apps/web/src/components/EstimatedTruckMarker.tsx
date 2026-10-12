import TruckIcon from '@mui/icons-material/LocalShippingRounded';
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
      <TruckIcon x="-11" y="-11" sx={{ width: 22, height: 22, color: 'white' }} />
    </g>
  );
}
