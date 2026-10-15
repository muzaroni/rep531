import { test, expect } from "./fixtures";

test("Add past workout is a full page with an unclipped calendar on narrow phones", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 9, 14, 12));
  await page.goto("./");
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page
    .getByRole("button", { name: "Add past workout", exact: true })
    .click();
  const setup = page.getByRole("region", {
    name: "Add past workout",
    exact: true,
  });
  await expect(setup).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Add past workout", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Your progress." }),
  ).toHaveCount(0);
  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(size);
    await setup
      .getByRole("button", { name: "Choose date", exact: true })
      .click();
    const calendar = page.locator(".date-picker-inline");
    await expect(calendar).toBeVisible();
    const bounds = (await calendar.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(size.width);
    expect(
      await calendar.evaluate(
        (element) => element.scrollHeight <= element.clientHeight,
      ),
    ).toBe(true);
    const lastDay = calendar.locator(".rdp-day_button").last();
    await lastDay.scrollIntoViewIfNeeded();
    const lastBounds = (await lastDay.boundingBox())!;
    expect(lastBounds.y).toBeGreaterThanOrEqual(0);
    expect(lastBounds.y + lastBounds.height).toBeLessThanOrEqual(size.height);
    await calendar.screenshot({
      path: `test-results/past-calendar-${size.width}.png`,
    });
    await page.keyboard.press("Escape");
    await expect(setup).toBeVisible();
  }
  await setup.getByRole("button", { name: "Choose date", exact: true }).click();
  await page
    .locator(".rep-calendar")
    .getByRole("button", { name: /October 6th, 2026/ })
    .click();
  await expect(setup.getByLabel("Workout date")).toHaveValue("2026-10-06");
  await setup
    .getByRole("button", { name: "Close past workout setup", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your progress." }),
  ).toBeVisible();
});
