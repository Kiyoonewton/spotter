import { useEffect, useRef, useState } from 'react';
import { readToken, restoreTrip } from '../services/saved-trip';
import type { SavedTrip } from '../services/types';
export function useSavedTrip() {
  const [trip, setTrip] = useState<SavedTrip | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current++; active.current?.abort(); }, []);
  function clear() {
    sequence.current++; active.current?.abort(); active.current = null;
    setTrip(null); setError(''); setPending(false);
  }
  async function open(input: string) {
    if (active.current) return;
    try { readToken(input); }
    catch { setError('Enter a valid Spotter saved-trip link.'); return; }
    const controller = new AbortController();
    const id = ++sequence.current;
    active.current = controller; setPending(true); setError('');
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const result = await restoreTrip(input, controller.signal);
      if (sequence.current === id) setTrip(result);
    } catch {
      if (sequence.current === id) setError('Could not open the saved trip. Check your connection or create a new saved link.');
    } finally {
      clearTimeout(timeout);
      if (sequence.current === id) { active.current = null; setPending(false); }
    }
  }
  return { trip, pending, error, open, clear };
}
