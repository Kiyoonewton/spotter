import { apiUrl, type MapCoordinate } from './api';

export type ForecastVariable = 'wind' | 'rain' | 'snow';
export type ForecastPoint = { id: string; route_id: string; coordinates: MapCoordinate };
export type ForecastSample = {
  id: string;
  route_id: string;
  risk: string;
  risks: Record<ForecastVariable, string>;
  weather: {
    wind_mph: number | null;
    rain_in_hr: number | null;
    snow_in_hr: number | null;
    wind_valid_at: string;
    interval_start: string;
    interval_end: string;
  } | null;
};
export type ForecastFrame = { hour: number; valid_at: string; samples: ForecastSample[] };
export type CorridorForecast = {
  data_source: 'live';
  provider: string;
  start_at: string;
  retrieved_at: string;
  cache_ttl_seconds: number;
  points: ForecastPoint[];
  frames: ForecastFrame[];
  units: Record<ForecastVariable, string>;
};

export async function fetchCorridorForecast(
  points: ForecastPoint[],
  startAt: string,
  load: number,
  signal: AbortSignal,
): Promise<CorridorForecast> {
  const response = await fetch(apiUrl('/corridor-forecasts/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points, start_at: startAt, load_weight_lb: load }),
    signal,
  });
  const body = await response.json();
  if (!response.ok) throw new Error('Corridor forecast is temporarily unavailable.');
  if (
    body.data_source !== 'live' ||
    !Array.isArray(body.frames) ||
    body.frames.length !== 49 ||
    body.frames.some((frame: ForecastFrame, index: number) => frame.hour !== index)
  )
    throw new Error('Corridor forecast returned an invalid hourly series.');
  return body as CorridorForecast;
}
