import type { MapCoordinate } from '@/services/api';
import type { ForecastFrame, ForecastVariable } from '@/services/corridor-forecast';
import { RISK_COLOURS, validCoordinate, type MapRoute } from '@/lib/geographic-map';

type Props = {
  routes: readonly MapRoute[];
  selected: string;
  frame: ForecastFrame;
  variable: ForecastVariable;
  opacity: number;
  project: (coordinates: MapCoordinate) => { x: number; y: number };
};

const field = { wind: 'wind_mph', rain: 'rain_in_hr', snow: 'snow_in_hr' } as const;
export function CorridorForecastOverlay(props: Props) {
  const route = props.routes.find((item) => item.id === props.selected);
  return (
    <g aria-label="Sampled corridor forecast overlay" pointerEvents="none">
      {props.frame.samples.map((sample) => {
        if (sample.route_id !== props.selected) return null;
        const checkpoint = route?.checkpoints.find(
          (point) => point.id === sample.id && point.route_id === sample.route_id,
        );
        if (!validCoordinate(checkpoint?.coordinates)) return null;
        const position = props.project(checkpoint.coordinates);
        const value = sample.weather?.[field[props.variable]] ?? null;
        const risk = value === null ? 'Unknown' : sample.risks[props.variable];
        return (
          <circle
            key={sample.id}
            data-testid={`forecast-${sample.route_id}-${sample.id}`}
            data-value={value === null ? 'missing' : value}
            data-hour={props.frame.hour}
            cx={position.x}
            cy={position.y}
            r={24}
            fill={value === null ? 'none' : (RISK_COLOURS[risk] ?? RISK_COLOURS['Unknown'])}
            stroke={RISK_COLOURS[risk] ?? RISK_COLOURS['Unknown']}
            strokeDasharray={value === null ? '4 4' : undefined}
            opacity={props.opacity / 100}
          >
            <title>{`${props.variable}: ${value === null ? 'Unavailable' : value.toFixed(2)} · ${props.frame.valid_at}`}</title>
          </circle>
        );
      })}
    </g>
  );
}
