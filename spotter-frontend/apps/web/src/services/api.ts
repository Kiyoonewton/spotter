import { env } from '../env';

export const API_BASE_URL = env.VITE_API_BASE_URL;

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
