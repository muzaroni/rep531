import { test, expect } from "./fixtures";

test("total workout timer survives navigation, backdating, reload and stops at finish", async ({
  page,
}) => {
  await page.clock.install({ time: new Date(2026, 9, 12, 11, 59, 59) });
  await page.clock.pauseAt(new Date(2026, 9, 12, 12));
  await page.goto("./");
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  const elapsed = page.getByRole("timer", {
    name: "Total workout time",
    exact: true,
  });
  await expect(elapsed).toContainText("0:00");
  await expect(page.getByRole('button', { name: 'Dashboard', exact: true })).toHaveCount(0);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('.page-transition').evaluate(async element => {
      await Promise.all(element.getAnimations().map(animation => animation.finished));
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    const before = await elapsed.boundingBox();
    const heading = await page.locator('.workout-title').boundingBox();
    const contentTop = await page.locator('main').evaluate(element =>
      element.getBoundingClientRect().top + parseFloat(getComputedStyle(element).paddingTop),
    );
    expect(heading!.y).toBeCloseTo(contentTop, 0);
    const date = await page.locator('.workout-date').boundingBox();
    expect(date!.y - heading!.y - heading!.height).toBeLessThanOrEqual(10);
    await expect(page.locator('.workout-notes')).not.toHaveClass(/panel/);
    expect(before!.y + before!.height).toBeLessThanOrEqual(heading!.y);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const after = await elapsed.boundingBox();
    expect(after!.y).toBe(before!.y);
    expect(after!.y).toBeGreaterThanOrEqual(0);
    expect(after!.x).toBeGreaterThanOrEqual(0);
    expect(after!.x + after!.width).toBeLessThanOrEqual(width);
    if (width === 320)
      await page.screenshot({ path: 'test-results/workout-elapsed-320.png' });
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.clock.runFor(65000);
  await expect(elapsed).toContainText("1:05");
  await page.getByLabel("Workout date", { exact: true }).fill("2026-10-10");
  await expect(elapsed).toContainText("1:05");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.clock.runFor(120000);
  await page.reload();
  await page
    .getByRole("button", { name: "Resume workout", exact: true })
    .click();
  await expect(elapsed).toContainText("3:05");
  for (const checkbox of await page
    .getByRole("checkbox", { name: /Complete (working|bbb) set/i })
    .all()) {
    await checkbox.check();
    await page
      .getByRole("button", { name: "Dismiss timer", exact: true })
      .click();
  }
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page.locator(".history-row").first().click();
  await expect(elapsed).toContainText("3:05");
  await page.clock.runFor(60000);
  await expect(elapsed).toContainText("3:05");
});
