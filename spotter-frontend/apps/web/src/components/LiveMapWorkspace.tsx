import { timingDescription } from '@/lib/timing-presentation';
import { journeyHorizon } from '@/lib/journey-horizon';
import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Slider from '@mui/material/Slider';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { TripAnalysis } from '@/services/api';
import type { ForecastVariable } from '@/services/corridor-forecast';
import { useCorridorForecast } from '@/hooks/useCorridorForecast';
import { GeographicRouteMap } from './GeographicRouteMap';
import { ForecastTimeline } from './ForecastTimeline';

type Props = {
  analysis: TripAnalysis;
  selected: string;
  checkpoint: number;
  startAt: string;
  timezone: string;
  load: number;
  onRoute: (id: string) => void;
  onCheckpoint: (index: number) => void;
};

export function LiveMapWorkspace(props: Props) {
  const { data, loading, error, retry } = useCorridorForecast(
    props.analysis,
    props.startAt,
    props.load,
  );
  const [selectedHour, setHour] = useState(0);
  const horizonHours = journeyHorizon(props.analysis.routes);
  const hour = Math.min(selectedHour, horizonHours);
  const [variable, setVariable] = useState<ForecastVariable>('wind');
  const [opacity, setOpacity] = useState(45);
  const frame = data?.frames[hour];
  const timestamp = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: props.timezone,
    timeZoneName: 'short',
  }).format(new Date(frame?.valid_at ?? props.startAt));
  return (
    <div className="live-map-workspace">
      <GeographicRouteMap
        routes={props.analysis.routes}
        selected={props.selected}
        checkpoint={props.checkpoint}
        previewAt={new Date(Date.parse(props.startAt) + hour * 3600000).toISOString()}
        onRoute={props.onRoute}
        onCheckpoint={props.onCheckpoint}
        {...(frame
          ? { forecastFrame: frame, forecastVariable: variable, forecastOpacity: opacity }
          : {})}
      />
      {loading && <LinearProgress aria-label="Loading corridor forecast" />}
      {error && (
        <Alert severity="warning" action={<Button onClick={retry}>Retry</Button>}>
          {error}
        </Alert>
      )}
      <ToggleButtonGroup
        exclusive
        value={variable}
        aria-label="Forecast weather variable"
        onChange={(_, value: ForecastVariable | null) => value && setVariable(value)}
      >
        <ToggleButton value="wind">Wind · mph</ToggleButton>
        <ToggleButton value="rain">Rain · in/hr</ToggleButton>
        <ToggleButton value="snow">Snow · in/hr</ToggleButton>
      </ToggleButtonGroup>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px' }}>
        <span style={{ whiteSpace: 'nowrap', fontSize: 12 }}>Overlay opacity</span>
        <Slider
          aria-label="Forecast overlay opacity"
          min={0}
          max={100}
          value={opacity}
          onChange={(_, value) => setOpacity(value as number)}
        />
        <span style={{ fontSize: 12 }}>{opacity}%</span>
      </div>
      <ForecastTimeline
        variant="live"
        horizonHours={horizonHours}
        disabled={!data || loading}
        forecastHour={hour}
        timestamp={timestamp}
        onForecastHour={setHour}
      />
      <p style={{ padding: '0 16px', fontSize: 12 }}>
        Truck marker: interpolated between checkpoint arrivals, not live GPS.{' '}
        {timingDescription(props.analysis.routes.find((route) => route.id === props.selected))}{' '}
        Sampled checkpoint weather, not radar or a continuous heatmap. Dashed circles indicate
        unavailable measurements. {props.timezone}.
        {data
          ? ` Open-Meteo retrieved ${data.retrieved_at}; cached up to ${data.cache_ttl_seconds}s.`
          : ''}{' '}
        Rain and snow show average rates over the labelled one-hour accumulation interval.
      </p>
      {frame && (
        <details style={{ padding: '0 16px' }}>
          <summary>Forecast sample times and values</summary>
          {frame.samples
            .filter((sample) => sample.route_id === props.selected)
            .map((sample) => (
              <p key={sample.id}>
                {sample.id}: wind {sample.weather?.wind_mph?.toFixed(1) ?? 'Unavailable'} mph; rain{' '}
                {sample.weather?.rain_in_hr?.toFixed(3) ?? 'Unavailable'} in/hr; snow{' '}
                {sample.weather?.snow_in_hr?.toFixed(3) ?? 'Unavailable'} in/hr. Wind at{' '}
                {sample.weather?.wind_valid_at ?? 'Unavailable'}; precipitation [
                {sample.weather?.interval_start ?? 'Unavailable'},{' '}
                {sample.weather?.interval_end ?? 'Unavailable'}).
              </p>
            ))}
        </details>
      )}
    </div>
  );
}
