import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../src/env';

describe('parseEnv', () => {
  it('accepts a valid VITE_API_BASE_URL', () => {
    expect(parseEnv({ VITE_API_BASE_URL: '/api' })).toEqual({ VITE_API_BASE_URL: '/api' });
  });

  it('throws when VITE_API_BASE_URL is empty', () => {
    expect(() => parseEnv({ VITE_API_BASE_URL: '' })).toThrow(/VITE_API_BASE_URL/);
  });

  it('throws when VITE_API_BASE_URL is missing', () => {
    expect(() => parseEnv({})).toThrow(/VITE_API_BASE_URL/);
  });
});
