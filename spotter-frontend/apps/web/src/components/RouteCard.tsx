import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import ArrowUpRightIcon from '@mui/icons-material/NorthEastRounded';
import CheckIcon from '@mui/icons-material/CheckRounded';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import ShieldIcon from '@mui/icons-material/GppGoodOutlined';
import WarningIcon from '@mui/icons-material/WarningAmberRounded';
import { RiskMileageBar } from './risk-mileage-bar';
import type { Risk } from '@/lib/dispatch-data';

export type RouteView = {
  id: string;
  name: string;
  roads: string;
  miles: number;
  minutes: number;
  severe: number;
  high: number;
  average: number;
  risk_miles?: Record<string, number>;
  eligibility?: string;
};
const sx = (fontSize: number) => ({ fontSize });

type Props = {
  route: RouteView;
  rank: number;
  selected: string;
  recommended: string;
  blocked: boolean;
  missing: boolean;
  spacing: number;
  onSelect: (id: string) => void;
};
export function RouteCard({
  route,
  rank,
  selected,
  recommended,
  blocked,
  missing,
  spacing,
  onSelect,
}: Props) {
  const riskMiles = route.risk_miles ?? { High: route.high, Severe: route.severe };
  return (
    <Card className={`route-card-mui ${selected === route.id ? 'selected' : ''}`}>
      <CardActionArea
        className="route-card"
        onClick={() => onSelect(route.id)}
        aria-pressed={selected === route.id}
      >
        <div className="route-card-top">
          <span className="route-id">{route.id}</span>
          <div className="route-name">
            <strong>Route {route.id}</strong>
            <span>{route.name}</span>
          </div>
          {!blocked && !missing && route.id === recommended ? (
            <Chip
              size="small"
              color="success"
              icon={<CheckIcon sx={sx(14)} />}
              label="Recommended"
            />
          ) : (
            <Chip size="small" variant="outlined" label={`#${rank + 1}`} />
          )}
        </div>
        <div className="route-road">
          {route.roads}
          <span>{route.miles} mi</span>
        </div>
        <RiskMileageBar
          route={route.id}
          miles={route.miles}
          riskMiles={riskMiles as Partial<Record<Risk, number>>}
        />
        <div className="route-metrics">
          <div>
            <span>Severe miles</span>
            <strong>
              {blocked ? '—' : route.severe}
              <small>{!blocked ? ' mi' : ''}</small>
            </strong>
          </div>
          <div>
            <span>High miles</span>
            <strong>
              {blocked ? '—' : route.high}
              <small>{!blocked ? ' mi' : ''}</small>
            </strong>
          </div>
          <div>
            <span>Average risk</span>
            <strong>
              {blocked || missing ? '—' : route.average.toFixed(1)}
              <small>{!blocked && !missing ? ' / 5' : ''}</small>
            </strong>
          </div>
          <div>
            <span>Travel time</span>
            <strong>
              {Math.floor(route.minutes / 60)}h {route.minutes % 60}m
            </strong>
          </div>
        </div>
        {!blocked && !missing && route.id === recommended && (
          <div className="route-reason">
            <ShieldIcon sx={sx(15)} />
            <span>Recommended by returned analysis</span>
          </div>
        )}
        {blocked ? (
          <div className="blocked-rule">
            <WarningIcon sx={sx(14)} />
            No Travel — see returned blocking reasons
          </div>
        ) : (
          <div className="route-card-footer">
            {selected === route.id ? (
              <span>
                <span className="selection-mark" />
                Selected route
              </span>
            ) : (
              <span>
                Select route <ArrowUpRightIcon sx={sx(13)} />
              </span>
            )}
            <span>
              {missing ? 'Partial forecast' : `${Math.ceil(route.miles / spacing) + 1} checkpoints`}
            </span>
          </div>
        )}
      </CardActionArea>
    </Card>
  );
}
