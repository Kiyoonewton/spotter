import { expect, test } from '@playwright/test';

test('loads the dispatch workspace before an analysis is submitted', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /weather-aware routing/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /compare routes/i })).toBeVisible();
  await expect(page.getByText('Compare routes')).toBeVisible();
  await expect(page.getByText('Route B recommended', { exact: true })).not.toBeVisible();
});
