import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RouteCard, type RouteView } from './RouteCard';

const route = (id: string, eligibility: string, average: number | null): RouteView => ({
  id,
  name: id,
  roads: 'provider roads',
  miles: 10,
  minutes: 60,
  severe: 0,
  high: 0,
  average,
  eligibility,
  risk_miles: {},
});
const renderCard = (item: RouteView, recommended: string | null) =>
  render(
    <RouteCard
      route={item}
      rank={1}
      selected={item.id}
      recommended={recommended ?? ''}
      blocked={item.eligibility === 'blocked'}
      missing={item.eligibility === 'incomplete'}
      spacing={10}
      onSelect={() => undefined}
    />,
  );

describe('RouteCard', () => {
  it('badges only the API recommended arbitrary route', () => {
    render(
      <>
        <RouteCard
          route={route('provider-one', 'eligible', 2)}
          rank={0}
          selected="provider-two"
          recommended="provider-two"
          blocked={false}
          missing={false}
          spacing={10}
          onSelect={() => undefined}
        />
        <RouteCard
          route={route('provider-two', 'eligible', 2)}
          rank={1}
          selected="provider-two"
          recommended="provider-two"
          blocked={false}
          missing={false}
          spacing={10}
          onSelect={() => undefined}
        />
      </>,
    );
    expect(screen.getAllByText('Recommended')).toHaveLength(1);
  });
  it('shows unavailable average and independent ineligible states', () => {
    renderCard(route('blocked-route', 'blocked', null), null);
    expect(screen.getByText('No Travel — see returned blocking reasons')).toBeInTheDocument();
    renderCard(route('incomplete-route', 'incomplete', null), null);
    expect(screen.getAllByText('Partial forecast').length).toBeGreaterThan(0);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
