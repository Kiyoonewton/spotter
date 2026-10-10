import { useEffect, useRef, useState } from 'react';
import { searchLocations, type LocationCandidate } from '@/services/api';
import type { AnalysisMode } from './useTripAnalysis';

export function useLocationSearch(mode: AnalysisMode, value: string) {
  const [options, setOptions] = useState<LocationCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setOptions([]);
      setLoading(false);
      setError('');
      return;
    }
    const id = ++sequence.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const result = await searchLocations(query, mode);
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
    return () => window.clearTimeout(timer);
  }, [mode, value]);
  return { options, loading, error };
}
