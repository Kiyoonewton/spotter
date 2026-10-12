import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DepartureComparisonPanel } from './DepartureComparisonPanel';
import * as hook from '@/hooks/useDepartureComparison';
import { liveMapAnalysis } from '../../tests/fixtures/live-map-analysis';
import { comparisonFixture } from '../../tests/fixtures/departure-comparison';
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
};
afterEach(() => vi.restoreAllMocks());
it('uses only the returned best option and preserves the original recommendation during inspection', () => {
  vi.spyOn(hook, 'useDepartureComparison').mockReturnValue({
    data: comparisonFixture(liveMapAnalysis),
    pending: false,
    error: '',
    compare: vi.fn(),
  });
  const before = JSON.stringify(liveMapAnalysis);
  render(<DepartureComparisonPanel analysis={analysis} />);
  expect(screen.getByText(/Best eligible scenario: Route 2, departing \+2h/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Inspect Route 2 at +2h' }));
  expect(screen.getByRole('heading', { name: /Departure scenario · \+2h/ })).toBeVisible();
  expect(screen.getByRole('heading', { name: /Inspected Route 2/ })).toBeVisible();
  expect(JSON.stringify(liveMapAnalysis)).toBe(before);
});
it('does not invent a best option when every window is blocked', () => {
  vi.spyOn(hook, 'useDepartureComparison').mockReturnValue({
    data: comparisonFixture(liveMapAnalysis, true),
    pending: false,
    error: '',
    compare: vi.fn(),
  });
  render(<DepartureComparisonPanel analysis={analysis} />);
  expect(screen.getByText(/No eligible option in the compared windows/)).toBeVisible();
  expect(screen.queryByText('Best compared option')).not.toBeInTheDocument();
});
