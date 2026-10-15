import { test, expect } from "./fixtures";
import { openSettingsGroup } from "./settings-navigation";

test("history-only week one can be followed by catch-up starting at week two Squat", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 9, 14, 12));
  const nav = (name: string) => page.getByRole("button", { name, exact: true }).click();
  await page.goto("./");
  await page.evaluate(() => localStorage.setItem("bbb-overview-active-cycle", "true"));
  await page.reload();
  await nav("History");
  for (const [index, lift] of ["squat", "bench", "deadlift", "press"].entries()) {
    await nav("Add past workout");
    await page.getByLabel("Lift", { exact: true }).selectOption(lift);
    await page.getByLabel("Workout date", { exact: true }).fill(["2026-10-05", "2026-10-06", "2026-10-08", "2026-10-09"][index]);
    await nav("Create past workout");
    await nav("Mark main & BBB complete");
    await nav("Save past workout");
  }
  await nav("Overview");
  const card = page.getByRole("region", { name: "Active cycle", exact: true });
  await expect(card.locator('td[data-status="completed"]')).toHaveCount(4);
  await expect(card.locator('td[data-status="completed"] svg')).toHaveCount(4);
  await nav("History");
  await nav("Add past workout");
  await nav("Catch up my program");
  await page.getByLabel("Week", { exact: true }).selectOption("2");
  await page.getByLabel("Workout date", { exact: true }).fill("2026-10-12");
  page.once("dialog", dialog => dialog.dismiss());
  await nav("Create past workout");
  await expect(page.getByLabel("Week", { exact: true })).toHaveValue("2");
  page.once("dialog", dialog => dialog.accept());
  await nav("Create past workout");
  await expect(page.getByLabel("working set 1 reps", { exact: true })).toHaveValue("3");
  await page.reload();
  await nav("History");
  await nav("Resume past workout");
  await nav("Mark main & BBB complete");
  await nav("Save past workout");
  await expect(page.getByRole("region", { name: "Catch-up progress" })).toContainText("Bench press");
  await expect(page.getByRole("region", { name: "Catch-up progress" })).toContainText("Week 2");
  await nav("Continue from here");
  await expect(card.locator('td[data-status="completed"]')).toHaveCount(5);
  await expect(card.locator('td[data-status="completed"] svg')).toHaveCount(5);
  await nav("History");
  await expect(page.locator(".history-row")).toHaveCount(5);
});

test("catch-up records last week and this week's first two lifts, then continues at Thursday Deadlift", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 9, 14, 12));
  await page.goto("./");
  const nav = (name: string) =>
    page.getByRole("button", { name, exact: true }).click();
  await nav("History");
  await nav("Add past workout");
  const setup = page.getByRole("region", {
    name: "Add past workout",
    exact: true,
  });
  await setup
    .getByRole("button", { name: "Catch up my program", exact: true })
    .click();
  const dates = [
    "2026-10-05",
    "2026-10-06",
    "2026-10-08",
    "2026-10-09",
    "2026-10-12",
    "2026-10-13",
  ];
  for (let index = 0; index < dates.length; index++) {
    await expect(setup.getByLabel("Lift", { exact: true })).toHaveValue(
      ["squat", "bench", "deadlift", "press", "squat", "bench"][index],
    );
    await expect(setup.getByLabel("Lift", { exact: true })).toBeEnabled();
    await setup.getByLabel("Workout date", { exact: true }).fill(dates[index]);
    await nav("Create past workout");
    await expect(
      page.getByLabel("Count as next program workout"),
    ).toBeChecked();
    if (index === 0) {
      await page.reload();
      await nav("History");
      await nav("Resume past workout");
      await expect(
        page.getByLabel("Count as next program workout"),
      ).toBeChecked();
    }
    await nav("Mark main & BBB complete");
    await nav("Save past workout");
    await expect(
      page.getByRole("region", { name: "Catch-up progress" }),
    ).toBeVisible();
    if (index < dates.length - 1) await nav("Add another past workout");
  }
  const review = page.getByRole("region", { name: "Catch-up progress" });
  await expect(review).toContainText("Cycle 1 · Week 2");
  await expect(
    review.getByRole("heading", { name: "Deadlift", exact: true }),
  ).toBeVisible();
  await expect(review).toContainText("Thu");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/catch-up-${width}.png`,
      fullPage: true,
    });
  }
  await nav("Continue from here");
  await expect(
    page.getByRole("region", { name: "Next workout", exact: true }),
  ).toContainText("Deadlift");
  await expect(
    page.getByText("6 of 16 workouts", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Saved on device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Next workout", exact: true }),
  ).toContainText("Deadlift");
  await expect(
    page.getByText("6 of 16 workouts", { exact: true }),
  ).toBeVisible();
});

test("catch-up reviews the next cycle without starting a live workout or applying increases twice", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 9, 14, 12));
  await page.goto("./");
  const nav = (name: string) =>
    page.getByRole("button", { name, exact: true }).click();
  const backup = async () => {
    await nav("Settings");
    await openSettingsGroup(page, "data");
    const pending = page.waitForEvent("download");
    await nav("JSON backup");
    const stream = await (await pending).createReadStream();
    let raw = "";
    for await (const chunk of stream!) raw += chunk.toString();
    return JSON.parse(raw);
  };
  const before = await backup();
  before.position = 15;
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "catch-up.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(before)),
    });
  await nav("History");
  await nav("Add past workout");
  await nav("Catch up my program");
  await page.getByLabel("Workout date", { exact: true }).fill("2026-10-09");
  await nav("Create past workout");
  await nav("Mark main & BBB complete");
  await nav("Save past workout");
  await expect(
    page.getByRole("region", { name: "Catch-up progress" }),
  ).toContainText("Cycle 2 · Week 1");
  await nav("Add another past workout");
  await nav("Create past workout");
  const review = page.getByRole("dialog", { name: "Set up cycle 2" });
  await expect(review).toBeVisible();
  await review.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Add past workout", exact: true }),
  ).toBeVisible();
  await nav("Create past workout");
  await review
    .getByRole("button", { name: "Continue catch-up", exact: true })
    .click();
  await expect(page.getByLabel("Count as next program workout")).toBeChecked();
  await nav("Mark main & BBB complete");
  await nav("Save past workout");
  const after = await backup();
  expect(after.cycle).toBe(2);
  expect(after.position).toBe(1);
  expect(after.active).toBeNull();
  expect(after.pastWorkout).toBeNull();
  expect(after.settings.maxes.squat).toBe(
    before.settings.maxes.squat + before.settings.increases.squat,
  );
  expect(after.cycleSetup.confirmed).toBe(true);
  expect(after.history).toHaveLength(2);
});
