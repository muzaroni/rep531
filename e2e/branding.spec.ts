import { test, expect } from "./fixtures";
test("REP531 identity and install icons work at root and repository subpaths", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page).toHaveTitle("REP531 · Strength Training");
  await expect(page.locator(".topbar .brand")).toBeHidden();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 768, height: 844 });
  await expect(page.getByRole("link", { name: /REP531/ })).toBeVisible();
  const manifestURL = await page
    .locator('link[rel="manifest"]')
    .evaluate((link: HTMLLinkElement) => link.href);
  const manifest = await (await page.request.get(manifestURL)).json();
  expect(manifest.name).toBe("REP531 · Strength Training");
  expect(manifest.short_name).toBe("REP531");
  expect(
    manifest.icons.some(
      (icon: { purpose?: string }) => icon.purpose === "maskable",
    ),
  ).toBe(true);
  for (const icon of manifest.icons) {
    const response = await page.request.get(
      new URL(icon.src, manifestURL).href,
    );
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
  expect(
    await page
      .locator('meta[name="apple-mobile-web-app-title"]')
      .getAttribute("content"),
  ).toBe("REP531");
  const touch = await page
    .locator('link[rel="apple-touch-icon"]')
    .evaluate((link: HTMLLinkElement) => link.href);
  expect(
    await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      return image.naturalWidth;
    }, touch),
  ).toBe(180);
  const artwork = await page
    .locator(".brand-mark image")
    .first()
    .getAttribute("href");
  expect(artwork).toContain("rep531-artwork.png");
  const artworkResponse = await page.request.get(
    new URL(artwork!, page.url()).href,
  );
  expect(artworkResponse.ok()).toBe(true);
  const colors = await page.evaluate(() =>
    [...document.querySelectorAll(".brand-mark feFlood")].map(
      (flood) => getComputedStyle(flood).floodColor,
    ),
  );
  expect(colors[1]).toBe("rgb(184, 145, 4)");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    if (width <= 700) {
      await expect(page.locator(".topbar")).toHaveCSS("height", "0px");
      await expect(page.locator(".topbar .brand")).toBeHidden();
      await expect(
        page.getByRole("navigation", { name: "Main navigation" }),
      ).toBeVisible();
    } else {
      await expect(page.locator(".topbar .brand")).toBeVisible();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/rep531-overview-mobile.png" });
});
