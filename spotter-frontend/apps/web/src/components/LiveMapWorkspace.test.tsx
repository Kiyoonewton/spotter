import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveMapWorkspace } from './LiveMapWorkspace';
import * as hook from '@/hooks/useCorridorForecast';
import { route } from '@/tests/fixtures/geographic-route';
import { corridorFixture } from '../../tests/fixtures/corridor-forecast';
import type { TripAnalysis } from '@/services/api';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
describe('LiveMapWorkspace', () => {
  it('selects weather time manually without changing analysis or route ownership', () => {
    vi.useFakeTimers();
    const analysis: TripAnalysis = {
      analysis_id: 'immutable',
      data_source: 'live',
      routes: [route],
      recommendation: { status: 'unavailable', recommended_route_id: null, explanation: 'Missing' },
    };
    const before = JSON.stringify(analysis);
    const data = corridorFixture(
      [
        { id: 'start', route_id: route.id, coordinates: { lat: 40, lon: -74 } },
        { id: 'end', route_id: route.id, coordinates: { lat: 41, lon: -72 } },
      ],
      '2026-10-11T00:00:00Z',
    );
    vi.spyOn(hook, 'useCorridorForecast').mockReturnValue({
      data,
      loading: false,
      error: '',
      retry: vi.fn(),
    });
    const onRoute = vi.fn();
    const onCheckpoint = vi.fn();
    render(
      <LiveMapWorkspace
        analysis={analysis}
        selected={route.id}
        checkpoint={0}
        startAt="2026-10-11T00:00:00Z"
        timezone="America/New_York"
        load={30000}
        onRoute={onRoute}
        onCheckpoint={onCheckpoint}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Play forecast' })).not.toBeInTheDocument();
    fireEvent.change(
      screen.getByRole('slider', { name: 'Corridor forecast hours after departure' }),
      { target: { value: '1' } },
    );
    expect(screen.getByTestId('forecast-arbitrary-route-start')).toHaveAttribute(
      'data-value',
      '60',
    );
    act(() => vi.advanceTimersByTime(1800));
    expect(screen.getByTestId('forecast-arbitrary-route-start')).toHaveAttribute('data-hour', '1');
    expect(JSON.stringify(analysis)).toBe(before);
    expect(onRoute).not.toHaveBeenCalled();
    expect(onCheckpoint).not.toHaveBeenCalled();
    expect(screen.getByText(/America\/New_York/)).toBeVisible();
  });
});
