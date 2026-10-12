import { useEffect, useState } from 'react';
import type { LocationCandidate, TripAnalysis } from '@/services/api';
import type { AnalysisMode } from './useTripAnalysis';
const demoOrigin: LocationCandidate = {
  provider_id: 'demo:chicago',
  label: 'Chicago, IL',
  latitude: 41.8781,
  longitude: -87.6298,
  timezone: 'America/Chicago',
};
const demoDestination: LocationCandidate = {
  provider_id: 'demo:pittsburgh',
  label: 'Pittsburgh, PA',
  latitude: 40.4406,
  longitude: -79.9959,
  timezone: 'America/New_York',
};

export function useTripDraft(analysis: TripAnalysis | null) {
  const [mode, setMode] = useState<AnalysisMode>('demo');
  const [origin, setOrigin] = useState(demoOrigin.label);
  const [destination, setDestination] = useState(demoDestination.label);
  const [originCandidate, setOriginCandidate] = useState<LocationCandidate | null>(demoOrigin);
  const [destinationCandidate, setDestinationCandidate] = useState<LocationCandidate | null>(
    demoDestination,
  );
  const [departure, setDeparture] = useState('2026-10-10T10:00');
  const [weight, setWeight] = useState('42000');
  const [spacing, setSpacing] = useState('25');
  useEffect(() => {
    const input = analysis?.applied_request;
    if (!analysis?.snapshot?.restored || !input) return;
    setMode(analysis.data_source);
    setOrigin(input.origin);
    setDestination(input.destination);
    const candidate = (
      label: string,
      coordinates: { lat: number; lon: number } | undefined,
      origin: boolean,
    ): LocationCandidate | null =>
      coordinates
        ? {
            provider_id: origin ? 'saved-origin' : 'saved-destination',
            label,
            latitude: coordinates.lat,
            longitude: coordinates.lon,
            timezone: origin ? input.departure_timezone : null,
          }
        : analysis.data_source === 'demo'
          ? origin
            ? demoOrigin
            : demoDestination
          : null;
    setOriginCandidate(candidate(input.origin, input.origin_coordinates, true));
    setDestinationCandidate(candidate(input.destination, input.destination_coordinates, false));
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
    setDeparture(
      `${parts['year']}-${parts['month']}-${parts['day']}T${parts['hour']}:${parts['minute']}`,
    );
    setWeight(String(input.load_weight_lb));
    setSpacing(String(input.checkpoint_spacing_miles));
  }, [analysis]);
  return {
    mode,
    setMode,
    origin,
    setOrigin,
    destination,
    setDestination,
    originCandidate,
    setOriginCandidate,
    destinationCandidate,
    setDestinationCandidate,
    departure,
    setDeparture,
    weight,
    setWeight,
    spacing,
    setSpacing,
  };
}
