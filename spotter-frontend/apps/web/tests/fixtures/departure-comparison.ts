import type { TripAnalysis } from '../../src/services/api';
import type { DepartureComparison } from '../../src/services/departure-comparison';
export function comparisonFixture(analysis: TripAnalysis, blocked = false): DepartureComparison {
  const start = analysis.applied_request?.departure_at ?? '2026-10-10T14:00:00Z';
  const shift = (at: string, offset: number) =>
    new Date(Date.parse(at) + offset * 3600000).toISOString();
  const risk = (id: string, offset: number) =>
    blocked
      ? 'No Travel'
      : id === 'here-fast'
        ? 'Severe'
        : offset === 0
          ? 'High'
          : offset === 4
            ? 'Moderate'
            : 'Low';
  return {
    source_analysis_id: analysis.analysis_id,
    data_source: analysis.data_source,
    computed_at: start,
    retrieved_at: start,
    notice:
      'Weather-only scenarios on saved routes and driving times. Original analysis is unchanged.',
    forecast_notice: 'All windows use the same forecast series.',
    ranking_policy: 'Risk first, then earliest arrival.',
    windows: [0, 2, 4, 6].map((offset) => ({
      offset_hours: offset,
      departure_at: shift(start, offset),
      recommended_route_id: blocked ? null : 'here-safe',
      routes: analysis.routes.map((route) => ({
        id: route.id,
        distance_miles: route.distance_miles,
        duration_minutes: route.duration_minutes,
        arrival_at: shift(route.checkpoints.at(-1)!.arrival_at, offset),
        risk_miles: { [risk(route.id, offset)]: route.distance_miles },
        average_risk: blocked
          ? 5
          : route.id === 'here-fast'
            ? 4
            : offset === 0
              ? 3
              : offset === 4
                ? 2
                : 1,
        eligibility: blocked ? 'blocked' : 'eligible',
        forecast_coverage_percent: 100,
        checkpoints: route.checkpoints.map((point) => ({
          id: point.id,
          route_id: route.id,
          arrival_at: shift(point.arrival_at, offset),
          risk: risk(route.id, offset),
          weather: {
            wind_mph: blocked ? 60 : route.id === 'here-fast' ? 40 : offset === 4 ? 30 : 10,
            rain_in_hr: !blocked && route.id === 'here-safe' && offset === 0 ? 0.3 : 0,
            snow_in_hr: 0,
          },
          reasons: point.reasons,
        })),
        segment_risks: (route.segments ?? []).map((segment) => ({
          id: segment.id,
          risk: risk(route.id, offset),
        })),
      })),
    })),
    best_choice: blocked
      ? null
      : {
          offset_hours: 2,
          route_id: 'here-safe',
          arrival_at: shift(analysis.routes[1]!.checkpoints.at(-1)!.arrival_at, 2),
          arrival_delay_minutes: 120,
          severe_miles_reduction: 0,
          high_miles_reduction: 12,
          average_risk_reduction: 2,
        },
  };
}
