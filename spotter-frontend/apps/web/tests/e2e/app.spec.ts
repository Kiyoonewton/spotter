import { expect, test } from '@playwright/test';

test('loads the dispatch workspace before an analysis is submitted', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /weather-aware routing/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /compare routes/i })).toBeVisible();
  await expect(page.getByText('Compare routes')).toBeVisible();
  await expect(page.getByText('Route B recommended', { exact: true })).not.toBeVisible();
});

test('mocked live contract journey sends coordinates and hides illustrative map', async ({
  page,
}) => {
  await page.route('**/api/locations/**', async (route) => {
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
  let requestBody: Record<string, unknown> | undefined;
  await page.route('**/api/trip-analyses/', async (route) => {
    requestBody = JSON.parse(route.request().postData() ?? '{}');
    await route.fulfill({
      json: {
        analysis_id: 'mock',
        data_source: 'live',
        available_route_count: 2,
        routes: [
          {
            id: 'here-fast',
            name: 'Fast',
            distance_miles: 10,
            duration_minutes: 20,
            eligibility: 'eligible',
            risk_miles: {},
            average_risk: 1,
            checkpoints: [
              {
                id: 'fast-cp',
                route_id: 'here-fast',
                distance_from_origin_miles: 0,
                arrival_at: '2026-07-01T15:00:00Z',
                risk: 'Low',
                weather: { wind_mph: 10, rain_in_hr: null, snow_in_hr: 0 },
                reasons: [],
              },
            ],
          },
          {
            id: 'here-safe',
            name: 'Safe',
            distance_miles: 12,
            duration_minutes: 25,
            eligibility: 'eligible',
            risk_miles: {},
            average_risk: 2,
            checkpoints: [
              {
                id: 'safe-cp',
                route_id: 'here-safe',
                distance_from_origin_miles: 0,
                arrival_at: '2026-07-01T15:00:00Z',
                risk: 'Low',
                weather: { wind_mph: 8, rain_in_hr: 0, snow_in_hr: 0 },
                reasons: [],
              },
            ],
          },
        ],
        recommendation: {
          status: 'recommended',
          recommended_route_id: 'here-safe',
          explanation: 'Safe is recommended.',
        },
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Live' }).click();
  const origin = page.locator('input[aria-label="Origin"]');
  const destination = page.locator('input[aria-label="Destination"]');
  await origin.fill('New');
  await page.getByText('New York, NY').click();
  await destination.fill('Boston');
  await page.getByText('Boston, MA').click();
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
  expect(requestBody?.departure_at).toBe('2026-10-10T14:00:00.000Z');
  await expect(page.getByText('Route here-safe recommended')).toBeVisible();
  await expect(page.getByText('Geographic map is not available yet.')).toBeVisible();
  await page
    .getByRole('button', { name: /Route here-fast/ })
    .first()
    .click();
  await expect(page.getByText(/Route here-fast · Sample checkpoint/)).toBeVisible();
  await origin.fill('New Y');
  await expect(page.getByRole('button', { name: /Compare routes/i })).toBeDisabled();
  await expect(page.locator('svg.route-map')).toHaveCount(0);
  await expect(page.getByLabel('Heatmap opacity')).toHaveCount(0);
});
