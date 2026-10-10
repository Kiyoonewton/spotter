import { useCallback, useRef, useState } from 'react';
import { createTripAnalysis, type TripAnalysis } from '@/services/api';
import type { RouteId } from '@/lib/dispatch-data';

export type EditableTrip = {
  origin: string;
  destination: string;
  departure: string;
  weight: string;
  spacing: string;
};
export type AppliedTrip = {
  origin: string;
  destination: string;
  departure: string;
  weight: number;
  spacing: number;
};
type Result = {
  analysis: TripAnalysis | null;
  applied: AppliedTrip;
  selectedRouteId: RouteId;
  checkpointIndex: number;
  pending: boolean;
  error: string;
  submit: (trip: EditableTrip, event?: React.FormEvent) => Promise<void>;
  selectRoute: (id: RouteId) => void;
  setCheckpointIndex: (index: number) => void;
};

const initialApplied: AppliedTrip = {
  origin: 'Chicago, IL',
  destination: 'Pittsburgh, PA',
  departure: '2026-10-10T10:00',
  weight: 42000,
  spacing: 25,
};

export function useTripAnalysis(): Result {
  const [analysis, setAnalysis] = useState<TripAnalysis | null>(null);
  const [applied, setApplied] = useState(initialApplied);
  const [selectedRouteId, setSelectedRouteId] = useState<RouteId>('B');
  const [checkpointIndex, setCheckpointIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const selectRoute = useCallback((id: RouteId) => {
    setSelectedRouteId(id);
    setCheckpointIndex(0);
  }, []);
  const submit = useCallback(async (trip: EditableTrip, event?: React.FormEvent) => {
    event?.preventDefault();
    if (
      !trip.origin.trim() ||
      !trip.destination.trim() ||
      !trip.departure ||
      Number(trip.weight) <= 0
    )
      throw new Error('Enter both locations, a departure time, and a positive load weight.');
    if (
      trip.origin.trim().toLowerCase() !== 'chicago, il' ||
      trip.destination.trim().toLowerCase() !== 'pittsburgh, pa'
    )
      throw new Error('This illustrative demo supports Chicago, IL to Pittsburgh, PA only.');
    const id = ++requestId.current;
    const nextApplied = {
      origin: trip.origin,
      destination: trip.destination,
      departure: trip.departure,
      weight: Number(trip.weight),
      spacing: Number(trip.spacing),
    };
    setApplied(nextApplied);
    setPending(true);
    setError('');
    try {
      const result = await createTripAnalysis({
        origin: nextApplied.origin,
        destination: nextApplied.destination,
        departure_at: new Date(nextApplied.departure).toISOString(),
        departure_timezone: 'America/Chicago',
        load_weight_lb: nextApplied.weight,
        checkpoint_spacing_miles: nextApplied.spacing,
      });
      if (id !== requestId.current) return;
      setAnalysis(result);
      const available = result.routes.find((route) => route.eligibility !== 'blocked');
      const recommended = result.recommendation.recommended_route_id as RouteId | null;
      setSelectedRouteId(recommended ?? available?.id ?? result.routes[0]?.id ?? 'A');
      setCheckpointIndex(0);
    } catch (requestError) {
      if (id === requestId.current)
        setError(requestError instanceof Error ? requestError.message : 'Trip analysis failed.');
    } finally {
      if (id === requestId.current) setPending(false);
    }
  }, []);
  return {
    analysis,
    applied,
    selectedRouteId,
    checkpointIndex,
    pending,
    error,
    submit,
    selectRoute,
    setCheckpointIndex,
  };
}
