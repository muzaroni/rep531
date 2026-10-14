import { test, expect } from "./fixtures";
import { openSettingsGroup } from "./settings-navigation";
test("delete cycles confirms, cancellation preserves records, and deletion persists without resetting preferences", async ({
  page,
}) => {
  const click = (name: string) =>
    page.getByRole("button", { name, exact: true }).click();
  await page.goto("./");
  await click("Log cardio");
  await page.getByRole("spinbutton", { name: "Duration (minutes)" }).fill("20");
  await click("Save cardio");
  await click("Start workout");
  for (const kind of ["working", "bbb"]) {
    const boxes = page.getByRole("checkbox", {
      name: new RegExp(`^Complete ${kind} set`),
    });
    for (let i = 0; i < (await boxes.count()); i++) {
      await boxes.nth(i).check();
      await click("Dismiss timer");
    }
  }
  await click("Finish workout");
  await click("Overview");
  await click("Start workout");
  await page.getByLabel("Complete working set 1", { exact: true }).check();
  await click("Dismiss timer");
  await click("Settings");
  await openSettingsGroup(page, "data");
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("ALL lifting workout history");
    await dialog.dismiss();
  });
  await click("Delete all cycles");
  await click("History");
  await expect(
    page.getByText("1 WORKOUTS · 1 CARDIO", { exact: true }),
  ).toBeVisible();
  await click("Settings");
  await openSettingsGroup(page, "data");
  await expect(
    page.getByRole("button", { name: "Your data", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("bbb-rest-timer")),
  ).not.toBeNull();
  page.once("dialog", (dialog) => dialog.accept());
  await click("Delete all cycles");
  await expect(page.getByRole("status")).toContainText(
    "All cycles, lifting workouts and cardio deleted.",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("bbb-rest-timer")),
  ).toBeNull();
  const reset = page.getByRole("button", { name: "Reset cycle", exact: true });
  expect(
    await reset.evaluate((el) => getComputedStyle(el).borderTopStyle),
  ).toBe("solid");
  const deleteBounds = await page
    .getByRole("button", { name: "Delete all cycles", exact: true })
    .boundingBox();
  const gridBounds = await page.locator(".data-actions").boundingBox();
  expect(Math.abs(deleteBounds!.width - gridBounds!.width)).toBeLessThan(2);
  await page.screenshot({ path: "test-results/cycle-data-mobile.png" });
  await page.reload();
  await click("History");
  await expect(page.locator(".history-row")).toHaveCount(0);
  await expect(
    page.getByText("0 WORKOUTS · 0 CARDIO", { exact: true }),
  ).toBeVisible();
  await click("Overview");
  await expect(page.locator(".overview-heading .eyebrow")).toContainText(
    "CYCLE 1",
  );
  await expect(
    page.getByText("0 of 16 workouts", { exact: true }),
  ).toBeVisible();
  await click("Settings");
  await openSettingsGroup(page, "maxes");
  await expect(
    page.getByLabel("Squat training max", { exact: true }),
  ).toHaveValue("225");
  await click("Overview");
  await click("Start workout");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("reset cycle confirms before clearing cardio history", async ({
  page,
}) => {
  const click = (name: string) =>
    page.getByRole("button", { name, exact: true }).click();
  await page.goto("./");
  await click("Log cardio");
  await page.getByRole("spinbutton", { name: "Duration (minutes)" }).fill("15");
  await click("Save cardio");
  await click("Settings");
  await openSettingsGroup(page, "data");
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("ALL cardio history");
    await dialog.dismiss();
  });
  await click("Reset cycle");
  await click("History");
  await expect(
    page.getByText("0 WORKOUTS · 1 CARDIO", { exact: true }),
  ).toBeVisible();
  await click("Settings");
  await openSettingsGroup(page, "data");
  page.once("dialog", (dialog) => dialog.accept());
  await click("Reset cycle");
  await page.reload();
  await click("History");
  await expect(
    page.getByText("0 WORKOUTS · 0 CARDIO", { exact: true }),
  ).toBeVisible();
});
