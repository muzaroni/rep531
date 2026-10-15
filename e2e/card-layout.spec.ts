import { test, expect } from "./fixtures";

test("tab headings and picker placement match, with consistent card gaps", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole("button", { name: "Overview", exact: true }).click();
    const heading = page.locator("h1");
    const style = await heading.evaluate((el) => ({
      size: getComputedStyle(el).fontSize,
      weight: getComputedStyle(el).fontWeight,
    }));
    const overview = await page
      .getByRole("button", { name: "Manage overview cards" })
      .boundingBox();
    await page.getByRole("button", { name: "History", exact: true }).click();
    expect(
      await heading.evaluate((el) => ({
        size: getComputedStyle(el).fontSize,
        weight: getComputedStyle(el).fontWeight,
      })),
    ).toEqual(style);
    const history = await page
      .getByRole("button", { name: "Manage history cards" })
      .boundingBox();
    expect(history!.x).toBeCloseTo(overview!.x, 0);
    expect(history!.y).toBeCloseTo(overview!.y, 0);
    expect(history!.width).toBe(overview!.width);
    expect(history!.height).toBe(overview!.height);
    const panels = page.locator(".dashboard-cards > .panel");
    for (let index = 1; index < (await panels.count()); index++) {
      const before = (await panels.nth(index - 1).boundingBox())!;
      const after = (await panels.nth(index).boundingBox())!;
      expect(after.y - before.y - before.height).toBeCloseTo(12, 0);
    }
    await page.screenshot({
      path: `test-results/history-layout-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    expect(
      await heading.evaluate((el) => ({
        size: getComputedStyle(el).fontSize,
        weight: getComputedStyle(el).fontWeight,
      })),
    ).toEqual(style);
    await page.getByRole("button", { name: "Workout", exact: true }).click();
    expect(
      await heading.evaluate((el) => ({
        size: getComputedStyle(el).fontSize,
        weight: getComputedStyle(el).fontWeight,
      })),
    ).toEqual(style);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("card handles reorder each page independently, retaining the permanent history group", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Manage overview cards" }).click();
  const overview = page.getByRole("dialog", { name: "Overview cards" });
  await overview.getByRole("button", { name: "Add Active cycle card" }).click();
  await overview
    .getByRole("button", { name: "Add Monthly calendar card" })
    .click();
  await overview
    .getByRole("button", { name: "Arrange Monthly calendar" })
    .press("ArrowUp");
  await overview.getByRole("button", { name: "Close Overview cards" }).click();
  await expect(
    page.locator(".dashboard-cards > .panel").nth(1),
  ).toHaveAttribute("aria-label", "Monthly calendar");
  await page.reload();
  await expect(
    page.locator(".dashboard-cards > .panel").nth(1),
  ).toHaveAttribute("aria-label", "Monthly calendar");
  await page.getByRole("button", { name: "Manage overview cards" }).click();
  await overview
    .getByRole("button", { name: "Arrange Active cycle" })
    .dragTo(overview.getByRole("button", { name: "Arrange This week" }));
  await expect(overview.locator("[data-card-id]").first()).toHaveAttribute(
    "data-card-id",
    "cycle",
  );
  const handle = overview.getByRole("button", {
    name: "Arrange Monthly calendar",
  });
  const target = (await overview
    .getByRole("button", { name: "Arrange Active cycle" })
    .boundingBox())!;
  await handle.dispatchEvent("pointerdown", {
    pointerType: "touch",
    pointerId: 1,
  });
  await handle.dispatchEvent("pointerup", {
    pointerType: "touch",
    pointerId: 1,
    clientX: target.x + target.width / 2,
    clientY: target.y + target.height / 2,
  });
  await expect(overview.locator("[data-card-id]").first()).toHaveAttribute(
    "data-card-id",
    "monthly",
  );
  await overview.getByRole("button", { name: "Close Overview cards" }).click();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.locator(".dashboard-cards > .panel").first()).toHaveClass(
    /chart-panel/,
  );
  await page.getByRole("button", { name: "Manage history cards" }).click();
  const history = page.getByRole("dialog", { name: "History cards" });
  await expect(
    history.getByRole("button", {
      name: /^Remove (Monthly calendar|Estimated 1RM) card$/,
    }),
  ).toHaveCount(0);
  await history
    .getByRole("button", { name: "Arrange Daily log" })
    .press("ArrowUp");
  await expect(history.locator("[data-card-id]").nth(2)).toHaveAttribute(
    "data-card-id",
    "daily",
  );
  await history
    .getByRole("button", { name: "Arrange Monthly calendar" })
    .press("ArrowUp");
  await history.getByRole("button", { name: "Close History cards" }).click();
  await expect(
    page.locator(".dashboard-cards > .panel").first(),
  ).toHaveAttribute("aria-label", "Monthly calendar");
  await page.reload();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(
    page.locator(".dashboard-cards > .panel").first(),
  ).toHaveAttribute("aria-label", "Monthly calendar");
});
