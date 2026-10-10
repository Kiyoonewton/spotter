import type { RouteView } from '@/components/RouteCard';

function compareEligible(a: RouteView, b: RouteView) {
  return (
    a.severe - b.severe ||
    a.high - b.high ||
    (a.average ?? Number.POSITIVE_INFINITY) - (b.average ?? Number.POSITIVE_INFINITY) ||
    a.minutes - b.minutes ||
    a.id.localeCompare(b.id)
  );
}

export function rankRoutes(routes: RouteView[]) {
  const eligible = routes.filter((route) => route.eligibility === 'eligible').sort(compareEligible);
  return [...eligible, ...routes.filter((route) => route.eligibility !== 'eligible')];
}
