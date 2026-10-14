import { test, expect } from "./fixtures";

test("cardio shortcuts, custom names and last saved activity work on narrow phones", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 9, 10, 12));
  await page.goto("./");
  const open = () =>
    page.getByRole("button", { name: "Log cardio", exact: true }).click();
  await open();
  const dialog = page.getByRole("dialog", { name: "Log cardio", exact: true });
  const activity = dialog.getByRole("textbox", {
    name: "Activity",
    exact: true,
  });
  const shortcuts = dialog.getByRole("group", {
    name: "Quick select activity",
  });
  await expect(activity).toHaveValue("Walking");
  for (const name of [
    "Walking",
    "Elliptical",
    "Treadmill",
    "Cycling",
    "Rowing",
  ]) {
    const button = shortcuts.getByRole("button", { name, exact: true });
    await button.click();
    await expect(activity).toHaveValue(name);
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(shortcuts.locator('[aria-pressed="true"]')).toHaveCount(1);
    await expect(button.locator("svg")).toHaveAttribute("aria-hidden", "true");
  }
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const bounds = await shortcuts.getByRole("button").first().boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    await dialog.screenshot({ path: `test-results/cardio-${width}.png` });
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await open();
  await expect(activity).toHaveValue("Walking");
  await shortcuts.getByRole("button", { name: "Cycling", exact: true }).click();
  await dialog
    .getByRole("spinbutton", { name: "Duration (minutes)" })
    .fill("31.5");
  await dialog
    .getByRole("button", { name: "Save cardio", exact: true })
    .click();
  await expect(
    page.getByText("Saved on device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await open();
  await expect(activity).toHaveValue("Cycling");
  await activity.fill("Incline walk");
  await dialog.getByLabel("Date", { exact: true }).fill("2026-10-04");
  await expect(shortcuts.locator('[aria-pressed="true"]')).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Save cardio", exact: true })
    .click();
  await open();
  await expect(activity).toHaveValue("Incline walk");
  await shortcuts.getByRole("button", { name: "Rowing", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Close cardio", exact: true })
    .click();
  await open();
  await expect(activity).toHaveValue("Incline walk");
  await dialog
    .getByRole("button", { name: "Close cardio", exact: true })
    .click();
  await expect(
    page.getByText("0 of 16 workouts", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.locator(".history-list")).toContainText("Cycling");
  await expect(page.locator(".history-list")).toContainText("31.5 minutes");
  await expect(page.locator(".history-list")).toContainText("Incline walk");
});
