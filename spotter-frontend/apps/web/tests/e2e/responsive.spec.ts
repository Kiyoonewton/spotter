import { expect, test } from '@playwright/test';
import { liveMapAnalysis } from '../fixtures/live-map-analysis';
import { corridorFixture } from '../fixtures/corridor-forecast';
import type { ForecastPoint } from '../../src/services/corridor-forecast';

for (const width of [320, 390, 768, 1280]) {
  test(`live results fit ${width}px and preserve route and checkpoint navigation`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    test.setTimeout(60000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
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
      const body = route.request().postDataJSON() as {
        points: ForecastPoint[];
        start_at: string;
        horizon_hours: number;
      };
      return route.fulfill({
        json: corridorFixture(body.points, body.start_at, body.horizon_hours),
      });
    });
    await page.goto('/');
    await expect(page.getByLabel('Load weight in lbs')).toBeEnabled({ timeout: 30000 });
    await expect(page.getByRole('heading', { name: 'A clearer road ahead.' })).toBeVisible();
    await expect(page.locator('.page-heading')).toHaveCSS('background-color', 'rgb(21, 59, 69)');
    await expect
      .poll(() =>
        page.locator('.intro-art img').evaluate((image) => (image as HTMLImageElement).currentSrc),
      )
      .toContain('/dispatch-intro-static.svg');
    await testInfo.attach(`intro-${width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
    const download = page.getByRole('link', { name: 'Download Android app', exact: true });
    await expect(download).toBeVisible();
    await expect(download).toHaveAttribute('href', /expo\.dev\/artifacts\/eas\/.*\.apk$/);
    await expect(page.getByRole('link', { name: 'Android app', exact: true })).toBeVisible();
    await page.getByText('Verify download · SHA-256', { exact: true }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
    await page.getByRole('link', { name: 'Plan a trip' }).click();
    await expect(page.getByRole('combobox', { name: 'Origin', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Live', exact: true }).click();
    await expect(page.getByText('Live provider analysis', { exact: true })).toBeVisible();
    for (const name of ['Origin', 'Destination']) {
      await page.getByRole('combobox', { name, exact: true }).fill('Chicago');
      await page.getByRole('option', { name: 'Chicago, IL', exact: true }).click();
    }
    await page.getByRole('button', { name: /Compare routes/i }).click();
    await expect(page.getByText('Route 2 recommended', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Dispatch introduction' })).toHaveCount(0);
    await expect(page.locator('.page-heading')).toHaveCSS('background-color', 'rgb(21, 59, 69)');
    await expect(
      page.getByRole('heading', { name: 'Weather-aware routing', exact: true }),
    ).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(page.getByRole('region', { name: 'Geographic route map' })).toBeVisible();
    await page.getByRole('button', { name: 'Why this route?' }).click();
    await expect(
      page.getByRole('table', { name: 'Recommendation criteria in priority order' }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
    await testInfo.attach(`comparison-${width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    await page.getByRole('button', { name: 'Why this route?' }).click();
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
    const overflow = await page.evaluate(() =>
      Array.from(document.querySelectorAll('body *'))
        .filter(
          (element) =>
            element instanceof HTMLElement &&
            element.getBoundingClientRect().height > 0 &&
            element.getBoundingClientRect().right > window.innerWidth + 1,
        )
        .slice(0, 12)
        .map((element) => ({
          tag: element.tagName,
          class: element.className,
          right: element.getBoundingClientRect().right,
        })),
    );
    expect(fits, JSON.stringify(overflow)).toBe(true);
    await testInfo.attach(`responsive-${width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });
}
