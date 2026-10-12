import { expect, test } from '@playwright/test';
import { corridorFixture } from '../fixtures/corridor-forecast';
import type { ForecastPoint } from '../../src/services/corridor-forecast';
import { liveMapAnalysis } from '../fixtures/live-map-analysis';

test('loads the dispatch workspace before an analysis is submitted', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /weather-aware routing/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /compare routes/i })).toBeVisible();
  await expect(page.getByText('Compare routes')).toBeVisible();
  await expect(page.getByText('Route B recommended', { exact: true })).not.toBeVisible();
});

test('mocked live contract journey sends coordinates and hides illustrative map', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  await page.route(/\/api\/locations\/?\?/, async (route) => {
    const query = new URL(route.request().url()).searchParams.get('q') ?? '';
    const candidate = query.toLowerCase().startsWith('new')
      ? {
          provider_id: 'mock:new-york',
          label: 'New York, NY',
          latitude: 40.7,
          longitude: -74,
          timezone: 'America/New_York',
        }
      : {
          provider_id: 'mock:boston',
          label: 'Boston, MA',
          latitude: 42.3,
          longitude: -71.1,
          timezone: 'America/New_York',
        };
    await route.fulfill({ json: { results: [candidate] } });
  });
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"/>',
    }),
  );
  await page.route('**/api/corridor-forecasts/', async (route) => {
    const body = route.request().postDataJSON() as { points: ForecastPoint[]; start_at: string };
    expect(body.start_at).toBe('2026-10-10T14:00:00.000Z');
    await route.fulfill({ json: corridorFixture(body.points, body.start_at) });
  });
  let requestBody: Record<string, unknown> | undefined;
  await page.route('**/api/trip-analyses/', async (route) => {
    requestBody = JSON.parse(route.request().postData() ?? '{}');
    await route.fulfill({ json: liveMapAnalysis });
  });
  await page.goto('/');
  await expect(page.getByLabel('Load weight in lbs')).toBeEnabled({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Live' }).click();
  const origin = page.getByRole('combobox', { name: 'Origin' });
  const destination = page.getByRole('combobox', { name: 'Destination' });
  await origin.fill('New');
  await page.getByRole('option', { name: 'New York, NY', exact: true }).click();
  await destination.fill('Boston');
  await page.getByRole('option', { name: 'Boston, MA', exact: true }).click();
  await page.getByRole('button', { name: /Compare routes/i }).click();
  await expect
    .poll(() => requestBody)
    .toMatchObject({
      mode: 'live',
      origin: 'New York, NY',
      destination: 'Boston, MA',
      departure_timezone: 'America/New_York',
    });
  expect(requestBody?.origin_coordinates).toEqual({ lat: 40.7, lon: -74 });
  expect(requestBody?.destination_coordinates).toEqual({ lat: 42.3, lon: -71.1 });
  expect(requestBody?.departure_at).toBe('2026-10-10T14:00:00.000Z');
  await expect(page.getByText('Route 2 recommended')).toBeVisible();
  await expect(page.getByTestId('estimated-truck')).toHaveAttribute('data-route-id', 'here-safe');
  await expect(page.getByRole('region', { name: 'Geographic route map' })).toBeVisible();
  const forecastHour = page.getByRole('slider', {
    name: 'Corridor forecast hours after departure',
  });
  await expect(forecastHour).toBeEnabled();
  await expect(page.getByTestId('forecast-here-safe-here-safe-start')).toHaveAttribute(
    'data-value',
    '10',
  );
  await forecastHour.press('ArrowRight');
  await expect(page.getByTestId('estimated-truck')).toHaveAttribute(
    'data-selected-at',
    '2026-10-10T15:00:00.000Z',
  );
  await expect(page.getByTestId('forecast-here-safe-here-safe-start')).toHaveAttribute(
    'data-hour',
    '1',
  );
  await expect(page.getByTestId('forecast-here-safe-here-safe-start')).toHaveAttribute(
    'data-value',
    '60',
  );
  await expect(page.getByText('Route 2 recommended')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Map route here-safe, Low segment' }),
  ).toBeVisible();
  await testInfo.attach('live-corridor-forecast', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await page.getByRole('button', { name: 'Snow · in/hr', exact: true }).click();
  await expect(page.getByTestId('forecast-here-safe-here-safe-start')).toHaveAttribute(
    'data-value',
    'missing',
  );
  await page.getByRole('button', { name: 'Map route here-fast, High segment' }).press('Enter');
  await expect(page.getByTestId('estimated-truck')).toHaveAttribute('data-route-id', 'here-fast');
  await page.getByRole('button', { name: 'Map checkpoint 2 on route here-fast' }).press('Enter');
  await expect(page.getByText(/Route 1 · Sample checkpoint 2/)).toBeVisible();
  await page
    .getByRole('button', { name: /Route 2/ })
    .first()
    .click();
  await expect(page.getByText(/Route 2 · Sample checkpoint 1/)).toBeVisible();
  await page
    .getByRole('button', { name: /Route 1/ })
    .first()
    .click();
  await expect(page.getByText(/Route 1 · Sample checkpoint/)).toBeVisible();
  await origin.fill('New Y');
  await expect(page.getByRole('button', { name: /Compare routes/i })).toBeDisabled();
  await expect(page.locator('svg.route-map')).toHaveCount(0);
  await expect(page.getByLabel('Heatmap opacity')).toHaveCount(0);
});

test('parent results flow preserves null recommendations and eligibility banners', async ({
  page,
}) => {
  let submission = 0;
  await page.route('**/api/trip-analyses/', async (route) => {
    submission += 1;
    const eligibility = submission === 2 ? 'blocked' : submission === 3 ? 'incomplete' : 'eligible';
    await route.fulfill({
      json: {
        analysis_id: `null-${submission}`,
        data_source: 'demo',
        available_route_count: 2,
        routes: ['alpha', 'beta'].map((id) => ({
          id,
          name: id,
          distance_miles: 10,
          duration_minutes: 20,
          eligibility,
          risk_miles: {},
          average_risk: null,
          checkpoints: [
            {
              id: `${id}-checkpoint`,
              route_id: id,
              distance_from_origin_miles: 0,
              arrival_at: '2026-10-10T15:00:00Z',
              risk: 'Unknown',
              weather: { wind_mph: 12, rain_in_hr: null, snow_in_hr: null },
              reasons: [],
            },
          ],
        })),
        recommendation: {
          status: 'unavailable',
          recommended_route_id: null,
          explanation: 'No route recommendation is available.',
        },
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Compare routes/i }).click();
  await expect(page.getByText(/Route alpha · Sample checkpoint 1/)).toBeVisible();
  await expect(page.getByText('Recommendation unavailable — incomplete forecast')).toBeVisible();
  await expect(page.getByText('Recommended', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Route .* recommended/)).toHaveCount(0);
  await page
    .getByRole('button', { name: /Route beta/ })
    .first()
    .click();
  await expect(page.getByText(/Route beta · Sample checkpoint 1/)).toBeVisible();
  await expect(page.getByText('Recommended', { exact: true })).toHaveCount(0);
  await page.getByLabel('Load weight in lbs').fill('43000');
  await page.getByRole('button', { name: /Compare routes/i }).click();
  await expect(page.getByText('All routes blocked')).toBeVisible();
  await page.getByLabel('Load weight in lbs').fill('44000');
  await page.getByRole('button', { name: /Compare routes/i }).click();
  await expect(page.getByText('Recommendation unavailable — incomplete forecast')).toBeVisible();
});
