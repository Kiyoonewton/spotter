export type Risk = 'Low' | 'Moderate' | 'High' | 'Severe' | 'No Travel' | 'Unknown';
export type DemoState = 'results' | 'mobile' | 'loading' | 'missing' | 'blocked';
export type RouteId = 'A' | 'B' | 'C';

export const routes = [
  {
    id: 'A' as RouteId,
    name: 'Northern corridor',
    roads: 'I-90 · I-80 · I-76',
    miles: 468,
    minutes: 462,
    severe: 32,
    high: 54,
    average: 3.8,
  },
  {
    id: 'B' as RouteId,
    name: 'Central corridor',
    roads: 'I-80 · US-30 · I-76',
    miles: 482,
    minutes: 480,
    severe: 0,
    high: 22,
    average: 2.1,
  },
  {
    id: 'C' as RouteId,
    name: 'Southern corridor',
    roads: 'I-65 · I-70 · I-79',
    miles: 526,
    minutes: 522,
    severe: 0,
    high: 41,
    average: 2.6,
  },
];

export function rankRoutes(load: number) {
  return routes
    .map((route) => ({ ...route, high: route.high + (load < 20000 && route.id === 'B' ? 24 : 0) }))
    .sort(
      (a, b) =>
        a.severe - b.severe || a.high - b.high || a.average - b.average || a.minutes - b.minutes,
    );
}

export const checkpoints = [
  {
    city: 'Gary, IN',
    miles: 25,
    minutes: 31,
    x: 194,
    y: 228,
    wind: 12,
    rain: 0.02,
    snow: 0,
    risk: 'Low' as Risk,
    rule: 'Wind < 20 mph and rain < 0.10 in/hr: Low risk.',
  },
  {
    city: 'South Bend, IN',
    miles: 100,
    minutes: 114,
    x: 302,
    y: 249,
    wind: 24,
    rain: 0.14,
    snow: 0,
    risk: 'Moderate' as Risk,
    rule: 'Rain ≥ 0.10 in/hr triggers Moderate risk.',
  },
  {
    city: 'Fort Wayne, IN',
    miles: 175,
    minutes: 194,
    x: 413,
    y: 295,
    wind: 38,
    rain: 0.31,
    snow: 0,
    risk: 'High' as Risk,
    rule: 'Wind > 35 mph triggers High risk for this load.',
  },
  {
    city: 'Mansfield, OH',
    miles: 300,
    minutes: 309,
    x: 575,
    y: 319,
    wind: 18,
    rain: 0.12,
    snow: 0,
    risk: 'Moderate' as Risk,
    rule: 'Rain ≥ 0.10 in/hr triggers Moderate risk.',
  },
  {
    city: 'Youngstown, OH',
    miles: 425,
    minutes: 431,
    x: 734,
    y: 293,
    wind: 11,
    rain: 0.01,
    snow: 0,
    risk: 'Low' as Risk,
    rule: 'Wind < 20 mph and rain < 0.10 in/hr: Low risk.',
  },
];

export function tripTime(departure: string, minutes: number, zone = 'America/Chicago') {
  const date = new Date(`${departure}:00-05:00`);
  if (Number.isNaN(date.getTime())) return 'Timestamp unavailable';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: zone,
    timeZoneName: 'short',
  }).format(new Date(date.getTime() + minutes * 60000));
}
