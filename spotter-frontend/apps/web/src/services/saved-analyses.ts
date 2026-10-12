import { apiUrl, type TripAnalysis } from './api';
const key = 'waycast.saved-analysis';
export function rememberSnapshot(token?: string) {
  try {
    if (token) sessionStorage.setItem(key, token);
    else sessionStorage.removeItem(key);
  } catch {
    /* Storage can be unavailable; share links still work. */
  }
}
export function savedToken(): string | null {
  const shared = new URLSearchParams(window.location.hash.slice(1)).get('analysis');
  if (shared !== null) return shared;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
export function forgetSnapshot() {
  rememberSnapshot();
  if (new URLSearchParams(window.location.hash.slice(1)).has('analysis'))
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
}
export async function restoreSnapshot(token: string, signal: AbortSignal): Promise<TripAnalysis> {
  const response = await fetch(apiUrl('/saved-analyses/restore/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
    signal,
    cache: 'no-store',
  });
  if (!response.ok)
    throw new Error('This saved analysis is unavailable or expired. Plan a new trip.');
  const result = (await response.json()) as TripAnalysis;
  if (
    !result.snapshot ||
    !result.applied_request ||
    !Array.isArray(result.routes) ||
    !result.routes.length ||
    !result.recommendation
  )
    throw new Error('The saved analysis could not be restored. Plan a new trip.');
  return { ...result, snapshot: { ...result.snapshot, restored: true } };
}
