import { env } from '../env';

export const API_BASE_URL = env.VITE_API_BASE_URL;

export function apiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');
  return `${base}/${normalizedPath}`;
}

export type TripAnalysisRequest = {
  save_snapshot?: boolean;
  mode?: 'demo' | 'live';
  origin: string;
  destination: string;
  departure_at: string;
  departure_timezone: string;
  load_weight_lb: number;
  checkpoint_spacing_miles: number;
  origin_coordinates?: { lat: number; lon: number };
  destination_coordinates?: { lat: number; lon: number };
};

export type LocationCandidate = {
  provider_id: string;
  label: string;
  latitude: number;
  longitude: number;
  timezone: string | null;
};

export async function searchLocations(
  query: string,
  mode: 'demo' | 'live' = 'demo',
  signal?: AbortSignal,
) {
  const response = await fetch(
    `${apiUrl('/locations/')}?q=${encodeURIComponent(query)}&mode=${mode}`,
    signal ? { signal } : undefined,
  );
  const body = (await response.json().catch(() => ({}))) as {
    results?: LocationCandidate[];
    error?: string;
    code?: string;
    request_id?: string;
  };
  if (!response.ok) {
    const error = new Error(
      body.error ?? 'Location search is temporarily unavailable.',
    ) as Error & { code?: string; requestId?: string };
    if (body.code !== undefined) error.code = body.code;
    if (body.request_id !== undefined) error.requestId = body.request_id;
    throw error;
  }
  return body.results ?? [];
}

export type MapCoordinate = { lat: number; lon: number };
export type RouteSegment = {
  id: string;
  route_id: string;
  start_checkpoint_id: string;
  end_checkpoint_id: string;
  coordinates: MapCoordinate[];
  distance_miles: number;
  risk: string;
};

export type TripAnalysis = {
  snapshot?: {
    token: string;
    created_at: string;
    expires_at: string;
    policy_version: string;
    restored?: boolean;
  };
  snapshot_notice?: string;
  applied_request?: TripAnalysisRequest;
  analysis_id: string;
  data_source: 'demo' | 'live';
  demo_notice?: string;
  available_route_count?: number;
  routes: Array<{
    id: string;
    name: string;
    distance_miles: number;
    duration_minutes: number;
    timing_method?: string;
    timing_span_count?: number;
    timing_notice?: string;
    eligibility: string;
    risk_miles: Record<string, number>;
    average_risk: number | null;
    segments?: RouteSegment[];
    checkpoints: Array<{
      id: string;
      route_id: string;
      coordinates?: MapCoordinate;
      distance_from_origin_miles: number;
      arrival_at: string;
      timing_method?: string;
      elapsed_seconds?: number;
      risk: string;
      weather: {
        wind_mph: number | null;
        rain_in_hr: number | null;
        snow_in_hr: number | null;
        provider?: string;
        retrieved_at?: string;
        forecast_valid_at?: string;
        interval_start?: string;
        interval_end?: string;
      } | null;
      reasons: Array<{ explanation: string }>;
    }>;
  }>;
  recommendation: { status: string; recommended_route_id: string | null; explanation: string };
};

export async function createTripAnalysis(input: TripAnalysisRequest): Promise<TripAnalysis> {
  const response = await fetch(apiUrl('/trip-analyses/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ save_snapshot: true, ...input }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(
      body.errors
        ? Object.values(body.errors).map(String).join(' ')
        : (body.error ?? 'Trip analysis failed.'),
    ) as Error & { code?: string; requestId?: string };
    if (body.code !== undefined) error.code = body.code;
    if (body.request_id !== undefined) error.requestId = body.request_id;
    throw error;
  }
  return response.json() as Promise<TripAnalysis>;
}
