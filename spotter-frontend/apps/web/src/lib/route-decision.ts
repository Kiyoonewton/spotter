import type { RouteView } from '@/components/RouteCard';
import { rankRoutes } from './route-ranking';

export const decisionCriteria = [
  { key: 'severe', label: 'Severe miles', unit: 'mi' },
  { key: 'high', label: 'High miles', unit: 'mi' },
  { key: 'average', label: 'Average risk', unit: '/ 5' },
  { key: 'minutes', label: 'Travel time', unit: 'min' },
] as const;
export type DecisionKey = (typeof decisionCriteria)[number]['key'];

/** Explain the returned winner; never create a replacement recommendation. */
export function explainRouteDecision(routes: RouteView[], recommended: string | null) {
  const eligible = rankRoutes(routes).filter((route) => route.eligibility === 'eligible');
  const winner = eligible.find((route) => route.id === recommended);
  if (!winner) return null;
  const fastest = [...eligible].sort(
    (a, b) => a.minutes - b.minutes || a.id.localeCompare(b.id),
  )[0];
  const runnerUp = eligible.find((route) => route.id !== winner.id);
  const consistent = eligible[0]?.id === winner.id;
  const deciding =
    consistent && runnerUp
      ? (decisionCriteria.find(
          ({ key }) =>
            (winner[key] ?? Number.POSITIVE_INFINITY) !==
            (runnerUp[key] ?? Number.POSITIVE_INFINITY),
        )?.key ?? null)
      : null;
  return {
    winner,
    runnerUp,
    fastest,
    deciding,
    consistent,
    extraMinutes: fastest ? winner.minutes - fastest.minutes : 0,
    distanceDifference: fastest ? winner.miles - fastest.miles : 0,
  };
}
