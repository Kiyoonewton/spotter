import { useEffect, useRef, useState } from 'react';
import { readToken, restoreTrip } from '../services/saved-trip';
import { analyzeTrip, buildRequest, type Draft } from '../services/trip-planning';
import type { TripAnalysis } from '../services/types';
export function useSavedTrip() {
  const [trip, setTrip] = useState<TripAnalysis | null>(null);
  const [resultVersion, setResultVersion] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current++; active.current?.abort(); }, []);
  function clear() {
    sequence.current++; active.current?.abort(); active.current = null;
    setTrip(null); setError(''); setPending(false);
  }
  async function run(operation: (signal: AbortSignal) => Promise<TripAnalysis>, message: string, duration: number) {
    if (active.current) return;
    const controller = new AbortController();
    const id = ++sequence.current;
    active.current = controller; setPending(true); setError('');
    const timeout = setTimeout(() => controller.abort(), duration);
    try {
      const result = await operation(controller.signal);
      if (sequence.current === id) { setTrip(result); setResultVersion(value => value + 1); }
    } catch {
      if (sequence.current === id) setError(message);
    } finally {
      clearTimeout(timeout);
      if (sequence.current === id) { active.current = null; setPending(false); }
    }
  }
  async function open(input: string) {
    if (active.current) return;
    try { readToken(input); }
    catch { setError('Enter a valid Spotter saved-trip link.'); return; }
    await run(signal => restoreTrip(input, signal), 'Could not open the saved trip. Check your connection or create a new saved link.', 15000);
  }
  async function analyze(draft: Draft) {
    if (active.current) return;
    let request;
    try { request = buildRequest(draft); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Check the trip inputs.'); return; }
    await run(signal => analyzeTrip(request, signal), 'Trip analysis failed. Check your connection and inputs, then retry. Previous results remain unchanged.', 60000);
  }
  return { trip, resultVersion, pending, error, open, analyze, clear };
}
