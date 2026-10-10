import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded';
import ClockIcon from '@mui/icons-material/AccessTimeRounded';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import RainIcon from '@mui/icons-material/WaterDropOutlined';
import SnowIcon from '@mui/icons-material/AcUnitRounded';
import WarningIcon from '@mui/icons-material/WarningAmberRounded';
import WindIcon from '@mui/icons-material/AirRounded';
import type { Risk } from '@/lib/dispatch-data';

export type InspectorCheckpoint = {
  city: string;
  miles: number;
  minutes: number;
  wind: number | null;
  rain: number | null;
  snow: number | null;
  risk: Risk;
  rule: string;
  arrivalAt?: string;
};
type Props = {
  checkpoint: InspectorCheckpoint;
  route: string;
  index: number;
  total: number;
  departure: string;
  onPrevious: () => void;
  onNext: () => void;
};
const sx = (fontSize: number) => ({ fontSize });
export function CheckpointInspector({
  checkpoint: cp,
  route,
  index,
  total,
  departure,
  onPrevious,
  onNext,
}: Props) {
  const unknown = cp.risk === 'Unknown';
  const formatArrival =
    cp.arrivalAt ??
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(new Date(new Date(`${departure}:00-05:00`).getTime() + cp.minutes * 60000));
  return (
    <div className="checkpoint-panel">
      <div className="panel-heading">
        <h3>Checkpoint inspector</h3>
        <div className="checkpoint-nav">
          <IconButton aria-label="Previous checkpoint" disabled={index === 0} onClick={onPrevious}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton aria-label="Next checkpoint" disabled={index === total - 1} onClick={onNext}>
            <ChevronRightIcon />
          </IconButton>
        </div>
      </div>
      <div className="checkpoint-place">
        <span className="checkpoint-icon">
          <PlaceIcon sx={sx(19)} />
        </span>
        <div>
          <strong>{cp.city}</strong>
          <span>
            Route {route} · Sample checkpoint {index + 1} · Mile {cp.miles}
          </span>
        </div>
        <Chip
          size="small"
          className={`risk-chip risk-${cp.risk.toLowerCase().replace(' ', '-')}`}
          label={cp.risk}
        />
      </div>
      <div className="checkpoint-eta">
        <ClockIcon sx={sx(15)} />
        <span>Truck arrival</span>
        <strong>{formatArrival}</strong>
      </div>
      <div className="weather-metrics">
        <div>
          <WindIcon sx={sx(20)} />
          <strong>
            {unknown || cp.wind == null ? '—' : cp.wind}
            <small>mph</small>
          </strong>
          <span>Wind</span>
        </div>
        <div>
          <RainIcon sx={sx(20)} />
          <strong>
            {unknown || cp.rain == null ? '—' : cp.rain.toFixed(2)}
            <small>in/hr</small>
          </strong>
          <span>Rain</span>
        </div>
        <div>
          <SnowIcon sx={sx(20)} />
          <strong>
            {unknown || cp.snow == null ? '—' : cp.snow.toFixed(2)}
            <small>in/hr</small>
          </strong>
          <span>Snow</span>
        </div>
      </div>
      <div className={`trigger-rule ${unknown ? 'unknown-rule' : ''}`}>
        <span>
          <WarningIcon sx={sx(15)} />
          TRIGGERING RULE
          <Chip
            size="small"
            color="warning"
            label="RULE"
            sx={{ ml: 'auto', height: 20, fontSize: 10 }}
          />
        </span>
        <p>
          {unknown
            ? 'Risk unknown—forecast unavailable. No arrival-time weather can be assessed at this checkpoint.'
            : cp.rule}
        </p>
      </div>
    </div>
  );
}
