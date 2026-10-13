import { useEffect, useRef, useState } from 'react';
import { searchLocations, type LocationCandidate } from '@/services/api';
import type { AnalysisMode } from './useTripAnalysis';

export function useLocationSearch(mode: AnalysisMode, value: string, enabled = true) {
  const [options, setOptions] = useState<LocationCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  useEffect(() => {
    sequence.current += 1;
    const requestSequence = sequence.current;
    const controller = new AbortController();
    const query = value.trim();
    if (!enabled) {
      setOptions([]);
      setLoading(false);
      setError('');
      return () => controller.abort();
    }
    if (query.length < 2) {
      setOptions([]);
      setLoading(false);
      setError('');
      return;
    }
    const id = requestSequence;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const result = await searchLocations(query, mode, controller.signal);
        if (id === sequence.current) setOptions(result);
      } catch (requestError) {
        if (id === sequence.current) {
          setOptions([]);
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Location search is temporarily unavailable.',
          );
        }
      } finally {
        if (id === sequence.current) setLoading(false);
      }
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      sequence.current += 1;
    };
  }, [enabled, mode, value]);
  return { options, loading, error };
}
