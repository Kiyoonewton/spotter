import { useEffect, useState } from 'react';
import { searchLocations, type Location, type Mode } from '../services/trip-planning';
export function useLocationSearch(query: string, mode: Mode, enabled: boolean) {
  const key = `${mode}:${query.trim()}`;
  const valid = enabled && query.trim().length >= 2 && query.trim().length <= 120;
  const [state, setState] = useState<{ key: string; results: Location[]; pending: boolean; error: string }>({ key: '', results: [], pending: false, error: '' });
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    if (!valid) return;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      setState({ key, results: [], pending: true, error: '' });
      deadline = setTimeout(() => controller.abort(), 10000);
      void searchLocations(query.trim(), mode, controller.signal).then(results => {
        if (active) setState({ key, results, pending: false, error: '' });
      }).catch(() => {
        if (active) setState({ key, results: [], pending: false, error: 'Location search is unavailable. Try again.' });
      }).finally(() => clearTimeout(deadline));
    }, 350);
    return () => { active = false; clearTimeout(timer); clearTimeout(deadline); controller.abort(); };
  }, [key, query, mode, valid]);
  if (!valid) return { results: [], pending: false, error: '' };
  if (state.key !== key) return { results: [], pending: true, error: '' };
  return state;
}
