import type { TripAnalysis } from '@/services/api';

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
export const formatMeasurement = (value: number) => numberFormat.format(value);

// Labels belong to response order, never risk rank; provider IDs retain ownership.
export function presentRoutes(analysis: TripAnalysis | null) {
  return (
    analysis?.routes.map((route, index) => ({
      ...route,
      displayId: analysis.data_source === 'live' ? String(index + 1) : route.id,
      name: analysis.data_source === 'live' ? `Truck alternative ${index + 1}` : route.name,
      roads: analysis.data_source === 'live' ? 'HERE truck route' : route.name,
      miles: route.distance_miles,
      minutes: route.duration_minutes,
      severe: route.risk_miles['Severe'] ?? 0,
      high: route.risk_miles['High'] ?? 0,
      average: route.average_risk,
    })) ?? []
  );
}

export function presentExplanation(analysis: TripAnalysis) {
  const recordedAt = analysis.snapshot?.created_at;
  const forecastStart = recordedAt ? Date.parse(recordedAt.slice(0, 10) + 'T00:00:00Z') : NaN;
  if (
    analysis.data_source === 'live' &&
    !analysis.recommendation.recommended_route_id &&
    analysis.routes.some(
      (route) =>
        route.eligibility === 'incomplete' &&
        route.checkpoints.some(
          (point) => point.weather === null && Date.parse(point.arrival_at) < forecastStart,
        ),
    )
  )
    return 'Some checkpoint arrivals are in the past, outside the current forecast coverage. Choose a current or future departure and compare routes again. Missing weather remains Unknown.';

  return presentRoutes(analysis).reduce(
    (text, route) =>
      analysis.data_source === 'live' && route.id.length >= 16
        ? text.replaceAll(route.id, `Route ${route.displayId}`)
        : text,
    analysis.recommendation.explanation,
  );
}
