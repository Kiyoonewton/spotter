import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCorridorForecast } from './corridor-forecast';
import { corridorFixture } from '../../tests/fixtures/corridor-forecast';

afterEach(() => vi.unstubAllGlobals());
describe('journey-sized corridor request', () => {
  it('requests the chosen horizon and accepts its inclusive hourly series', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => corridorFixture([], '2026-10-11T00:00:00Z', 9),
    });
    vi.stubGlobal('fetch', fetch);
    const result = await fetchCorridorForecast(
      [],
      '2026-10-11T00:00:00Z',
      30000,
      new AbortController().signal,
      9,
    );
    expect(JSON.parse(fetch.mock.calls[0]?.[1].body)).toMatchObject({ horizon_hours: 9 });
    expect(result.frames).toHaveLength(10);
    expect(result.frames.at(-1)?.hour).toBe(9);
  });
  it('rejects a truncated hourly window instead of shortening the journey', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => corridorFixture([], '2026-10-11T00:00:00Z', 8),
      }),
    );
    await expect(
      fetchCorridorForecast([], '2026-10-11T00:00:00Z', 30000, new AbortController().signal, 9),
    ).rejects.toThrow('invalid hourly series');
  });
});
