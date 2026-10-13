import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GeographicRouteMap } from './GeographicRouteMap';
import { route } from '@/tests/fixtures/geographic-route';

describe('GeographicRouteMap', () => {
  it('toggles a corridor heatmap without filling unknown segments or changing risk', () => {
    const known = {
      ...route,
      segments: (route.segments ?? []).map((segment) => ({ ...segment, risk: 'Severe' })),
    };
    const { rerender } = render(
      <GeographicRouteMap
        routes={[route]}
        selected={route.id}
        checkpoint={0}
        onRoute={vi.fn()}
        onCheckpoint={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show corridor risk heatmap' }));
    expect(screen.queryByTestId('corridor-risk-heat')).not.toBeInTheDocument();
    rerender(
      <GeographicRouteMap
        routes={[known]}
        selected={route.id}
        checkpoint={0}
        onRoute={vi.fn()}
        onCheckpoint={vi.fn()}
      />,
    );
    expect(screen.getAllByTestId('corridor-risk-heat').length).toBeGreaterThan(0);
    expect(screen.getByText(/Smoothing is visual only/)).toBeVisible();
  });

  it('selects API-owned routes and checkpoints by keyboard and preserves unknown risk', () => {
    const onRoute = vi.fn();
    const onCheckpoint = vi.fn();
    const { container } = render(
      <GeographicRouteMap
        routes={[route]}
        selected={route.id}
        checkpoint={0}
        onRoute={onRoute}
        onCheckpoint={onCheckpoint}
      />,
    );
    const segment = screen.getByRole('button', {
      name: 'Route 1, Unknown segment',
    });
    expect(segment).toHaveAttribute('stroke-dasharray', '8 5');
    fireEvent.keyDown(segment, { key: 'Enter' });
    expect(onRoute).toHaveBeenCalledWith('arbitrary-route');
    fireEvent.keyDown(screen.getByRole('button', { name: 'Map checkpoint 2 on Route 1' }), {
      key: ' ',
    });
    expect(onCheckpoint).toHaveBeenCalledWith(1);
    const tile = container.querySelector('image');
    if (!tile) throw new Error('Expected visible basemap tile');
    fireEvent.error(tile);
    expect(screen.getByText(/Some basemap tiles could not load/)).toBeVisible();
    expect(segment).toBeInTheDocument();
    expect(screen.queryByLabelText('Heatmap opacity')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'OpenStreetMap contributors' })).toBeVisible();
  });

  it('keeps inspection available without inventing geometry', () => {
    render(
      <GeographicRouteMap
        routes={[{ ...route, segments: [] }]}
        selected={route.id}
        checkpoint={0}
        onRoute={vi.fn()}
        onCheckpoint={vi.fn()}
      />,
    );
    expect(screen.getByText(/Route geometry unavailable/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /Map route/ })).not.toBeInTheDocument();
  });
});
