import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RouteDecisionComparison } from './RouteDecisionComparison';
import type { RouteView } from './RouteCard';
const routes: RouteView[] = [
  {
    id: 'provider-safe',
    displayId: '1',
    name: '',
    roads: '',
    eligibility: 'eligible',
    miles: 110,
    minutes: 100,
    severe: 0,
    high: 0,
    average: 1,
  },
  {
    id: 'provider-fast',
    displayId: '2',
    name: '',
    roads: '',
    eligibility: 'eligible',
    miles: 100,
    minutes: 80,
    severe: 0,
    high: 20,
    average: 2,
  },
  {
    id: 'provider-missing',
    displayId: '3',
    name: '',
    roads: '',
    eligibility: 'incomplete',
    miles: 100,
    minutes: 70,
    severe: 0,
    high: 0,
    average: null,
  },
];
describe('decision comparison presentation', () => {
  it('shows the deciding criterion, eligibility, unknown average and explicit travel trade-off', () => {
    render(<RouteDecisionComparison routes={routes} recommended="provider-safe" />);
    fireEvent.click(screen.getByRole('button', { name: 'Why this route?' }));
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Route 1' })).toBeVisible();
    expect(within(table).getByText('Incomplete')).toBeVisible();
    expect(within(table).getByText('Unavailable')).toBeVisible();
    expect(within(table).getByText('Deciding criterion')).toBeVisible();
    expect(screen.getByText(/20 extra driving minutes; 10 more miles/)).toBeVisible();
  });
  it('keeps a null recommendation absent and never labels a deciding row', () => {
    render(<RouteDecisionComparison routes={routes} recommended={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Why this route?' }));
    expect(screen.getByText(/No route is recommended by this analysis/)).toBeVisible();
    expect(screen.queryByText('Deciding criterion')).not.toBeInTheDocument();
    expect(screen.queryByText(/extra driving minutes/)).not.toBeInTheDocument();
  });
});
