import { expect, test } from '@playwright/test';
import { liveMapAnalysis } from '../fixtures/live-map-analysis';
import { corridorFixture } from '../fixtures/corridor-forecast';
import type { ForecastPoint } from '../../src/services/corridor-forecast';

for (const width of [320, 390, 768, 1280]) {
  test(`live results fit ${width}px and preserve route and checkpoint navigation`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/locations/**', (route) =>
      route.fulfill({
        json: {
          results: [
            {
              provider_id: 'location',
              label: 'Chicago, IL',
              latitude: 41.8781,
              longitude: -87.6298,
              timezone: 'America/Chicago',
            },
          ],
        },
      }),
    );
    await page.route('**/api/trip-analyses/', (route) => route.fulfill({ json: liveMapAnalysis }));
    await page.route('https://tile.openstreetmap.org/**', (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"/>',
      }),
    );
    await page.route('**/api/corridor-forecasts/', (route) => {
      const body = route.request().postDataJSON() as { points: ForecastPoint[]; start_at: string };
      return route.fulfill({ json: corridorFixture(body.points, body.start_at) });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Live', exact: true }).click();
    for (const name of ['Origin', 'Destination']) {
      await page.getByRole('combobox', { name, exact: true }).fill('Chicago');
      await page.getByRole('option', { name: 'Chicago, IL', exact: true }).click();
    }
    await page.getByRole('button', { name: /Compare routes/i }).click();
    await expect(page.getByText('Route 2 recommended', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Geographic route map' })).toBeVisible();
    if (width <= 900) {
      await expect(page.getByRole('heading', { name: 'Checkpoint inspector' })).not.toBeVisible();
      await page.getByRole('button', { name: 'Checkpoint 1', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Checkpoint inspector' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Route comparison' })).not.toBeVisible();
    }
    await page.getByRole('button', { name: 'Next checkpoint', exact: true }).click();
    await expect(page.getByText(/Route 2 · Sample checkpoint 2/)).toBeVisible();
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
    expect(fits).toBe(true);
    await testInfo.attach(`responsive-${width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });
}
