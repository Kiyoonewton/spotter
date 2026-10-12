import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { ResultsWorkspace } from './ResultsWorkspace';
import { liveMapAnalysis } from '../../tests/fixtures/live-map-analysis';
import { presentRoutes } from '@/lib/result-presentation';

vi.mock('./GeographicRouteMap', () => ({
  GeographicRouteMap: () => <div role="region" aria-label="Geographic route map" />,
}));

function props(id: string): ComponentProps<typeof ResultsWorkspace> {
  const analysis = {
    ...liveMapAnalysis,
    analysis_id: id,
    snapshot: {
      token: 'a'.repeat(64),
      created_at: '2026-10-12T12:00:00Z',
      expires_at: '2026-10-19T12:00:00Z',
      policy_version: 'weather-risk-v1',
      restored: true,
    },
  };
  return {
    analysis,
    dataSource: 'live',
    drawer: true,
    tab: 'routes',
    routes: presentRoutes(analysis),
    selected: 'here-safe',
    recommended: 'here-safe',
    blocked: false,
    missing: false,
    pending: false,
    progress: 0,
    spacing: 25,
    checkpoint: 0,
    checkpointTotal: 2,
    inspectorCheckpoint: {
      city: 'Checkpoint 1',
      miles: 0,
      minutes: 0,
      wind: 10,
      rain: 0,
      snow: 0,
      risk: 'Low',
      rule: 'Within thresholds',
      arrivalAt: '2026-10-12T12:00:00Z',
    },
    departure: '10:00',
    opacity: 45,
    forecast: 0,
    state: 'results',
    onDrawer: vi.fn(),
    onTab: vi.fn(),
    onRoute: vi.fn(),
    onCheckpoint: vi.fn(),
    onOpacity: vi.fn(),
    onForecast: vi.fn(),
  };
}

test('replacing analyses does not accumulate saved tools, comparisons or maps', () => {
  const { rerender } = render(<ResultsWorkspace {...props('first')} />);
  for (const id of ['second', 'third', 'fourth']) {
    rerender(<ResultsWorkspace {...props(id)} />);
    expect(screen.getAllByRole('region', { name: 'Saved trip and driver briefing' })).toHaveLength(
      1,
    );
    expect(screen.getAllByRole('region', { name: 'Route and departure comparison' })).toHaveLength(
      1,
    );
    expect(screen.getAllByRole('region', { name: 'Geographic route map' })).toHaveLength(1);
  }
});
