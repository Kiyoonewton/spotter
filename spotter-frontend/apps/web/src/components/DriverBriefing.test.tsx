import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DriverBriefing } from './DriverBriefing';
import { liveMapAnalysis } from '../../tests/fixtures/live-map-analysis';

describe('driver briefing', () => {
  it('preserves selected route ownership, unavailable measurements and recommendation status', () => {
    const before = JSON.stringify(liveMapAnalysis);
    const analysis = {
      ...liveMapAnalysis,
      applied_request: {
        origin: 'New York',
        destination: 'Boston',
        departure_at: '2026-10-10T14:00:00Z',
        departure_timezone: 'America/New_York',
        load_weight_lb: 42000,
        checkpoint_spacing_miles: 25,
      },
      routes: liveMapAnalysis.routes.map((route) => ({
        ...route,
        checkpoints: route.checkpoints.map((point) => ({ ...point, weather: null })),
      })),
    };
    render(<DriverBriefing analysis={analysis} selected="here-fast" />);
    expect(screen.getByRole('heading', { name: /Inspected Route 1/ })).toBeVisible();
    expect(screen.getByText(/This inspected route is not recommended/)).toBeVisible();
    expect(
      screen.getAllByText(/Wind: Unavailable; rain: Unavailable; snow: Unavailable/),
    ).toHaveLength(2);
    expect(screen.getByRole('table')).toHaveTextContent('America/New_York');
    expect(screen.getByText(/timing detail is unavailable/)).toBeVisible();
    expect(JSON.stringify(liveMapAnalysis)).toBe(before);
  });

  it('shows only the inspected route timing method when selection changes', () => {
    const analysis = {
      ...liveMapAnalysis,
      applied_request: {
        origin: 'New York',
        destination: 'Boston',
        departure_at: '2026-10-10T14:00:00Z',
        departure_timezone: 'America/New_York',
        load_weight_lb: 42000,
        checkpoint_spacing_miles: 25,
      },
      routes: liveMapAnalysis.routes.map((route) => ({
        ...route,
        timing_method:
          route.id === 'here-safe' ? 'here_span_interpolation' : 'distance_proportional_estimate',
      })),
    };
    const { rerender } = render(<DriverBriefing analysis={analysis} selected="here-safe" />);
    expect(screen.getByText(/HERE road-span durations/)).toBeVisible();
    expect(screen.queryByText(/distance-proportional estimate/)).not.toBeInTheDocument();
    rerender(<DriverBriefing analysis={analysis} selected="here-fast" />);
    expect(screen.getByText(/distance-proportional estimate/)).toBeVisible();
    expect(screen.queryByText(/HERE road-span durations/)).not.toBeInTheDocument();
  });
});
