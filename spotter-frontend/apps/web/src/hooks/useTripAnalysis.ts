import { localTimestamp } from '@/lib/departure-time';
export { localTimestamp } from '@/lib/departure-time';
import { useSavedTripRestore } from './useSavedTripRestore';
import { rememberSnapshot, forgetSnapshot } from '@/services/saved-analyses';
import { useCallback, useRef, useState } from 'react';
import { createTripAnalysis, type LocationCandidate, type TripAnalysis } from '@/services/api';

export type AnalysisMode = 'demo' | 'live';
export type EditableTrip = {
  mode?: AnalysisMode;
  origin: string;
  destination: string;
  originCandidate?: LocationCandidate | null;
  destinationCandidate?: LocationCandidate | null;
  departure: string;
  timezone?: string;
  weight: string;
  spacing: string;
};
export type AppliedTrip = {
  mode: AnalysisMode;
  origin: string;
  destination: string;
  departure: string;
  timezone: string;
  resolvedDepartureAt: string;
  weight: number;
  spacing: number;
};
export type Result = {
  analysis: TripAnalysis | null;
  applied: AppliedTrip | null;
  selectedRouteId: string;
  checkpointIndex: number;
  pending: boolean;
  error: string;
  requestId: string | undefined;
  submit: (trip: EditableTrip, event?: React.FormEvent) => Promise<void>;
  selectRoute: (id: string) => void;
  setCheckpointIndex: (index: number) => void;
  reset: () => void;
};

export function useTripAnalysis(): Result {
  const [analysis, setAnalysis] = useState<TripAnalysis | null>(null);
  const [applied, setApplied] = useState<AppliedTrip | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [checkpointIndex, setCheckpointIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState<string | undefined>(undefined);
  const sequence = useRef(0);
  const pendingGuard = useRef(false);
  const reset = useCallback(() => {
    forgetSnapshot();
    sequence.current += 1;
    pendingGuard.current = false;
    setAnalysis(null);
    setApplied(null);
    setSelectedRouteId('');
    setCheckpointIndex(0);
    setPending(false);
    setError('');
    setRequestId(undefined);
  }, []);
  const selectRoute = useCallback((id: string) => {
    setSelectedRouteId(id);
    setCheckpointIndex(0);
  }, []);
  const submit = useCallback(async (trip: EditableTrip, event?: React.FormEvent) => {
    event?.preventDefault();
    if (pendingGuard.current) return;
    const id = ++sequence.current;
    const mode = trip.mode ?? 'demo';
    try {
      if (mode === 'live' && (!trip.originCandidate || !trip.destinationCandidate))
        throw new Error('Select an origin and destination from the search results.');
      const weight = Number(trip.weight);
      const spacing = Number(trip.spacing);
      if (!Number.isFinite(weight) || weight < 0)
        throw new Error('Enter a valid non-negative load weight.');
      const timezone = trip.timezone ?? '';
      const resolvedDepartureAt = localTimestamp(trip.departure, timezone);
      pendingGuard.current = true;
      setPending(true);
      setError('');
      setRequestId(undefined);
      const input = {
        mode,
        origin: trip.origin,
        destination: trip.destination,
        departure_at: resolvedDepartureAt,
        departure_timezone: timezone,
        load_weight_lb: weight,
        checkpoint_spacing_miles: spacing,
        ...(mode === 'live' && trip.originCandidate && trip.destinationCandidate
          ? {
              origin_coordinates: {
                lat: trip.originCandidate.latitude,
                lon: trip.originCandidate.longitude,
              },
              destination_coordinates: {
                lat: trip.destinationCandidate.latitude,
                lon: trip.destinationCandidate.longitude,
              },
            }
          : {}),
      };
      const result = await createTripAnalysis(input);
      if (id !== sequence.current) return;
      const fallback =
        result.routes.find((route) => route.eligibility === 'eligible') ?? result.routes[0];
      setAnalysis(result);
      forgetSnapshot();
      rememberSnapshot(result.snapshot?.token);
      setApplied({
        mode,
        origin: trip.origin,
        destination: trip.destination,
        departure: trip.departure,
        timezone,
        resolvedDepartureAt,
        weight,
        spacing,
      });
      setSelectedRouteId(result.recommendation.recommended_route_id ?? fallback?.id ?? '');
      setCheckpointIndex(0);
    } catch (requestError) {
      if (id === sequence.current) {
        const errorValue = requestError as Error & { requestId?: string };
        setError(errorValue.message);
        setRequestId(errorValue.requestId ?? undefined);
      }
    } finally {
      if (id === sequence.current) {
        pendingGuard.current = false;
        setPending(false);
      }
    }
  }, []);
  useSavedTripRestore(
    useCallback((saved, trip) => {
      if (sequence.current !== 0) return false;
      setAnalysis(saved);
      setApplied(trip);
      setSelectedRouteId(
        saved.recommendation.recommended_route_id ??
          saved.routes.find((route) => route.eligibility === 'eligible')?.id ??
          saved.routes[0]?.id ??
          '',
      );
      setCheckpointIndex(0);
      return true;
    }, []),
    useCallback((message) => {
      if (sequence.current === 0) setError(message);
    }, []),
  );
  return {
    analysis,
    applied,
    selectedRouteId,
    checkpointIndex,
    pending,
    error,
    requestId,
    submit,
    selectRoute,
    setCheckpointIndex,
    reset,
  };
}
