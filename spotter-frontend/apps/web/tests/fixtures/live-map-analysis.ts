import type { TripAnalysis } from '../../src/services/api';

export const liveMapAnalysis: TripAnalysis = {
  analysis_id: 'mock-map',
  data_source: 'live',
  available_route_count: 2,
  routes: ['here-fast', 'here-safe'].map((id) => {
    const risk = id === 'here-fast' ? 'High' : 'Low';
    return {
      id,
      name: id === 'here-fast' ? 'Fast' : 'Safe',
      distance_miles: id === 'here-fast' ? 10 : 12,
      duration_minutes: id === 'here-fast' ? 20 : 25,
      eligibility: 'eligible',
      risk_miles: { [risk]: id === 'here-fast' ? 10 : 12 },
      average_risk: id === 'here-fast' ? 3 : 1,
      segments: [
        {
          id: id + '-segment',
          route_id: id,
          start_checkpoint_id: id + '-start',
          end_checkpoint_id: id + '-end',
          distance_miles: id === 'here-fast' ? 10 : 12,
          risk,
          coordinates: [
            { lat: 40.7, lon: -74 },
            { lat: id === 'here-fast' ? 41.6 : 41.8, lon: -73 },
            { lat: 42.3, lon: -71.1 },
          ],
        },
      ],
      checkpoints: [
        {
          id: id + '-start',
          route_id: id,
          coordinates: { lat: 40.7, lon: -74 },
          distance_from_origin_miles: 0,
          arrival_at: '2026-10-10T14:00:00Z',
          risk,
          weather: { wind_mph: 10, rain_in_hr: id === 'here-fast' ? 0.3 : 0, snow_in_hr: 0 },
          reasons: [],
        },
        {
          id: id + '-end',
          route_id: id,
          coordinates: { lat: 42.3, lon: -71.1 },
          distance_from_origin_miles: id === 'here-fast' ? 10 : 12,
          arrival_at: '2026-10-10T14:25:00Z',
          risk,
          weather: { wind_mph: 10, rain_in_hr: id === 'here-fast' ? 0.3 : 0, snow_in_hr: 0 },
          reasons: [],
        },
      ],
    };
  }),
  recommendation: {
    status: 'recommended',
    recommended_route_id: 'here-safe',
    explanation: 'Safe is recommended.',
  },
};
