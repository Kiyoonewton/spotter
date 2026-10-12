import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DispatchIntro } from './DispatchIntro';

describe('DispatchIntro', () => {
  it('lets users pause and resume the decorative animation', () => {
    const { container } = render(<DispatchIntro />);
    const image = container.querySelector('img');
    expect(image?.getAttribute('src')).toContain('background.gif');
    fireEvent.click(screen.getByRole('button', { name: 'Pause intro animation' }));
    expect(image?.getAttribute('src')).toBe('/dispatch-intro-static.svg');
    fireEvent.click(screen.getByRole('button', { name: 'Play intro animation' }));
    expect(image?.getAttribute('src')).toContain('background.gif');
    expect(screen.getByRole('link', { name: 'Plan a trip' })).toHaveAttribute(
      'href',
      '#trip-planning',
    );
  });
});
