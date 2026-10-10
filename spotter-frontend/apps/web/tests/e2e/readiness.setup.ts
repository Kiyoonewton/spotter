import { expect, test } from '@playwright/test';

// Vite's first navigation transforms the app before React can enable SSR controls.
// Check browser readiness once before running the independent journeys in parallel.
test('dispatch app hydrates before browser journeys', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.getByLabel('Load weight in lbs')).toBeEnabled({ timeout: 30_000 });
  await expect(page.getByRole('combobox', { name: 'Origin' })).toBeEnabled();
  await expect(page.getByRole('button', { name: /Compare routes/i })).toBeEnabled();
  expect(errors, 'startup must hydrate without uncaught browser errors').toEqual([]);
});
