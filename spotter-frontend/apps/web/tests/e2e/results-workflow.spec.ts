import { expect, test } from '@playwright/test';
import { liveMapAnalysis } from '../fixtures/live-map-analysis';
import { corridorFixture } from '../fixtures/corridor-forecast';
import type { ForecastPoint } from '../../src/services/corridor-forecast';

// Repeated successful submissions reproduced orphaned DOM with duplicate sibling keys.
test('repeated analyses keep one results workspace with the map before secondary tools', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await page.clock.setFixedTime(new Date('2026-10-12T12:20:00Z'));
  let submissions = 0;
  const duplicateWarnings: string[] = [];
  page.on('console', (message) => {
    if (/same key|Non-unique keys/.test(message.text())) duplicateWarnings.push(message.text());
  });
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
    const request = route.request().postDataJSON() as {
      points: ForecastPoint[];
      start_at: string;
      horizon_hours: number;
    };
    return route.fulfill({
      json: corridorFixture(request.points, request.start_at, request.horizon_hours),
    });
  });
  await page.route('**/api/trip-analyses/', (route) => {
    submissions++;
    const request = route.request().postDataJSON() as { departure_at: string };
    expect(Date.parse(request.departure_at)).toBeGreaterThan(Date.parse('2026-10-12T12:20:00Z'));
    const shift = Date.parse(request.departure_at) - Date.parse('2026-10-10T14:00:00Z');
    return route.fulfill({
      json: {
        ...liveMapAnalysis,
        analysis_id: `analysis-${submissions}`,
        snapshot: {
          token: String(submissions).repeat(64),
          created_at: '2026-10-12T12:20:00Z',
          expires_at: '2026-10-19T12:20:00Z',
          policy_version: 'weather-risk-v1',
        },
        routes: liveMapAnalysis.routes.map((candidate) => ({
          ...candidate,
          checkpoints: candidate.checkpoints.map((point) => ({
            ...point,
            arrival_at: new Date(Date.parse(point.arrival_at) + shift).toISOString(),
          })),
        })),
      },
    });
  });
  await page.goto('/');
  await expect(page.getByLabel('Load weight in lbs')).toBeEnabled({ timeout: 30000 });
  await expect(page.getByLabel('Departure date and time')).toHaveValue('2026-10-12T08:00');
  await page.getByRole('button', { name: 'Live', exact: true }).click();
  for (const name of ['Origin', 'Destination']) {
    await page.getByRole('combobox', { name, exact: true }).fill('Chicago');
    await page.getByRole('option', { name: 'Chicago, IL', exact: true }).click();
  }
  await page.getByLabel('Departure date and time').fill('2026-10-10T10:00');
  await expect(page.getByText(/This departure is in the past/)).toBeVisible();
  await page.getByRole('button', { name: 'Use upcoming departure' }).click();
  await expect(page.getByLabel('Departure date and time')).toHaveValue('2026-10-12T08:00');
  await expect(page.getByText(/This departure is in the past/)).toHaveCount(0);
  for (let index = 1; index <= 3; index++) {
    await page.getByRole('button', { name: 'Compare routes', exact: true }).click();
    await expect.poll(() => submissions).toBe(index);
    await expect(page.getByRole('button', { name: 'Compare routes', exact: true })).toBeEnabled();
    await expect(page.getByRole('region', { name: 'Saved trip and driver briefing' })).toHaveCount(
      1,
    );
    await expect(page.getByRole('region', { name: 'Route and departure comparison' })).toHaveCount(
      1,
    );
    await expect(page.getByRole('region', { name: 'Geographic route map' })).toHaveCount(1);
  }
  const map = page.locator('.results-map');
  const saved = page.locator('.saved-trip-tools');
  const comparison = page.locator('.departure-comparison-panel');
  expect((await map.boundingBox())!.y).toBeLessThan((await saved.boundingBox())!.y);
  expect((await map.boundingBox())!.y).toBeLessThan((await comparison.boundingBox())!.y);
  await testInfo.attach('results-desktop-map-first', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await page.setViewportSize({ width: 390, height: 900 });
  expect((await map.boundingBox())!.y).toBeLessThan(
    (await page.locator('.route-panel').boundingBox())!.y,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  expect(duplicateWarnings).toEqual([]);
  await testInfo.attach('results-mobile-map-first', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});
