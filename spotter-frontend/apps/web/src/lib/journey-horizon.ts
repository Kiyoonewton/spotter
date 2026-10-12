/** Shared preview window, independent of the selected route. */
export function journeyHorizon(routes: readonly { duration_minutes: number }[]): number {
  const longest = Math.max(
    0,
    ...routes.map((route) =>
      Number.isFinite(route.duration_minutes) && route.duration_minutes > 0
        ? route.duration_minutes
        : 0,
    ),
  );
  return Math.max(1, Math.ceil(longest / 60));
}

export function forecastTicks(hours: number): number[] {
  return [...new Set([0, ...[1, 2, 3].map((part) => Math.round((hours * part) / 4)), hours])];
}
