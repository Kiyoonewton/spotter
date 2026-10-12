import { useEffect, useRef, useState } from 'react';
import { journeyHorizon } from '@/lib/journey-horizon';
import { validCoordinate } from '@/lib/geographic-map';
import type { TripAnalysis } from '@/services/api';
import { fetchCorridorForecast, type CorridorForecast } from '@/services/corridor-forecast';

export function useCorridorForecast(analysis: TripAnalysis, startAt: string, load: number) {
  const [data, setData] = useState<CorridorForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const sequence = useRef(0);
  useEffect(() => {
    const id = ++sequence.current;
    const controller = new AbortController();
    const points = analysis.routes.flatMap((route) =>
      route.checkpoints
        .filter((point) => point.route_id === route.id && validCoordinate(point.coordinates))
        .map((point) => ({ id: point.id, route_id: route.id, coordinates: point.coordinates! })),
    );
    setData(null);
    setError('');
    setLoading(true);
    if (!points.length) {
      setLoading(false);
      setError('No geographic forecast points are available.');
      return () => controller.abort();
    }
    void fetchCorridorForecast(
      points,
      startAt,
      load,
      controller.signal,
      journeyHorizon(analysis.routes),
    )
      .then((result) => {
        if (id === sequence.current && !controller.signal.aborted) setData(result);
      })
      .catch(() => {
        if (id === sequence.current && !controller.signal.aborted)
          setError(
            'Corridor forecast is temporarily unavailable. Arrival-time analysis remains available.',
          );
      })
      .finally(() => {
        if (id === sequence.current && !controller.signal.aborted) setLoading(false);
      });
    return () => {
      sequence.current += 1;
      controller.abort();
    };
  }, [analysis, startAt, load, revision]);
  return { data, loading, error, retry: () => setRevision((value) => value + 1) };
}
