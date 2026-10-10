import type { CorridorForecast, ForecastPoint } from '../../src/services/corridor-forecast';

export function corridorFixture(points: ForecastPoint[], startAt: string): CorridorForecast {
  return {
    data_source: 'live',
    provider: 'open-meteo',
    start_at: startAt,
    retrieved_at: '2026-10-10T13:00:00Z',
    cache_ttl_seconds: 300,
    units: { wind: 'mph', rain: 'in/hr', snow: 'in/hr' },
    points,
    frames: Array.from({ length: 49 }, (_, hour) => {
      const validAt = new Date(new Date(startAt).getTime() + hour * 3600000).toISOString();
      const end = new Date(new Date(validAt).getTime() + 3600000).toISOString();
      return {
        hour,
        valid_at: validAt,
        samples: points.map((point) => ({
          id: point.id,
          route_id: point.route_id,
          risk: hour === 1 ? 'No Travel' : 'Low',
          risks: { wind: hour === 1 ? 'No Travel' : 'Low', rain: 'Low', snow: 'Unknown' },
          weather: {
            wind_mph: hour === 1 ? 60 : 10,
            rain_in_hr: 0.01,
            snow_in_hr: null,
            wind_valid_at: validAt,
            interval_start: validAt,
            interval_end: end,
          },
        })),
      };
    }),
  };
}
