import { expect, test } from '@playwright/test';

test('loads the Spotter application', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText(/spotter/i).first()).toBeVisible();
});
