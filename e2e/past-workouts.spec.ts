import { openSettingsGroup } from "./settings-navigation";
import { test, expect } from "./fixtures";

test("correcting a completed date updates the calendar and survives reload without converting stored performance", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 9, 10, 12));
  await page.goto("./");
  const click = (name: string) =>
    page.getByRole("button", { name, exact: true }).click();
  const backup = async () => {
    const pending = page.waitForEvent("download");
    await openSettingsGroup(page, "data");
    await click("JSON backup");
    const stream = await (await pending).createReadStream();
    let json = "";
    for await (const chunk of stream!) json += chunk.toString();
    return JSON.parse(json);
  };
  await click("History");
  await click("Add past workout");
  await page.getByRole("dialog").getByLabel("Workout date").fill("2026-10-06");
  await click("Create past workout");
  await page.getByLabel("Count as next program workout").check();
  await click("Mark main & BBB complete");
  await click("Save past workout");
  await click("Settings");
  const before = await backup();
  await openSettingsGroup(page, "appearance");
  await page
    .getByRole("combobox", { name: "Weight units", exact: true })
    .selectOption("kg");
  await page
    .getByRole("button", { name: "Save changes", exact: true })
    .first()
    .click();
  await click("History");
  await page.locator(".history-row").first().click();
  await expect(page.locator(".tm-tag strong")).toContainText("kg");
  await expect(page.getByLabel("Session notes")).toBeDisabled();
  await expect(page.getByRole("checkbox").first()).toBeDisabled();
  const date = page.getByLabel("Workout date", { exact: true });
  await expect(date).toBeEnabled();
  await date.fill("2026-10-11");
  await expect(page.getByRole("alert")).toContainText("on or before today");
  await expect(date).toHaveValue("2026-10-06");
  await date.fill("2026-10-07");
  await expect(
    page.getByText("Saved on device", { exact: true }),
  ).toBeVisible();
  await click("Back to history");
  await expect(page.locator(".combined-chart")).toHaveAttribute(
    "aria-label",
    /2026-10-07/,
  );
  await click("Overview");
  await expect(
    page.getByText("1 / 16 workouts", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /^Wednesday, October 7, 2026.*Squat logged/,
    }),
  ).toBeVisible();
  await page.reload();
  await click("History");
  await page.locator(".history-row").first().click();
  await expect(page.getByLabel("Workout date", { exact: true })).toHaveValue(
    "2026-10-07",
  );
  await click("Settings");
  const after = await backup();
  expect(after.position).toBe(before.position);
  expect(after.cycle).toBe(before.cycle);
  expect(after.history).toHaveLength(1);
  expect(after.history[0].date).not.toBe(before.history[0].date);
  expect({ ...after.history[0], date: before.history[0].date }).toEqual(
    before.history[0],
  );
});

test("past draft survives reload, preserves the active workout and saves on its actual date", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 9, 10, 12));
  await page.goto("./");
  const click = (name: string) =>
    page.getByRole("button", { name, exact: true }).click();
  await click("Start workout");
  await page.getByLabel("Workout date", { exact: true }).fill("2026-10-09");
  await click("History");
  await click("Add past workout");
  const dialog = page.getByRole("dialog", { name: "Add past workout" });
  await dialog.getByLabel("Workout date").fill("2026-10-06");
  await dialog.getByLabel("Lift", { exact: true }).selectOption("bench");
  await dialog.screenshot({ path: "test-results/past-workout-setup.png" });
  await click("Create past workout");
  await expect(page.getByLabel("Count as next program workout")).toBeDisabled();
  await page
    .getByLabel("Session notes")
    .fill("Missed logging this bench session");
  await click("Mark main & BBB complete");
  await expect(
    page.getByRole("button", { name: "Save past workout", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByText("Saved on device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await click("History");
  await click("Resume past workout");
  await expect(page.getByLabel("Workout date", { exact: true })).toHaveValue(
    "2026-10-06",
  );
  await expect(page.getByLabel("Session notes")).toHaveValue(
    "Missed logging this bench session",
  );
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({ path: "test-results/past-workout-editor.png" });
  await click("Save past workout");
  await expect(page.locator(".history-list")).toContainText("Bench press");
  await click("Overview");
  await expect(
    page.getByText("0 / 16 workouts", { exact: true }),
  ).toBeVisible();
  await click("Resume workout");
  await expect(page.getByLabel("Workout date", { exact: true })).toHaveValue(
    "2026-10-09",
  );
  await expect(page.locator(".workout-title h1")).toContainText("Squat");
});

test("calendar seeds the chosen past session and opt-in completion advances once", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 9, 5, 12));
  await page.goto("./");
  const click = (name: string) =>
    page.getByRole("button", { name, exact: true }).click();
  const calendar = page.getByRole("region", {
    name: "Cycle schedule",
    exact: true,
  });
  await calendar
    .getByRole("button", { name: "Squat · next · show details", exact: true })
    .click();
  await click("Log this past session");
  const dialog = page.getByRole("dialog", { name: "Add past workout" });
  await expect(dialog.getByLabel("Lift", { exact: true })).toHaveValue("squat");
  await expect(dialog.getByLabel("Workout date")).toHaveValue("2026-10-05");
  await dialog.getByLabel("Workout date").fill("2026-10-02");
  await click("Create past workout");
  await page.getByLabel("Count as next program workout").check();
  await click("Mark main & BBB complete");
  await click("Save past workout");
  await click("Overview");
  await expect(
    page.getByText("1 / 16 workouts", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".next-workout h2")).toContainText("Bench press");
  await page.reload();
  await expect(
    page.getByText("1 / 16 workouts", { exact: true }),
  ).toBeVisible();
  await click("History");
  await expect(
    page.getByRole("button", { name: "Add past workout", exact: true }),
  ).toBeVisible();
});
