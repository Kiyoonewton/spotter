import { expect, test } from "@playwright/test";

test("built frontend serves SSR, assets and hydrated controls", async ({ page, request }) => {
  test.skip(process.env.E2E_BUILT_FRONTEND !== "true", "Requires the built Node runtime");
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/html");
  const html = await response.text();
  expect(html).toMatch(/weather-aware routing/i);
  expect(html).toContain("Load weight in lbs");

  const errors: string[] = [];
  const assets: { status: number; type: string }[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (asset) => {
    if (new URL(asset.url()).pathname.startsWith("/assets/")) {
      assets.push({ status: asset.status(), type: asset.headers()["content-type"] ?? "" });
    }
  });
  await page.goto("/");
  await expect(page.getByRole("spinbutton", { name: "Load weight in lbs" })).toBeEnabled();
  await expect(page.getByRole("button", { name: /compare routes/i })).toBeEnabled();
  expect(errors).toEqual([]);
  expect(assets.some((asset) => /javascript/.test(asset.type))).toBe(true);
  expect(assets.every((asset) => asset.status === 200)).toBe(true);
});
