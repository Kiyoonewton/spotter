import { localTimestamp } from '../lib/departure-time';
import { isTripAnalysis } from './saved-trip';
import type { TripAnalysis } from './types';
import { readTruckProfile, type TruckProfileDraft, type TruckProfile } from './truck-profile';
const base = 'https://spotter.kiyoo.online/api';
export type Mode = 'demo' | 'live';
export type Location = { provider_id: string; label: string; latitude: number; longitude: number; timezone: string | null };
export type Draft = {
  mode: Mode; origin: Location | null; destination: Location | null;
  departure: string; timezone: string; cargo: string; spacing: '10' | '25' | '50';
  truck: TruckProfileDraft | null;
};
export type AnalysisRequest = {
  mode: Mode; origin: string; destination: string; departure_at: string;
  departure_timezone: string; load_weight_lb: number; checkpoint_spacing_miles: number;
  origin_coordinates?: { lat: number; lon: number };
  destination_coordinates?: { lat: number; lon: number };
  truck_profile?: TruckProfile; save_snapshot: true;
};
export function buildRequest(draft: Draft): AnalysisRequest {
  if (!draft.origin || !draft.destination) throw new Error('Select both locations from the search results.');
  const cargo = Number(draft.cargo);
  if (!draft.cargo.trim() || !Number.isFinite(cargo) || cargo < 0)
    throw new Error('Enter a finite, non-negative cargo weight.');
  if (!['10', '25', '50'].includes(draft.spacing)) throw new Error('Choose 10, 25 or 50 miles.');
  const departure = localTimestamp(draft.departure, draft.timezone.trim());
  if (draft.mode === 'live' && Date.parse(departure) <= Date.now())
    throw new Error('Choose a future departure for live forecast analysis.');
  if (draft.mode === 'demo' && (draft.origin.label !== 'Chicago, IL' || draft.destination.label !== 'Pittsburgh, PA'))
    throw new Error('Demo supports Chicago, IL to Pittsburgh, PA.');
  const request: AnalysisRequest = {
    mode: draft.mode, origin: draft.origin.label, destination: draft.destination.label,
    departure_at: departure, departure_timezone: draft.timezone.trim(),
    load_weight_lb: cargo, checkpoint_spacing_miles: Number(draft.spacing), save_snapshot: true,
  };
  if (draft.mode === 'live') {
    request.origin_coordinates = { lat: draft.origin.latitude, lon: draft.origin.longitude };
    request.destination_coordinates = { lat: draft.destination.latitude, lon: draft.destination.longitude };
    if (draft.truck) request.truck_profile = readTruckProfile(draft.truck, cargo);
  }
  return request;
}
export async function searchLocations(query: string, mode: Mode, signal: AbortSignal): Promise<Location[]> {
  const response = await fetch(`${base}/locations/?q=${encodeURIComponent(query)}&mode=${mode}`, { signal });
  if (!response.ok) throw new Error('Location search is temporarily unavailable.');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('results' in data) || !Array.isArray(data.results))
    throw new Error('Location search returned an invalid response.');
  const results = data.results.slice(0, 5);
  for (const x of results) {
    if (!x || typeof x.provider_id !== 'string' || typeof x.label !== 'string' ||
      typeof x.latitude !== 'number' || !Number.isFinite(x.latitude) || Math.abs(x.latitude) > 90 ||
      typeof x.longitude !== 'number' || !Number.isFinite(x.longitude) || Math.abs(x.longitude) > 180 ||
      !(x.timezone === null || typeof x.timezone === 'string')) throw new Error('Invalid location candidate.');
  }
  return results;
}
export async function analyzeTrip(request: AnalysisRequest, signal: AbortSignal): Promise<TripAnalysis> {
  const response = await fetch(`${base}/trip-analyses/`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal,
  });
  if (!response.ok) throw new Error('Trip analysis is unavailable. Check your inputs and try again.');
  const result: unknown = await response.json();
  if (!isTripAnalysis(result) || result.data_source !== request.mode) throw new Error('The analysis response could not be read.');
  return result;
}
