import type { TripAnalysis } from '@/services/api';

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
export const formatMeasurement = (value: number) => numberFormat.format(value);

// Labels belong to response order, never risk rank; provider IDs retain ownership.
export function presentRoutes(analysis: TripAnalysis | null) {
  return (
    analysis?.routes.map((route, index) => ({
      ...route,
      displayId: analysis.data_source === 'live' ? String.fromCharCode(65 + index) : route.id,
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
  return presentRoutes(analysis).reduce(
    (text, route) =>
      analysis.data_source === 'live' && route.id.length >= 16
        ? text.replaceAll(route.id, `Route ${route.displayId}`)
        : text,
    analysis.recommendation.explanation,
  );
}
