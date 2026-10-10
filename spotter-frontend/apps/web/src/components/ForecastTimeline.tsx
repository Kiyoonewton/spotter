import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Tooltip from '@mui/material/Tooltip';
import CloudIcon from '@mui/icons-material/FilterDramaOutlined';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import PauseIcon from '@mui/icons-material/PauseRounded';
import PlayIcon from '@mui/icons-material/PlayArrowRounded';

type Props = {
  forecastHour: number;
  timestamp: string;
  playing: boolean;
  onForecastHour: (hour: number) => void;
  onPlaying: (playing: boolean) => void;
};

const sx = (fontSize: number) => ({ fontSize });

export function ForecastTimeline({
  forecastHour,
  timestamp,
  playing,
  onForecastHour,
  onPlaying,
}: Props) {
  return (
    <div className="forecast-panel">
      <div className="forecast-heading">
        <div>
          <CloudIcon sx={sx(20)} />
          <strong>Corridor forecast</strong>
          <span>Illustrative radar &amp; heatmap</span>
        </div>
        <span className="forecast-timestamp">
          <span className="snapshot-dot" />
          Depart +{forecastHour}h <span>•</span> {timestamp} <span>•</span>
          <small>Forecast snapshot</small>
        </span>
      </div>
      <div className="forecast-slider-row">
        <Tooltip title={playing ? 'Pause forecast' : 'Play forecast'}>
          <IconButton
            className="forecast-play"
            color="primary"
            aria-label={playing ? 'Pause forecast' : 'Play forecast'}
            onClick={() => onPlaying(!playing)}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </IconButton>
        </Tooltip>
        <div className="forecast-track">
          <Slider
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
              onPlaying(false);
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
        Illustrative forecast visualization only. The slider does not change route ranking or
        checkpoint arrival-time weather.
      </div>
    </div>
  );
}
