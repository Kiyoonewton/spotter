import { apiUrl, type TripAnalysis } from './api';
type OriginalRoute = TripAnalysis['routes'][number];
export type ComparisonRoute = Pick<
  OriginalRoute,
  'id' | 'distance_miles' | 'duration_minutes' | 'risk_miles' | 'average_risk' | 'eligibility'
> & {
  arrival_at: string;
  forecast_coverage_percent: number;
  checkpoints: Pick<
    OriginalRoute['checkpoints'][number],
    'id' | 'route_id' | 'arrival_at' | 'risk' | 'weather' | 'reasons'
  >[];
  segment_risks: { id: string; risk: string }[];
};
export type DepartureWindow = {
  offset_hours: number;
  departure_at: string;
  routes: ComparisonRoute[];
  recommended_route_id: string | null;
};
export type DepartureComparison = {
  source_analysis_id: string;
  data_source: 'demo' | 'live';
  computed_at: string;
  retrieved_at: string | null;
  windows: DepartureWindow[];
  notice: string;
  forecast_notice: string;
  ranking_policy: string;
  best_choice: {
    offset_hours: number;
    route_id: string;
    arrival_at: string;
    arrival_delay_minutes: number | null;
    severe_miles_reduction: number | null;
    high_miles_reduction: number | null;
    average_risk_reduction: number | null;
  } | null;
};
export async function fetchDepartureComparison(
  analysis: TripAnalysis,
  signal: AbortSignal,
): Promise<DepartureComparison> {
  const response = await fetch(apiUrl('/departure-comparisons/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: analysis.snapshot?.token }),
    signal,
    cache: 'no-store',
  });
  if (!response.ok)
    throw new Error(
      'Departure comparison is unavailable. Your original analysis remains available.',
    );
  const result = (await response.json()) as DepartureComparison;
  if (
    result.source_analysis_id !== analysis.analysis_id ||
    !Array.isArray(result.windows) ||
    result.windows.length !== 4 ||
    result.windows.some((window, index) => window.offset_hours !== index * 2)
  )
    throw new Error('The comparison did not match this saved analysis.');
  for (const window of result.windows) {
    const preview = scenarioAnalysis(analysis, window);
    if (
      window.routes.length !== analysis.routes.length ||
      !Number.isFinite(Date.parse(window.departure_at)) ||
      preview.routes.some((route) =>
        route.checkpoints.some((point) => !Number.isFinite(Date.parse(point.arrival_at))),
      )
    )
      throw new Error('The comparison returned an invalid route window.');
    if (
      window.recommended_route_id !== null &&
      !window.routes.some(
        (route) => route.id === window.recommended_route_id && route.eligibility === 'eligible',
      )
    )
      throw new Error('The comparison returned an invalid recommendation.');
  }
  if (
    result.best_choice !== null &&
    !result.windows.some(
      (window) =>
        window.offset_hours === result.best_choice?.offset_hours &&
        window.routes.some(
          (route) => route.id === result.best_choice?.route_id && route.eligibility === 'eligible',
        ),
    )
  )
    throw new Error('The comparison returned an invalid best option.');
  return result;
}
export function scenarioAnalysis(original: TripAnalysis, window: DepartureWindow): TripAnalysis {
  const { snapshot: _snapshot, ...base } = original;
  return {
    ...base,
    analysis_id: `${original.analysis_id}:departure:${window.offset_hours}`,
    ...(original.applied_request
      ? { applied_request: { ...original.applied_request, departure_at: window.departure_at } }
      : {}),
    routes: original.routes.map((route) => {
      const scenario = window.routes.find((candidate) => candidate.id === route.id);
      if (!scenario) throw new Error('Missing route-owned scenario.');
      return {
        ...route,
        ...scenario,
        checkpoints: route.checkpoints.map((point) => {
          const update = scenario.checkpoints.find(
            (candidate) => candidate.id === point.id && candidate.route_id === route.id,
          );
          if (!update) throw new Error('Missing route-owned checkpoint.');
          return { ...point, ...update };
        }),
        segments: (route.segments ?? []).map((segment) => {
          const update = scenario.segment_risks.find((candidate) => candidate.id === segment.id);
          if (!update) throw new Error('Missing route-owned segment.');
          return { ...segment, risk: update.risk, route_id: route.id };
        }),
      };
    }),
    recommendation: {
      status: window.recommended_route_id ? 'recommended' : 'unavailable',
      recommended_route_id: window.recommended_route_id,
      explanation: window.recommended_route_id
        ? 'Best eligible route within this weather-only departure window.'
        : 'No eligible route within this departure window.',
    },
  };
}
