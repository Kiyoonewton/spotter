import type { MapRoute } from '@/lib/geographic-map';

export const route: MapRoute = {
  id: 'arbitrary-route',
  name: 'Bent corridor',
  distance_miles: 25,
  duration_minutes: 30,
  eligibility: 'incomplete',
  risk_miles: { Unknown: 25 },
  average_risk: null,
  checkpoints: [
    {
      id: 'start',
      route_id: 'arbitrary-route',
      coordinates: { lat: 40, lon: -74 },
      distance_from_origin_miles: 0,
      arrival_at: '2026-10-10T15:00:00Z',
      risk: 'Unknown',
      weather: null,
      reasons: [],
    },
    {
      id: 'end',
      route_id: 'arbitrary-route',
      coordinates: { lat: 41, lon: -72 },
      distance_from_origin_miles: 25,
      arrival_at: '2026-10-10T15:30:00Z',
      risk: 'Unknown',
      weather: null,
      reasons: [],
    },
  ],
  segments: [
    {
      id: 'segment',
      route_id: 'arbitrary-route',
      start_checkpoint_id: 'start',
      end_checkpoint_id: 'end',
      distance_miles: 25,
      risk: 'Unknown',
      coordinates: [
        { lat: 40, lon: -74 },
        { lat: 42, lon: -73 },
        { lat: 41, lon: -72 },
      ],
    },
  ],
};
