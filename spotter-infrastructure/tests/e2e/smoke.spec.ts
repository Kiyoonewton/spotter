import { expect, test } from '@playwright/test';

test.describe('UI through Nginx', () => {
  test('loads the frontend application', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /spotter/i })).toBeVisible();
  });
});

test.describe('API through Nginx', () => {
  test('GET /api/health returns 200, the expected body, and a request ID', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
    expect(response.headers()['x-request-id']).toBeTruthy();
  });
});
