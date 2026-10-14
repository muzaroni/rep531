import { test, expect } from "./fixtures";

test("themed date picker works in dialogs and workouts at 320px", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 9, 10, 12));
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("./");
  await page.getByRole("button", { name: "Log cardio", exact: true }).click();
  await page.getByRole("button", { name: "Choose date", exact: true }).click();
  const calendar = page.locator(".rep-calendar");
  await expect(calendar).toBeVisible();
  const day = calendar.getByRole("button", { name: /October 6th, 2026/ });
  const box = await day.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  const popup = await page.locator(".date-picker-popover").boundingBox();
  expect(popup!.x).toBeGreaterThanOrEqual(0);
  expect(popup!.x + popup!.width).toBeLessThanOrEqual(320);
  await day.click();
  await expect(calendar).toBeHidden();
  await expect(page.getByLabel("Date", { exact: true })).toHaveValue(
    "2026-10-06",
  );
  await page.getByRole("button", { name: "Choose date", exact: true }).click();
  await expect(calendar.locator(".rdp-selected button")).toHaveCSS(
    "background-color",
    "rgb(184, 145, 4)",
  );
  await page.keyboard.press("Escape");
  await expect(calendar).toBeHidden();
  await expect(
    page.getByRole("dialog", { name: "Log cardio", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close cardio" }).click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await page.getByRole("button", { name: "Choose date", exact: true }).click();
  await expect(
    calendar.getByRole("button", { name: /October 11th, 2026/ }),
  ).toBeDisabled();
  await calendar.getByRole("button", { name: /October 9th, 2026/ }).click();
  await expect(page.getByLabel("Workout date", { exact: true })).toHaveValue(
    "2026-10-09",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Resume workout", exact: true })
    .click();
  await expect(page.getByLabel("Workout date", { exact: true })).toHaveValue(
    "2026-10-09",
  );
});
