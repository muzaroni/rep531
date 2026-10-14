import { waitForSettingsAutosave } from "./fixtures";
import { openSettingsGroup } from "./settings-navigation";
import { test, expect } from "./fixtures";
const nav = async (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("button", { name, exact: true }).click();

test("accessory set controls persist counts, preserve completed work, and remove empty exercises", async ({
  page,
}) => {
  await page.goto("./");
  await nav(page, "Start workout");
  await page
    .getByRole("spinbutton", { name: "accessory set 5 weight", exact: true })
    .fill("25");
  await page
    .getByRole("spinbutton", { name: "accessory set 5 reps", exact: true })
    .fill("12");
  await nav(page, "Add set to Hanging leg raise");
  await expect(
    page.getByRole("spinbutton", {
      name: "accessory set 6 weight",
      exact: true,
    }),
  ).toHaveValue("25");
  await expect(
    page.getByRole("spinbutton", { name: "accessory set 6 reps", exact: true }),
  ).toHaveValue("12");
  await expect(
    page.getByText("0 of 17 sets complete", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Complete accessory set 6", exact: true })
    .check();
  await nav(page, "Dismiss timer");
  await nav(page, "Remove set from Hanging leg raise");
  await expect(
    page.getByRole("checkbox", {
      name: "Complete accessory set 5",
      exact: true,
    }),
  ).toBeChecked();
  await nav(page, "Remove set from Hanging leg raise");
  await expect(page.locator(".accessory-workout-heading small")).toHaveText(
    "Abs · 4 sets",
  );
  await nav(page, "Settings");
  await waitForSettingsAutosave(page);
  await nav(page, "Workout");
  await expect(page.locator(".accessory-workout-heading small")).toHaveText(
    "Abs · 4 sets",
  );
  await page.reload();
  await nav(page, "Resume workout");
  await expect(page.locator(".accessory-workout-heading small")).toHaveText(
    "Abs · 4 sets",
  );
  for (let i = 0; i < 3; i++)
    await nav(page, "Remove set from Hanging leg raise");
  await expect(page.locator(".accessory-workout-heading small")).toHaveText(
    "Abs · 1 set",
  );
  await expect(
    page.getByRole("button", {
      name: "Remove set from Hanging leg raise",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", { name: "Complete accessory set 1", exact: true })
    .uncheck();
  await nav(page, "Remove set from Hanging leg raise");
  await expect(page.locator(".accessory-workout-heading")).toHaveCount(0);
  await page.reload();
  await nav(page, "Resume workout");
  await expect(page.locator(".accessory-workout-heading")).toHaveCount(0);
  await nav(page, "Add accessory");
  await page.getByLabel("Search accessories").fill("Hanging");
  await nav(page, "Add Hanging leg raise");
  await nav(page, "Done");
  await expect(
    page.getByRole("spinbutton", {
      name: "accessory set 1 weight",
      exact: true,
    }),
  ).toHaveValue("25");
  await expect(
    page.getByRole("spinbutton", { name: "accessory set 1 reps", exact: true }),
  ).toHaveValue("12");
  await page.locator(".accessory-workout-heading").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/accessory-set-controls.png" });
  const boxes = page.getByRole("checkbox");
  for (let i = 0; i < (await boxes.count()); i++) {
    await boxes.nth(i).check();
    const dismiss = page.getByRole("button", {
      name: "Dismiss timer",
      exact: true,
    });
    if (await dismiss.isVisible()) await dismiss.click();
  }
  await nav(page, "Finish workout");
  await page.locator(".history-row").first().click();
  await expect(
    page.getByRole("button", { name: /Add set to|Remove set from/ }),
  ).toHaveCount(0);
});

test("compact lift rows keep prescription inline, compress plate counts and fit phones", async ({
  page,
}) => {
  await page.goto("./");
  await nav(page, "Settings");
  await openSettingsGroup(page, "equipment");
  await page
    .getByRole("textbox", { name: "Available lb plates", exact: true })
    .fill("25, 10, 5");
  await waitForSettingsAutosave(page);
  await nav(page, "Overview");
  await nav(page, "Start workout");
  await page
    .getByRole("spinbutton", { name: "bbb set 1 weight", exact: true })
    .fill("175");
  await expect(
    page.getByText("Per side: 2 × 25 + 10 + 5 lb", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Complete bbb set 1", exact: true })
    .check();
  await nav(page, "Dismiss timer");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const row = page.locator(".set-section").nth(2).locator(".set-row").first();
    const heading = await row.locator(".set-description strong").boundingBox();
    const input = await row.getByRole("spinbutton").first().boundingBox();
    expect(heading!.x + heading!.width).toBeLessThanOrEqual(input!.x);
    expect(heading!.height).toBeLessThan(34);
    expect(
      (await row.locator(".check-label").boundingBox())!.width,
    ).toBeGreaterThanOrEqual(44);
    if (width === 390)
      expect((await row.boundingBox())!.height).toBeLessThanOrEqual(70);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const offlineNotice = page.getByRole("button", {
    name: "Got it",
    exact: true,
  });
  if (await offlineNotice.isVisible()) await offlineNotice.click();
  await page
    .locator(".set-section")
    .nth(2)
    .screenshot({ path: "test-results/compact-bbb-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .locator(".set-section")
    .nth(2)
    .screenshot({ path: "test-results/compact-bbb-desktop.png" });
});
