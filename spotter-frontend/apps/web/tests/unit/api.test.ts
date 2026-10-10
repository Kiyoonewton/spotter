import { describe, expect, it } from 'vitest';
import { errorHandlers } from '../mocks/handlers';
import { server } from '../mocks/server';

describe('mock API', () => {
  it('returns the mocked health response', async () => {
    const response = await fetch('/api/health');

    expect(response.ok).toBe(true);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('can mock an error response for the same endpoint', async () => {
    server.use(errorHandlers.health);

    const response = await fetch('/api/health');

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
  });
});
