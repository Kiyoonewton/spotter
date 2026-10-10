import { expect, test } from "@playwright/test";

test.describe("UI through Nginx", () => {
  test("loads the frontend application", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /weather-aware routing/i }),
    ).toBeVisible();
  });
});

test.describe("API through Nginx", () => {
  test("GET /api/health returns 200, the expected body, and a request ID", async ({
    request,
  }) => {
    const response = await request.get("/api/health");

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
    expect(response.headers()["x-request-id"]).toBeTruthy();
  });
});

test("real trip journey submits through the frontend and keeps route ownership", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /weather-aware routing/i }),
  ).toBeVisible();
  const load = page.getByLabel("Load weight");
  await load.fill("30000");
  const [firstAnalysis] = await Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.endsWith("/trip-analyses/") &&
        response.request().method() === "POST",
    ),
    page.getByRole("button", { name: /compare routes/i }).click(),
  ]);
  const firstBody = await firstAnalysis.json();
  expect(firstBody.routes).toHaveLength(3);
  await expect(page.getByText(/Route [ABC] recommended/)).toBeVisible();
  await load.fill("42000");
  const [secondAnalysis] = await Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.endsWith("/trip-analyses/") &&
        response.request().method() === "POST",
    ),
    page.getByRole("button", { name: /compare routes/i }).click(),
  ]);
  const secondBody = await secondAnalysis.json();
  expect(secondBody.routes[0].risk_miles).not.toEqual(
    firstBody.routes[0].risk_miles,
  );
  expect(secondBody.recommendation).toBeTruthy();
  await expect(page.getByText(/Route [ABC] recommended/)).toBeVisible();
  await page
    .getByRole("button", { name: /Route A/ })
    .first()
    .click();
  await expect(page.getByText(/Route A · Sample checkpoint/)).toBeVisible();
});
