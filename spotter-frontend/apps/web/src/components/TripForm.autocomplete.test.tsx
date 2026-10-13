import '@testing-library/jest-dom/vitest';
import { createRef, useState, type FormEvent } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TripForm } from './TripForm';
import type { LocationCandidate } from '@/services/api';

const origin = {
  provider_id: 'mock:new-york',
  label: 'New York, NY',
  latitude: 40.7,
  longitude: -74,
  timezone: 'America/New_York',
};
const destination = {
  provider_id: 'mock:boston',
  label: 'Boston, MA',
  latitude: 42.3,
  longitude: -71.1,
  timezone: 'America/New_York',
};

afterEach(cleanup);

function LiveForm({ pending = false }: { pending?: boolean }) {
  const [originText, setOriginText] = useState('');
  const [destinationText, setDestinationText] = useState('');
  const [selectedOrigin, setOrigin] = useState<LocationCandidate | null>(null);
  const [selectedDestination, setDestination] = useState<LocationCandidate | null>(null);
  return (
    <TripForm
      mode="live"
      pending={pending}
      origin={originText}
      destination={destinationText}
      originCandidate={selectedOrigin}
      destinationCandidate={selectedDestination}
      originOptions={[origin]}
      destinationOptions={[destination]}
      departure="2026-10-10T10:00"
      timezone="America/New_York"
      weight="30000"
      spacing="25"
      departureRef={createRef<HTMLInputElement>()}
      error=""
      onOrigin={(value) => {
        setOriginText(value);
        if (value !== selectedOrigin?.label) setOrigin(null);
      }}
      onDestination={(value) => {
        setDestinationText(value);
        if (value !== selectedDestination?.label) setDestination(null);
      }}
      onOriginCandidate={setOrigin}
      onDestinationCandidate={setDestination}
      onDeparture={() => undefined}
      onWeight={() => undefined}
      onSpacing={() => undefined}
      onSubmit={(event: FormEvent) => event.preventDefault()}
    />
  );
}

describe('live autocomplete input wiring', () => {
  it('preserves keyboard selection and invalidates an edited selection', () => {
    const consoleError = vi.spyOn(console, 'error');
    try {
      render(<LiveForm />);
      const submit = screen.getByRole('button', { name: 'Compare routes' });
      expect(submit).toBeDisabled();
      expect(screen.getByLabelText('Departure date and time')).toBeEnabled();

      const originInput = screen.getByRole('combobox', { name: 'Origin' });
      fireEvent.change(originInput, { target: { value: 'New' } });
      fireEvent.keyDown(originInput, { key: 'ArrowDown' });
      fireEvent.keyDown(originInput, { key: 'Enter' });
      expect(originInput).toHaveValue('New York, NY');
      expect(submit).toBeDisabled();

      const destinationInput = screen.getByRole('combobox', { name: 'Destination' });
      fireEvent.change(destinationInput, { target: { value: 'Boston' } });
      fireEvent.keyDown(destinationInput, { key: 'ArrowDown' });
      fireEvent.keyDown(destinationInput, { key: 'Enter' });
      expect(destinationInput).toHaveValue('Boston, MA');
      expect(submit).toBeEnabled();

      fireEvent.change(originInput, { target: { value: 'New Y' } });
      expect(submit).toBeDisabled();
      expect(consoleError.mock.calls.flat().join(' ')).not.toContain(
        'Unable to find the input element',
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it('disables submission while a request is pending', () => {
    render(
      <TripForm
        mode="live"
        pending
        origin={origin.label}
        destination={destination.label}
        originCandidate={origin}
        destinationCandidate={destination}
        originOptions={[origin]}
        destinationOptions={[destination]}
        departure="2026-10-10T10:00"
        weight="30000"
        spacing="25"
        departureRef={createRef<HTMLInputElement>()}
        error=""
        onOrigin={() => undefined}
        onDestination={() => undefined}
        onDeparture={() => undefined}
        onWeight={() => undefined}
        onSpacing={() => undefined}
        onSubmit={(event) => event.preventDefault()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Compare routes' })).toBeDisabled();
  });
});
