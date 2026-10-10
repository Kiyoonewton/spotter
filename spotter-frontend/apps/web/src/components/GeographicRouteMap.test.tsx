import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GeographicRouteMap } from './GeographicRouteMap';
import { route } from '@/tests/fixtures/geographic-route';

describe('GeographicRouteMap', () => {
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
      name: 'Map route arbitrary-route, Unknown segment',
    });
    expect(segment).toHaveAttribute('stroke-dasharray', '8 5');
    fireEvent.keyDown(segment, { key: 'Enter' });
    expect(onRoute).toHaveBeenCalledWith('arbitrary-route');
    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Map checkpoint 2 on route arbitrary-route' }),
      { key: ' ' },
    );
    expect(onCheckpoint).toHaveBeenCalledWith(1);
    const tile = container.querySelector('image');
    if (!tile) throw new Error('Expected visible basemap tile');
    fireEvent.error(tile);
    expect(screen.getByText(/Basemap tiles unavailable/)).toBeVisible();
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
