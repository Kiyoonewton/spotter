import { env } from '../env';

export const API_BASE_URL = env.VITE_API_BASE_URL;

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
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
  routes: Array<{ id: 'A' | 'B' | 'C'; eligibility: string; risk_miles: Record<string, number> }>;
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
