import { expect, test } from '@playwright/test';

test.describe('UI through Nginx', () => {
  test('loads the frontend application', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /weather-aware routing/i })).toBeVisible();
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

test('real trip journey submits through the frontend and keeps route ownership', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /weather-aware routing/i })).toBeVisible();
  const load = page.getByLabel('Load weight');
  await load.fill('30000');
  await page.getByRole('button', { name: /compare routes/i }).click();
  await expect(page.getByText(/Route [ABC] recommended/)).toBeVisible();
  await load.fill('42000');
  await page.getByRole('button', { name: /compare routes/i }).click();
  await expect(page.getByText(/Route [ABC] recommended/)).toBeVisible();
  await page.getByRole('button', { name: /Route A/ }).first().click();
  await expect(page.getByText(/Route A · Sample checkpoint/)).toBeVisible();
});
