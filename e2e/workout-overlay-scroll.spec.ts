import { test, expect } from "./fixtures";

test("workout overlays stay in the visible viewport after deep scrolling and keyboard resize", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.getByRole("button", { name: "Start workout", exact: true }).click();
  await page.getByRole("checkbox", { name: "Complete accessory set 1", exact: true }).check();
  const timer = page.getByRole("dialog", { name: "Rest timer controls", exact: true });
  await expect(timer).toBeVisible();
  expect(await timer.evaluate(element => element.parentElement === document.body)).toBe(true);
  for (const scroll of [0, 900, 1800, 400, 2500]) {
    await page.evaluate(y => window.scrollTo(0, y), scroll);
    await expect.poll(async () => {
      const box = (await timer.boundingBox())!;
      return Math.abs(box.y + box.height - (844 - 63));
    }).toBeLessThan(2);
  }
  await page.getByRole("button", { name: "Add accessory", exact: true }).click();
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(300);
  const picker = page.getByRole("dialog", { name: "Add accessories", exact: true });
  const fits = async (top: number, height: number) => {
    await expect.poll(async () => {
      const box = (await picker.boundingBox())!;
      return box.y >= top + 15 && box.y + box.height <= top + height - 15;
    }).toBe(true);
  };
  await fits(0, 844);
  await picker.getByLabel("Search accessories").fill("Lat pulldown");
  // Model Safari's keyboard/browser chrome moving the visual viewport while
  // leaving the layout viewport unchanged. Real WebKit scrolling runs above.
  await page.evaluate(() => {
    Object.defineProperty(visualViewport!, "height", { configurable: true, value: 430 });
    Object.defineProperty(visualViewport!, "offsetTop", { configurable: true, value: 70 });
    visualViewport!.dispatchEvent(new Event("resize"));
    visualViewport!.dispatchEvent(new Event("scroll"));
  });
  await fits(70, 430);
  await picker.getByRole("button", { name: "Add Lat pulldown", exact: true }).click();
  await picker.getByRole("button", { name: "Done", exact: true }).click();
  await expect.poll(async () => {
    const box = (await timer.boundingBox())!;
    return Math.abs(box.y + box.height - (70 + 430 - 63));
  }).toBeLessThan(2);
  await expect(page.locator(".save-toast")).toBeVisible();
  expect((await page.locator(".save-toast").boundingBox())!.y).toBeGreaterThanOrEqual(70);
  await page.evaluate(() => {
    Reflect.deleteProperty(visualViewport!, "height");
    Reflect.deleteProperty(visualViewport!, "offsetTop");
    visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect.poll(async () => {
    const box = (await timer.boundingBox())!;
    return Math.abs(box.y + box.height - (844 - 63));
  }).toBeLessThan(2);
  await page.getByRole("button", { name: "Dismiss timer", exact: true }).click();
  const reopen = page.getByRole("button", { name: "Open rest timer", exact: true });
  expect(await reopen.evaluate(element => element.parentElement === document.body)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  const box = (await reopen.boundingBox())!;
  expect(box.y + box.height).toBeCloseTo(844 - 63, 0);
  await reopen.click();
  await expect(timer).toBeVisible();
});
