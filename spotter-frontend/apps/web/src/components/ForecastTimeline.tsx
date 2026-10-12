import Slider from '@mui/material/Slider';
import CloudIcon from '@mui/icons-material/FilterDramaOutlined';
import InfoIcon from '@mui/icons-material/InfoOutlined';

type Props = {
  variant?: 'demo' | 'live';
  disabled?: boolean;
  forecastHour: number;
  timestamp: string;
  onForecastHour: (hour: number) => void;
};

const sx = (fontSize: number) => ({ fontSize });

export function ForecastTimeline({
  variant = 'demo',
  disabled = false,
  forecastHour,
  timestamp,
  onForecastHour,
}: Props) {
  return (
    <div className="forecast-panel">
      <div className="forecast-heading">
        <div>
          <CloudIcon sx={sx(20)} />
          <strong>Weather over the next 48 hours</strong>
          <span>{variant === 'live' ? 'Hourly route weather' : 'Illustrative demo weather'}</span>
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
            max={48}
            step={1}
            marks={[0, 12, 24, 36, 48].map((value) => ({ value }))}
            value={forecastHour}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `+${value}h`}
            onChange={(_, value) => {
              onForecastHour(value as number);
            }}
          />
          <div className="forecast-ticks">
            {[0, 12, 24, 36, 48].map((value) => (
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
        +6h means six hours after departure. Route recommendations use weather at each checkpoint’s
        truck arrival time and do not change when you move this slider.
      </div>
    </div>
  );
}
