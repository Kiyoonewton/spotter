import { useEffect, useRef, useState } from 'react';
import type { TripAnalysis } from '@/services/api';
import {
  fetchDepartureComparison,
  type DepartureComparison,
} from '@/services/departure-comparison';
export function useDepartureComparison(analysis: TripAnalysis) {
  const [data, setData] = useState<DepartureComparison | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    setData(null);
    setPending(false);
    setError('');
    return () => request.current?.abort();
  }, [analysis.analysis_id]);
  const compare = async () => {
    if (request.current && !request.current.signal.aborted) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError('');
    try {
      const result = await fetchDepartureComparison(analysis, controller.signal);
      if (!controller.signal.aborted) setData(result);
    } catch {
      if (!controller.signal.aborted)
        setError('Departure comparison is unavailable. Your original analysis remains available.');
    } finally {
      if (!controller.signal.aborted) {
        setPending(false);
        request.current = null;
      }
    }
  };
  return { data, pending, error, compare };
}
