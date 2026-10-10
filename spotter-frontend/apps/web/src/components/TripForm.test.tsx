import { createRef } from 'react';
import { renderToString } from 'react-dom/server';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TripForm } from './TripForm';

function props() {
  return {
    origin: 'Chicago, IL',
    destination: 'Pittsburgh, PA',
    departure: '2026-10-10T10:00',
    weight: '30000',
    spacing: '25',
    departureRef: createRef<HTMLInputElement>(),
    error: '',
    onOrigin: vi.fn(),
    onDestination: vi.fn(),
    onDeparture: vi.fn(),
    onWeight: vi.fn(),
    onSpacing: vi.fn(),
    onSubmit: vi.fn((event) => event.preventDefault()),
  };
}

describe('TripForm hydration readiness', () => {
  it('disables editable inputs and submission in server-rendered HTML', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(<TripForm {...props()} />);
    expect(container.querySelector('button[type="submit"]')).toBeDisabled();
    const inputs = container.querySelectorAll('input:not([aria-hidden="true"])');
    expect(inputs.length).toBeGreaterThan(0);
    inputs.forEach((input) => expect(input).toBeDisabled());
  });

  it('enables controls after mount and submits through the React handler', () => {
    const callbacks = props();
    render(<TripForm {...callbacks} />);
    expect(screen.getByRole('spinbutton', { name: 'Load weight in lbs' })).toBeEnabled();
    const button = screen.getByRole('button', { name: 'Compare routes' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(callbacks.onSubmit).toHaveBeenCalledOnce();
  });
});
