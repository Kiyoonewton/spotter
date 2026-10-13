import { useEffect } from 'react';
import { rememberSnapshot, restoreSnapshot, savedToken } from '@/services/saved-analyses';
import type { TripAnalysis } from '@/services/api';
import type { AppliedTrip } from './useTripAnalysis';

export function useSavedTripRestore(
  onRestore: (analysis: TripAnalysis, applied: AppliedTrip) => boolean,
  onError: (message: string) => void,
) {
  useEffect(() => {
    const token = savedToken();
    if (!token) return;
    const controller = new AbortController();
    void restoreSnapshot(token, controller.signal)
      .then((analysis) => {
        if (controller.signal.aborted) return;
        const input = analysis.applied_request!;
        const parts = Object.fromEntries(
          new Intl.DateTimeFormat('en-CA', {
            timeZone: input.departure_timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
          })
            .formatToParts(new Date(input.departure_at))
            .map(({ type, value }) => [type, value]),
        );
        const accepted = onRestore(analysis, {
          mode: analysis.data_source,
          origin: input.origin,
          destination: input.destination,
          departure: `${parts['year']}-${parts['month']}-${parts['day']}T${parts['hour']}:${parts['minute']}`,
          timezone: input.departure_timezone,
          resolvedDepartureAt: input.departure_at,
          weight: input.load_weight_lb,
          spacing: input.checkpoint_spacing_miles,
        });
        if (accepted) rememberSnapshot(analysis.snapshot?.token);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          onError('This saved analysis is unavailable or expired. Plan a new trip.');
      });
    return () => controller.abort();
  }, [onRestore, onError]);
}
