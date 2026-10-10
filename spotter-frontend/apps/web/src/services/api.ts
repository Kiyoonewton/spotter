import { env } from '../env';

export const API_BASE_URL = env.VITE_API_BASE_URL;

export function apiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');
  return `${base}/${normalizedPath}`;
}

export type TripAnalysisRequest = {
  origin: string;
  destination: string;
  departure_at: string;
  departure_timezone: string;
  load_weight_lb: number;
  checkpoint_spacing_miles: number;
};

export type TripAnalysis = {
  analysis_id: string;
  data_source: 'demo';
  demo_notice: string;
  routes: Array<{
    id: 'A' | 'B' | 'C';
    name: string;
    distance_miles: number;
    duration_minutes: number;
    eligibility: string;
    risk_miles: Record<string, number>;
    average_risk: number | null;
    checkpoints: Array<{
      id: string;
      route_id: string;
      distance_from_origin_miles: number;
      arrival_at: string;
      risk: string;
      weather: { wind_mph: number | null; rain_in_hr: number | null; snow_in_hr: number | null };
      reasons: Array<{ explanation: string }>;
    }>;
  }>;
  recommendation: { status: string; recommended_route_id: string | null; explanation: string };
};

export async function createTripAnalysis(input: TripAnalysisRequest): Promise<TripAnalysis> {
  const response = await fetch(apiUrl('/trip-analyses/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body.errors ? Object.values(body.errors).map(String).join(' ') : 'Trip analysis failed.',
    );
  }
  return response.json() as Promise<TripAnalysis>;
}
