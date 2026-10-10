import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Slider from '@mui/material/Slider';
import LayersIcon from '@mui/icons-material/LayersOutlined';
import RouteIcon from '@mui/icons-material/RouteOutlined';
import { DispatchMap } from './dispatch-map';
import { ForecastTimeline } from './ForecastTimeline';
import type { DemoState, Risk } from '@/lib/dispatch-data';

type Props = {
  selected: string;
  checkpoint: number;
  pending: boolean;
  progress: number;
  opacity: number;
  forecast: number;
  playing: boolean;
  state: DemoState;
  departure: string;
  spacing: number;
  missing: boolean;
  onSelect: (id: string) => void;
  onCheckpoint: (index: number) => void;
  onOpacity: (value: number) => void;
  onForecast: (value: number) => void;
  onPlaying: (value: boolean) => void;
};
const risks: Risk[] = ['Low', 'Moderate', 'High', 'Severe', 'No Travel', 'Unknown'];
const sx = (fontSize: number) => ({ fontSize });

export function MapWorkspace(props: Props) {
  return (
    <section className="map-workspace">
      <div className="map-header">
        <div>
          <span className="live-dot" />
          <strong>Corridor overview</strong>
          <span className="selected-map-label">Route {props.selected} selected</span>
        </div>
        <Chip
          size="small"
          variant="outlined"
          icon={<LayersIcon sx={sx(15)} />}
          label="Illustrative weather overlay"
        />
      </div>
      <div className="map-stage">
        {props.pending ? (
          <div className="map-loading">
            <div className="loading-orbit">
              <RouteIcon sx={sx(30)} />
            </div>
            <h3>Checking the weather ahead</h3>
            <p>Sampling {Math.ceil(482 / props.spacing) + 1} checkpoint arrival forecasts</p>
            <LinearProgress
              variant="determinate"
              value={props.progress}
              sx={{ height: 8, borderRadius: 4, width: 'min(280px,80%)' }}
            />
            <span>{props.progress}% · Comparing 3 corridors</span>
          </div>
        ) : (
          <DispatchMap
            selected={props.selected}
            onSelect={props.onSelect}
            checkpoint={props.checkpoint}
            onCheckpoint={props.onCheckpoint}
            opacity={props.opacity}
            forecast={props.forecast}
            state={props.state}
          />
        )}
        <label className="opacity-control floating-opacity">
          <span>
            <LayersIcon sx={sx(15)} />
            Heatmap
          </span>
          <Slider
            size="small"
            aria-label="Heatmap opacity"
            min={0}
            max={100}
            step={5}
            value={props.opacity}
            onChange={(_, value) => props.onOpacity(value as number)}
          />
          <strong>{props.opacity}%</strong>
        </label>
      </div>
      <div className="map-legend">
        <div className="legend-risks">
          {risks.map((risk) => (
            <span key={risk}>
              <span className={`risk-dot risk-${risk.toLowerCase().replace(' ', '-')}`} />
              {risk}
            </span>
          ))}
        </div>
        <span className="legend-selection">
          <span />
          Selected route
        </span>
      </div>
      <ForecastTimeline
        forecastHour={props.forecast}
        timestamp={new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        }).format(
          new Date(new Date(`${props.departure}:00-05:00`).getTime() + props.forecast * 3600000),
        )}
        playing={props.playing}
        onForecastHour={props.onForecast}
        onPlaying={props.onPlaying}
      />
    </section>
  );
}
