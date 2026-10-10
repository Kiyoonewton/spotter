import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CorridorForecastOverlay } from './CorridorForecastOverlay';
import { route } from '@/tests/fixtures/geographic-route';
import type { ForecastFrame } from '@/services/corridor-forecast';

const frame: ForecastFrame = {
  hour: 1,
  valid_at: '2026-10-11T01:00:00Z',
  samples: [
    {
      id: 'start',
      route_id: route.id,
      risk: 'Unknown',
      risks: { wind: 'High', rain: 'Low', snow: 'Unknown' },
      weather: {
        wind_mph: 38,
        rain_in_hr: 0,
        snow_in_hr: null,
        wind_valid_at: '2026-10-11T01:00:00Z',
        interval_start: '2026-10-11T01:00:00Z',
        interval_end: '2026-10-11T02:00:00Z',
      },
    },
  ],
};
describe('CorridorForecastOverlay', () => {
  it('displays known variables independently and leaves missing snow dashed', () => {
    const { rerender } = render(
      <svg>
        <CorridorForecastOverlay
          routes={[route]}
          selected={route.id}
          frame={frame}
          variable="wind"
          opacity={50}
          project={() => ({ x: 20, y: 20 })}
        />
      </svg>,
    );
    expect(screen.getByTestId('forecast-arbitrary-route-start')).toHaveAttribute(
      'data-value',
      '38',
    );
    expect(screen.getByTestId('forecast-arbitrary-route-start')).toHaveAttribute('fill', '#dc7629');
    rerender(
      <svg>
        <CorridorForecastOverlay
          routes={[route]}
          selected={route.id}
          frame={frame}
          variable="snow"
          opacity={50}
          project={() => ({ x: 20, y: 20 })}
        />
      </svg>,
    );
    expect(screen.getByTestId('forecast-arbitrary-route-start')).toHaveAttribute(
      'data-value',
      'missing',
    );
    expect(screen.getByTestId('forecast-arbitrary-route-start')).toHaveAttribute(
      'stroke-dasharray',
      '4 4',
    );
    expect(route.risk_miles).toEqual({ Unknown: 25 });
  });

  it('does not draw foreign or unrecognized point IDs', () => {
    render(
      <svg>
        <CorridorForecastOverlay
          routes={[route]}
          selected={route.id}
          frame={{
            ...frame,
            samples: frame.samples.map((sample) => ({ ...sample, route_id: 'other' })),
          }}
          variable="wind"
          opacity={50}
          project={() => ({ x: 20, y: 20 })}
        />
      </svg>,
    );
    expect(screen.queryByTestId('forecast-other-start')).not.toBeInTheDocument();
  });
});
