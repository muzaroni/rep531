import { test, expect } from "./fixtures";

test("monthly calendar uses the yellow theme, browses months and keeps independent page cards", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Manage overview cards" }).click();
  let picker = page.getByRole("dialog", { name: "Overview cards" });
  await picker
    .getByRole("button", { name: "Add Monthly calendar card" })
    .click();
  await picker.getByRole("button", { name: "Add Daily log card" }).click();
  await picker.getByRole("button", { name: "Close Overview cards" }).click();
  const calendar = page.getByRole("region", {
    name: "Monthly calendar",
    exact: true,
  });
  await expect(calendar).toBeVisible();
  const key = calendar.getByRole("button", { name: "Calendar key", exact: true });
  await expect(key).toHaveAttribute("aria-expanded", "false");
  await expect(calendar.locator(".monthly-key")).toBeHidden();
  await key.click();
  await expect(calendar.locator(".monthly-key")).toBeVisible();
  await key.click();
  const month = await calendar.getByRole("heading", { level: 3 }).textContent();
  const today = calendar.locator('[aria-current="date"]');
  await expect(today).toHaveCount(1);
  expect(
    await today
      .locator(".monthly-today")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(184, 145, 4)");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const box = await today.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(43.9);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeLessThanOrEqual(44.1);
    expect((await calendar.boundingBox())!.height).toBeLessThan(365);
    await calendar.screenshot({ path: `test-results/monthly-${width}.png` });
  }
  await calendar.getByRole("button", { name: "Next month" }).click();
  await expect(calendar.getByRole("heading", { level: 3 })).not.toHaveText(
    month!,
  );
  await calendar.getByRole("button", { name: "Previous month" }).click();
  await expect(calendar.getByRole("heading", { level: 3 })).toHaveText(month!);
  await calendar.getByRole("button", { name: "Today", exact: true }).click();
  await today.click();
  await expect(calendar.locator(".monthly-day-detail")).toBeVisible();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(calendar).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Daily log", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Manage history cards" }).click();
  picker = page.getByRole("dialog", { name: "History cards" });
  await expect(
    picker.getByRole("button", { name: "Remove Monthly calendar card" }),
  ).toHaveCount(0);
  await expect(
    picker.getByRole("button", { name: "Remove Estimated 1RM card" }),
  ).toHaveCount(0);
  await picker.getByRole("button", { name: "Remove Daily log card" }).click();
  await picker.getByRole("button", { name: "Close History cards" }).click();
  await expect(calendar).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Daily log", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(calendar).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Daily log", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Daily log", exact: true }),
  ).toBeVisible();
});

test("completed days have an outline and open the original workout; swiping only browses", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  for (const kind of ["working", "bbb"]) {
    const boxes = page.getByRole("checkbox", {
      name: new RegExp(`^Complete ${kind} set`),
    });
    for (let index = 0; index < (await boxes.count()); index++) {
      await boxes.nth(index).check();
      await page.getByRole("button", { name: "Dismiss timer" }).click();
    }
  }
  await page.getByRole("button", { name: "Finish workout" }).click();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.getByRole("button", { name: "Manage overview cards" }).click();
  const picker = page.getByRole("dialog", { name: "Overview cards" });
  await picker
    .getByRole("button", { name: "Add Monthly calendar card" })
    .click();
  await picker.getByRole("button", { name: "Close Overview cards" }).click();
  const calendar = page.getByRole("region", {
    name: "Monthly calendar",
    exact: true,
  });
  const completed = calendar.locator('[data-completed="true"]');
  await expect(completed).toHaveCount(1);
  expect(
    await completed.evaluate((el) => getComputedStyle(el).borderTopColor),
  ).not.toBe("rgba(0, 0, 0, 0)");
  await completed.click();
  await expect(calendar.locator(".monthly-day-detail")).toContainText(
    "Squat · Completed",
  );
  await calendar.getByRole("button", { name: "View workout" }).click();
  await expect(
    page.getByRole("button", { name: "Edit workout", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  const month = await calendar.getByRole("heading", { level: 3 }).textContent();
  await calendar.locator(".monthly-grid").evaluate((el) => {
    el.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: 270,
        clientY: 200,
      }),
    );
    el.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        clientX: 70,
        clientY: 202,
      }),
    );
  });
  await expect(calendar.getByRole("heading", { level: 3 })).not.toHaveText(
    month!,
  );
  await expect(
    page.getByText("1 of 16 workouts", { exact: true }),
  ).toBeVisible();
});
