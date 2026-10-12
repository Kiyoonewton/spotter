import type { TripAnalysis } from '@/services/api';

export function timingDescription(route: TripAnalysis['routes'][number] | undefined): string {
  if (route?.timing_method === 'here_span_interpolation')
    return 'Timing interpolates HERE road-span durations; driver breaks are not modeled.';
  if (route?.timing_method === 'distance_proportional_estimate')
    return 'Timing is a distance-proportional estimate; detailed provider timing is unavailable. Driver breaks are not modeled.';
  return 'Timing uses saved checkpoint arrival estimates; timing detail is unavailable. Driver breaks are not modeled.';
}
