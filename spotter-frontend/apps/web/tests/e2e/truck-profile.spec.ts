import { expect, test } from '@playwright/test';
import { liveMapAnalysis } from '../fixtures/live-map-analysis';
import { corridorFixture } from '../fixtures/corridor-forecast';
import type { ForecastPoint } from '../../src/services/corridor-forecast';
import type { TripAnalysisRequest } from '../../src/services/api';

test('physical profile validates before submit, preserves cargo, excludes restricted routes and appears in briefing', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await page.clock.setFixedTime(new Date('2026-10-12T12:20:00Z'));
  let calls = 0;
  await page.route('**/api/locations/**', (route) =>
    route.fulfill({
      json: {
        results: [
          {
            provider_id: 'chicago',
            label: 'Chicago, IL',
            latitude: 41.8781,
            longitude: -87.6298,
            timezone: 'America/Chicago',
          },
        ],
      },
    }),
  );
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
    return route.fulfill({ json: corridorFixture(body.points, body.start_at, body.horizon_hours) });
  });
  await page.route('**/api/trip-analyses/', (route) => {
    calls++;
    const body = route.request().postDataJSON() as TripAnalysisRequest;
    expect(body.load_weight_lb).toBe(42000);
    expect(body.truck_profile).toEqual({
      height_ft: 13.5,
      width_ft: 8.5,
      length_ft: 70,
      current_weight_lb: 70000,
      gross_weight_lb: 80000,
      weight_per_axle_lb: 17000,
    });
    return route.fulfill({
      json: {
        ...liveMapAnalysis,
        analysis_id: 'profile-analysis',
        applied_request: body,
        truck_profile: body.truck_profile,
        routing_profile_notice: 'Entered vehicle dimensions and weights sent to HERE.',
        snapshot: {
          token: 'a'.repeat(64),
          created_at: '2026-10-12T12:20:00Z',
          expires_at: '2026-10-19T12:20:00Z',
          policy_version: 'weather-risk-v1',
        },
        routes: liveMapAnalysis.routes.map((candidate, index) =>
          index === 0
            ? {
                ...candidate,
                eligibility: 'blocked',
                routing_eligible: false,
                routing_notice: 'HERE returned a critical routing notice.',
                risk_miles: { Low: candidate.distance_miles },
                average_risk: 1,
              }
            : candidate,
        ),
      },
    });
  });
  await page.goto('/');
  await expect(page.getByLabel('Load weight in lbs')).toBeEnabled({ timeout: 30000 });
  await page.getByRole('button', { name: 'Live', exact: true }).click();
  for (const label of ['Origin', 'Destination']) {
    await page.getByRole('combobox', { name: label, exact: true }).fill('Chicago');
    await page.getByRole('option', { name: 'Chicago, IL', exact: true }).click();
  }
  await page.getByRole('button', { name: /Truck profile/ }).click();
  await page
    .getByRole('checkbox', { name: 'Use physical vehicle measurements for live routing' })
    .check();
  await page.getByRole('button', { name: 'Compare routes', exact: true }).click();
  await expect(page.getByText(/Enter total height/)).toBeVisible();
  expect(calls).toBe(0);
  for (const [label, value] of [
    ['Total height (ft)', '13.5'],
    ['Total width (ft)', '8.5'],
    ['Total length (ft)', '70'],
    ['Actual loaded vehicle weight (lb)', '70000'],
    ['Maximum rated gross weight (lb)', '80000'],
    ['Heaviest axle weight (lb)', '17000'],
  ] as const) {
    await page.getByRole('spinbutton', { name: label, exact: true }).fill(value);
  }
  await page.getByRole('button', { name: 'Compare routes', exact: true }).click();
  await expect(page.getByText('Route 2 recommended', { exact: true })).toBeVisible();
  await expect(
    page.getByText('HERE returned a critical routing notice.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('spinbutton', { name: 'Total height (ft)', exact: true }),
  ).not.toBeVisible();
  await page.getByRole('button', { name: 'Driver briefing', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('actual loaded weight 70000 lb');
  await expect(page.getByRole('dialog')).toContainText('rated gross weight 80000 lb');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole('button', { name: /Truck profile/ }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'Total height (ft)', exact: true }),
  ).toHaveValue('13.5');
  await expect(
    page.locator('.MuiCollapse-entered').filter({
      has: page.getByRole('spinbutton', { name: 'Heaviest axle weight (lb)', exact: true }),
    }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await testInfo.attach('truck-profile-mobile', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});
