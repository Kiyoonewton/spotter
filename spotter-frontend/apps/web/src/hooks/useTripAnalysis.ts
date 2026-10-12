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

function wallAt(instant: number, timezone: string) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(instant)
      .map(({ type, value }) => [type, value]),
  );
  return `${values['year']}-${values['month']}-${values['day']}T${values['hour']}:${values['minute']}:${values['second']}`;
}
function offsetAt(instant: number, timezone: string) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' })
      .formatToParts(instant)
      .map(({ type, value }) => [type, value]),
  );
  const match = values['timeZoneName']?.match(/GMT([+-])(\d{2}):?(\d{2})/);
  return match
    ? (match[1] === '+' ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3])) * 60000
    : 0;
}
export function localTimestamp(value: string, timezone: string) {
  if (!timezone) throw new Error('Select an origin with a valid IANA timezone.');
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Enter a valid departure time in ${timezone}.`);
  const wall = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00`;
  const naive = Date.parse(`${wall}Z`);
  const offsets = new Set(
    [-172800000, -86400000, 0, 86400000, 172800000].map((delta) =>
      offsetAt(naive + delta, timezone),
    ),
  );
  const candidates = [...offsets]
    .map((offset) => naive - offset)
    .filter((instant) => wallAt(instant, timezone) === wall);
  if (candidates.length === 0)
    throw new Error(
      `That departure time does not exist in ${timezone} because of daylight-saving time.`,
    );
  if (candidates.length > 1)
    throw new Error(`That departure time is ambiguous in ${timezone}; choose a different time.`);
  return new Date(candidates[0]!).toISOString();
}

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
