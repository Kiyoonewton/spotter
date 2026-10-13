import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CheckpointInspector } from './CheckpointInspector';

describe('CheckpointInspector', () => {
  it('shows known measurements and an explicit arrival timezone for unknown risk', () => {
    render(
      <CheckpointInspector
        checkpoint={{
          city: 'Test',
          miles: 25,
          minutes: 0,
          wind: 22.123456,
          rain: null,
          snow: 0.2,
          risk: 'Unknown',
          rule: 'Partial forecast',
          arrivalAt: '2026-07-01T15:00:00Z',
        }}
        route="provider-x"
        index={0}
        total={1}
        departure="2026-07-01T10:00"
        onPrevious={() => undefined}
        onNext={() => undefined}
      />,
    );
    expect(screen.getByText('22.1')).toBeInTheDocument();
    expect(screen.getByText('0.20')).toBeInTheDocument();
    expect(screen.getByText(/UTC|GMT/)).toBeInTheDocument();
    expect(screen.getByText(/Known measurements are shown/)).toBeInTheDocument();
  });
});
