import { forecastTicks } from '@/lib/journey-horizon';
import Slider from '@mui/material/Slider';
import CloudIcon from '@mui/icons-material/FilterDramaOutlined';
import InfoIcon from '@mui/icons-material/InfoOutlined';

type Props = {
  variant?: 'demo' | 'live';
  disabled?: boolean;
  horizonHours: number;
  forecastHour: number;
  timestamp: string;
  onForecastHour: (hour: number) => void;
};

const sx = (fontSize: number) => ({ fontSize });

export function ForecastTimeline({
  variant = 'demo',
  disabled = false,
  horizonHours,
  forecastHour,
  timestamp,
  onForecastHour,
}: Props) {
  const ticks = forecastTicks(horizonHours);
  return (
    <div className="forecast-panel">
      <div className="forecast-heading">
        <div>
          <CloudIcon sx={sx(20)} />
          <strong>Weather through the longest journey</strong>
          <span>
            {variant === 'live' ? 'Hourly route weather' : 'Illustrative demo weather'} · through +
            {horizonHours}h
          </span>
        </div>
        <span className="forecast-timestamp">
          <span className="snapshot-dot" />
          Depart +{forecastHour}h <span>•</span> {timestamp} <span>•</span>
          <small>Selected weather time</small>
        </span>
      </div>
      <div className="forecast-slider-row">
        <div className="forecast-track">
          <Slider
            disabled={disabled}
            aria-label="Corridor forecast hours after departure"
            min={0}
            max={horizonHours}
            step={1}
            marks={ticks.map((value) => ({ value }))}
            value={Math.min(forecastHour, horizonHours)}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `+${value}h`}
            onChange={(_, value) => {
              onForecastHour(value as number);
            }}
          />
          <div className="forecast-ticks">
            {ticks.map((value) => (
              <span key={value}>{value === 0 ? 'Departure' : `+${value}h`}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="forecast-note">
        <InfoIcon sx={sx(14)} />
        {variant === 'live'
          ? 'Move the slider to see weather along the route at that time. '
          : 'Demo visualization only; these shapes are illustrative. '}
        The hourly view ends at the longest route’s arrival, rounded up to the next hour. Route
        recommendations use weather at each checkpoint’s truck arrival time and do not change when
        you move this slider.
      </div>
    </div>
  );
}
