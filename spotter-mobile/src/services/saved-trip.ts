import type { SavedTrip, TripAnalysis } from './types';
const origin = 'https://spotter.kiyoo.online';
export const restoreEndpoint = `${origin}/api/saved-analyses/restore/`;
const unavailable = 'This saved trip is unavailable or expired. Create a new trip on the website.';
export function readToken(input: string): string {
  const value = input.trim();
  if (/^[a-f0-9]{64}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.origin !== origin || url.username || url.password || url.search)
      throw new Error();
    const tokens = new URLSearchParams(url.hash.slice(1)).getAll('analysis');
    if (tokens.length === 1 && /^[a-f0-9]{64}$/.test(tokens[0])) return tokens[0];
  } catch { /* Do not reflect private input in an error. */ }
  throw new Error('Paste a saved-trip link from spotter.kiyoo.online or its 64-character token.');
}
const object = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null;
const text = (x: unknown): x is string => typeof x === 'string';
const number = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const date = (x: unknown) => text(x) && Number.isFinite(Date.parse(x));
export function isTripAnalysis(x: unknown): x is TripAnalysis {
  if (!object(x) || !text(x.analysis_id) || !['demo', 'live'].includes(String(x.data_source)) ||
      (x.snapshot !== undefined && (!object(x.snapshot) || !date(x.snapshot.created_at) || !date(x.snapshot.expires_at))) ||
      !object(x.applied_request) || !text(x.applied_request.origin) ||
      !text(x.applied_request.destination) || !text(x.applied_request.departure_timezone) ||
      !date(x.applied_request.departure_at) || !number(x.applied_request.load_weight_lb) ||
      !object(x.recommendation) || !text(x.recommendation.status) ||
      !text(x.recommendation.explanation) ||
      !(x.recommendation.recommended_route_id === null || text(x.recommendation.recommended_route_id)) ||
      !Array.isArray(x.routes) || x.routes.length < 1 || x.routes.length > 3) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: x.applied_request.departure_timezone }); }
  catch { return false; }
  const ids = new Set<string>();
  for (const route of x.routes) {
    if (!object(route) || !text(route.id) || ids.has(route.id) || !text(route.name) ||
        !number(route.distance_miles) || !number(route.duration_minutes) ||
        !text(route.eligibility) || !(route.average_risk === null || number(route.average_risk)) ||
        !object(route.risk_miles) || !Array.isArray(route.checkpoints) ||
        route.checkpoints.length < 1 || route.checkpoints.length > 200 ||
        (route.routing_notice != null && !text(route.routing_notice)) ||
        (route.timing_notice !== undefined && !text(route.timing_notice))) return false;
    ids.add(route.id);
    const checkpoints = new Set<string>();
    for (const point of route.checkpoints) {
      if (!object(point) || !text(point.id) || checkpoints.has(point.id) || point.route_id !== route.id ||
          !number(point.distance_from_origin_miles) || !date(point.arrival_at) || !text(point.risk) ||
          !Array.isArray(point.reasons) || !point.reasons.every(r => object(r) && text(r.explanation))) return false;
      checkpoints.add(point.id);
      const weather = point.weather;
      if (weather !== null && (!object(weather) ||
          !['wind_mph', 'rain_in_hr', 'snow_in_hr'].every(key =>
            weather[key] === null || number(weather[key])))) return false;
    }
  }
  const recommended = x.recommendation.recommended_route_id;
  return (recommended === null || ids.has(recommended)) &&
    (x.routing_profile_notice === undefined || text(x.routing_profile_notice));
}
export function isSavedTrip(x: unknown): x is SavedTrip {
  return isTripAnalysis(x) && x.snapshot !== undefined;
}
export async function restoreTrip(input: string, signal: AbortSignal): Promise<SavedTrip> {
  const token = readToken(input);
  const response = await fetch(restoreEndpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }), signal, redirect: 'error',
  });
  if (!response.ok) throw new Error(unavailable);
  const result: unknown = await response.json();
  if (!isSavedTrip(result)) throw new Error('The saved trip response could not be read. Try a new saved link.');
  return result;
}
