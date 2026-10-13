import type { Route } from '../services/types';
export function routeText(text: string, routes: readonly Route[]): string {
  return [...routes].sort((a, b) => b.id.length - a.id.length).reduce((value, route) => {
    const label = `Route ${routes.findIndex(item => item.id === route.id) + 1}`;
    const escaped = route.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return value.replace(new RegExp(`(?:Route\\s+)?\\b${escaped}\\b`, 'g'), label);
  }, text);
}
