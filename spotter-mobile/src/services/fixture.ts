import type { SavedTrip } from './types';
export function fixture(): SavedTrip {
  const checkpoint = (route_id: string) => ({
    id: `${route_id}-1`, route_id, distance_from_origin_miles: 0,
    arrival_at: '2026-10-13T12:00:00Z', risk: 'Unknown',
    weather: { wind_mph: 12, rain_in_hr: null, snow_in_hr: 0 }, reasons: [],
  });
  return {
    analysis_id: 'saved-1', data_source: 'live',
    snapshot: { created_at: '2026-10-12T12:00:00Z', expires_at: '2026-10-19T12:00:00Z' },
    applied_request: { origin: 'Chicago', destination: 'Pittsburgh', departure_timezone: 'America/Chicago',
      departure_at: '2026-10-13T12:00:00Z', load_weight_lb: 42000 },
    recommendation: { status: 'incomplete', recommended_route_id: null, explanation: 'Forecast coverage is incomplete.' },
    routes: ['alpha', 'beta'].map(id => ({ id, name: id, distance_miles: 450, duration_minutes: 480,
      eligibility: 'incomplete', average_risk: null, risk_miles: { Unknown: 450 }, checkpoints: [checkpoint(id)] })),
  };
}
