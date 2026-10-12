import { expect, test } from '@playwright/test';
import { liveMapAnalysis } from '../fixtures/live-map-analysis';
import { comparisonFixture } from '../fixtures/departure-comparison';

test('departure matrix preserves original results, inspects shifted owned routes and keeps null best choice', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  const token = 'a'.repeat(64);
  const saved = {
    ...liveMapAnalysis,
    snapshot: {
      token,
      created_at: '2026-10-12T00:00:00Z',
      expires_at: '2026-10-19T00:00:00Z',
      policy_version: 'weather-risk-v1',
    },
    applied_request: {
      mode: 'live' as const,
      origin: 'New York, NY',
      destination: 'Boston, MA',
      origin_coordinates: { lat: 40.7, lon: -74 },
      destination_coordinates: { lat: 42.3, lon: -71.1 },
      departure_at: '2026-10-10T14:00:00Z',
      departure_timezone: 'America/New_York',
      load_weight_lb: 42000,
      checkpoint_spacing_miles: 25,
    },
  };
  let requests = 0;
  await page.route('**/api/saved-analyses/restore/', (route) => route.fulfill({ json: saved }));
  await page.route('**/api/departure-comparisons/', (route) => {
    expect(route.request().postDataJSON()).toEqual({ token });
    requests += 1;
    return route.fulfill({ json: comparisonFixture(saved, requests > 1) });
  });
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"/>',
    }),
  );
  await page.goto('/#analysis=' + token);
  await expect(page.getByText('Route 2 recommended', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.getByRole('button', { name: 'Compare departure windows' }).click();
  await expect(page.getByText(/Best eligible scenario: Route 2, departing \+2h/)).toBeVisible();
  await expect(
    page.getByRole('table', { name: 'Route by departure weather scenarios' }).getByRole('row'),
  ).toHaveCount(3);
  await page.setViewportSize({ width: 390, height: 900 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  await testInfo.attach('departure-matrix-mobile', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await page.getByRole('button', { name: 'Inspect Route 2 at +2h' }).click();
  await expect(page.getByRole('heading', { name: 'Departure scenario · +2h' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Inspected Route 2/ })).toBeVisible();
  await expect(page.locator('#driver-briefing')).toContainText('12:00 PM');
  await expect(
    page.getByRole('dialog').getByRole('region', { name: 'Geographic route map' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close scenario' }).click();
  await expect(page.getByText('Route 2 recommended', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Departure date and time')).toHaveValue('2026-10-10T10:00');
  await page.getByRole('button', { name: 'Refresh departure comparison' }).click();
  await expect(page.getByText(/No eligible option in the compared windows/)).toBeVisible();
  await expect(page.getByText('Best compared option', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Route 2 recommended', { exact: true })).toBeVisible();
});
