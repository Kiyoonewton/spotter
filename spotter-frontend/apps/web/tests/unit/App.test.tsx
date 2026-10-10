import { render, screen } from '@testing-library/react';
import App from '../../src/App';

describe('App', () => {
  it('renders the application', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /spotter/i })).toBeInTheDocument();
  });
});
