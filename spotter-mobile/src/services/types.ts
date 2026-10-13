export type Checkpoint = {
  id: string;
  route_id: string;
  distance_from_origin_miles: number;
  arrival_at: string;
  risk: string;
  weather: {
    wind_mph: number | null;
    rain_in_hr: number | null;
    snow_in_hr: number | null;
  } | null;
  reasons: { explanation: string }[];
};
export type Route = {
  id: string;
  name: string;
  distance_miles: number;
  duration_minutes: number;
  eligibility: string;
  average_risk: number | null;
  routing_notice?: string | null;
  timing_notice?: string;
  risk_miles: Record<string, number>;
  checkpoints: Checkpoint[];
};
export type SavedTrip = {
  analysis_id: string;
  data_source: 'demo' | 'live';
  snapshot: { created_at: string; expires_at: string };
  applied_request: {
    origin: string;
    destination: string;
    departure_timezone: string;
    departure_at: string;
    load_weight_lb: number;
  };
  routing_profile_notice?: string;
  routes: Route[];
  recommendation: {
    status: string;
    recommended_route_id: string | null;
    explanation: string;
  };
};
