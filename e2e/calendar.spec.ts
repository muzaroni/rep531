import { openSettingsGroup } from "./settings-navigation";
import { test, expect } from "./fixtures";

test("week and day browsing previews prescriptions without changing the live workout", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 9, 5, 12));
  await page.goto("./");
  const calendar = page.getByRole("region", {
    name: "Cycle schedule",
    exact: true,
  });
  await expect(calendar.locator(".calendar-day")).toHaveCount(7);
  await expect(
    calendar.getByRole("button", { name: "Week 1 · 5s", exact: true }),
  ).toHaveAttribute("aria-current", "step");
  await calendar
    .getByRole("button", { name: "Week 2 · 3s", exact: true })
    .click();
  await expect(
    calendar.getByRole("heading", { name: "Week 2", exact: true }),
  ).toBeVisible();
  await expect(calendar.locator(".calendar-protocol")).toHaveText(
    "3 / 3 / 3+ reps · 70% / 80% / 90%",
  );
  await calendar
    .getByRole("button", {
      name: "Squat · planned · show details",
      exact: true,
    })
    .click();
  const detail = calendar.getByRole("region", {
    name: "Day details",
    exact: true,
  });
  await expect(detail.locator(".calendar-detail-sets strong")).toHaveText([
    "160 lb × 3",
    "180 lb × 3",
    "205 lb × 3+",
  ]);
  await expect(detail).toContainText("BBB · Squat · 5 × 10 · 115 lb");
  await expect(detail).toContainText("Hanging leg raise");
  await expect(
    detail.getByRole("button", {
      name: /Start this workout|Resume this workout/,
    }),
  ).toHaveCount(0);
  await expect(
    page.locator(".next-workout .overview-main-sets strong"),
  ).toHaveText(["145 lb", "170 lb", "190 lb"]);
  await expect(
    page.getByText("0 / 16 workouts", { exact: true }),
  ).toBeVisible();
  await calendar
    .getByRole("button", { name: "Week 4 · Deload", exact: true })
    .click();
  await calendar
    .getByRole("button", {
      name: "Squat · planned · show details",
      exact: true,
    })
    .click();
  await expect(detail.locator(".calendar-detail-sets strong")).toHaveText([
    "90 lb × 5",
    "115 lb × 5",
    "135 lb × 5",
  ]);
  await expect(detail).not.toContainText("BBB ·");
  await calendar.locator(".calendar-day").last().click();
  await expect(detail).toContainText("Rest day · no lifting scheduled.");
  await calendar
    .getByRole("button", { name: "Close day details", exact: true })
    .click();
  await expect(detail).toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await calendar
    .getByRole("button", { name: "Current week", exact: true })
    .click();
  await expect(
    calendar.getByRole("heading", { name: "This week", exact: true }),
  ).toBeVisible();
  const notice = page.getByRole("button", { name: "Got it", exact: true });
  if (await notice.isVisible()) await notice.click();
  await calendar.screenshot({ path: "test-results/calendar-mobile.png" });
  // Browse elsewhere, then use the normal primary action: it still starts week one.
  await calendar
    .getByRole("button", { name: "Week 3 · 5/3/1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await expect(page.locator(".workout-title .eyebrow")).toContainText(
    "CYCLE 1 / WEEK 1",
  );
});

test("calendar shows actual workout dates, cardio and original history in selected units", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 9, 5, 12));
  const nav = (name: string) =>
    page.getByRole("button", { name, exact: true }).click();
  await page.goto("./");
  await nav("Start workout");
  await nav("Settings");
  const pending = page.waitForEvent("download");
  await openSettingsGroup(page, "data");
  await nav("JSON backup");
  const stream = await (await pending).createReadStream();
  let json = "";
  for await (const chunk of stream!) json += chunk.toString();
  const state = JSON.parse(json);
  const logged = state.active;
  logged.date = new Date(2026, 9, 6, 12).toISOString();
  logged.completedAt = new Date(2026, 9, 6, 13).toISOString();
  logged.sets.forEach((set: any) => {
    set.done = set.kind === "working" || set.kind === "bbb";
  });
  state.history = [logged];
  state.active = null;
  state.position = 1;
  state.settings.units = "kg";
  state.settings.rounding = 2.5;
  state.cardio = [
    {
      id: "run",
      date: "2026-10-07",
      name: "Easy run",
      minutes: 25,
      notes: "Park loop",
    },
  ];
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles({
    name: "calendar.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(state)),
  });
  const calendar = page.getByRole("region", {
    name: "Cycle schedule",
    exact: true,
  });
  const monday = calendar.getByRole("button", {
    name: /^Monday, October 5, 2026/,
  });
  await expect(monday).toHaveAccessibleName(/Rest day/);
  await calendar
    .getByRole("button", { name: /^Tuesday, October 6, 2026.*Squat logged/ })
    .click();
  const detail = calendar.getByRole("region", {
    name: "Day details",
    exact: true,
  });
  await expect(detail).toContainText("Logged · Week 1");
  await expect(detail).toContainText("Planned · Week 1");
  await expect(
    detail.locator(".calendar-workout-detail").first(),
  ).toContainText("65 kg × 5");
  await expect(detail).not.toContainText(/\blb\b/);
  await calendar
    .getByRole("button", { name: /^Wednesday, October 7, 2026.*Easy run/ })
    .click();
  await expect(detail).toContainText("Easy run · 25 min");
  await expect(detail).toContainText("Park loop");
  const notice = page.getByRole("button", { name: "Got it", exact: true });
  if (await notice.isVisible()) await notice.click();
  await calendar.screenshot({
    path: "test-results/calendar-cardio-mobile.png",
  });
  await calendar
    .getByRole("button", {
      name: "Squat · completed · show details",
      exact: true,
    })
    .click();
  await detail
    .getByRole("button", { name: "View logged workout", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Back to history", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".tm-tag strong")).toHaveText("100 kg");
});
