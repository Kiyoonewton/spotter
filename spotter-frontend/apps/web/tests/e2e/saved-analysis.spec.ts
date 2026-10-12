import { expect, test } from '@playwright/test';
import { liveMapAnalysis } from '../fixtures/live-map-analysis';
import { corridorFixture } from '../fixtures/corridor-forecast';
import type { ForecastPoint } from '../../src/services/corridor-forecast';

test('saved trip restores without provider calls and produces a printable owned briefing', async ({
  page,
  context,
}) => {
  let analyses = 0;
  let forecasts = 0;
  const saved = {
    ...liveMapAnalysis,
    snapshot: {
      token: 'a'.repeat(64),
      created_at: '2026-10-12T00:00:00Z',
      expires_at: '2026-10-19T00:00:00Z',
      policy_version: 'weather-risk-v1',
    },
    applied_request: {
      mode: 'live',
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
  await context.route('**/api/trip-analyses/', (route) => {
    analyses += 1;
    expect(route.request().postDataJSON().save_snapshot).toBe(true);
    return route.fulfill({ json: saved });
  });
  await context.route('**/api/saved-analyses/restore/', (route) => {
    expect(route.request().postDataJSON()).toEqual({ token: 'a'.repeat(64) });
    return route.fulfill({ json: saved });
  });
  await context.route('**/api/corridor-forecasts/', (route) => {
    forecasts += 1;
    const body = route.request().postDataJSON() as {
      points: ForecastPoint[];
      start_at: string;
      horizon_hours: number;
    };
    return route.fulfill({ json: corridorFixture(body.points, body.start_at, body.horizon_hours) });
  });
  await context.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"/>',
    }),
  );
  await context.route('**/api/locations/**', (route) => {
    const q = new URL(route.request().url()).searchParams.get('q') ?? '';
    const origin = q.toLowerCase().includes('new');
    return route.fulfill({
      json: {
        results: [
          {
            provider_id: origin ? 'ny' : 'bos',
            label: origin ? 'New York, NY' : 'Boston, MA',
            latitude: origin ? 40.7 : 42.3,
            longitude: origin ? -74 : -71.1,
            timezone: 'America/New_York',
          },
        ],
      },
    });
  });
  await page.goto('/');
  await expect(page.getByLabel('Load weight in lbs')).toBeEnabled({ timeout: 30000 });
  await page.getByRole('button', { name: 'Live', exact: true }).click();
  await page.getByLabel('Origin', { exact: true }).fill('New York');
  await page.getByRole('option', { name: 'New York, NY', exact: true }).click();
  await page.getByLabel('Destination', { exact: true }).fill('Boston');
  await page.getByRole('option', { name: 'Boston, MA', exact: true }).click();
  await page.getByLabel('Departure date and time').fill('2026-10-10T10:00');
  await page.getByRole('button', { name: /Compare routes/i }).click();
  await expect(
    page.getByRole('slider', { name: 'Corridor forecast hours after departure' }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Copy saved trip link' }).click();
  await expect(page.getByLabel('Saved trip link')).toHaveValue(/#analysis=a{64}$/);
  const url = await page.getByLabel('Saved trip link').inputValue();
  const shared = await context.newPage();
  await shared.goto(url);
  await expect(shared.getByText(/Viewing a saved arrival-time snapshot/)).toBeVisible();
  await expect(shared.getByText('Route 2 recommended', { exact: true })).toBeVisible();
  await shared.close();
  await page.reload();
  await expect(page.getByText(/Viewing a saved arrival-time snapshot/)).toBeVisible();
  await expect(page.getByLabel('Origin', { exact: true })).toHaveValue('New York, NY');
  await expect(page.getByLabel('Departure date and time')).toHaveValue('2026-10-10T10:00');
  await expect(page.getByText('Route 2 recommended', { exact: true })).toBeVisible();
  expect(analyses).toBe(1);
  expect(forecasts).toBe(1);
  await expect(
    page.getByRole('slider', { name: 'Corridor forecast hours after departure' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Driver briefing', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Waycast driver briefing' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Inspected Route 2/ })).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('heading', { name: 'Waycast driver briefing' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Weather-aware routing', exact: true }),
  ).not.toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
});
