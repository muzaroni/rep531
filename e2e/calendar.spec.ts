import { openSettingsGroup } from "./settings-navigation";
import { test, expect } from "./fixtures";

test("swiping the cycle card browses weeks without advancing training", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 9, 5, 12));
  await page.goto("./");
  const calendar = page.getByRole("region", { name: "Cycle schedule" });
  await calendar.evaluate((element) => {
    const start = new Touch({
      identifier: 1,
      target: element,
      clientX: 260,
      clientY: 220,
    });
    const end = new Touch({
      identifier: 1,
      target: element,
      clientX: 80,
      clientY: 224,
    });
    element.dispatchEvent(
      new TouchEvent("touchstart", {
        changedTouches: [start],
        touches: [start],
        bubbles: true,
      }),
    );
    element.dispatchEvent(
      new TouchEvent("touchend", { changedTouches: [end], bubbles: true }),
    );
  });
  await expect(calendar).toContainText("Cycle 1 · Week 2 of 4");
  await expect(
    calendar.locator(".calendar-lift-summary").first(),
  ).toContainText("Main · 160×3 · 180×3 · 205×3+ lb");
  await expect(
    page.getByText("0 of 16 workouts", { exact: true }),
  ).toBeVisible();
  await calendar.getByRole("button", { name: "Previous week" }).click();
  await expect(calendar).toContainText("Cycle 1 · Week 1 of 4");
});

test("week and day browsing previews prescriptions without changing the live workout", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 9, 5, 12));
  await page.goto("./");
  const calendar = page.getByRole("region", {
    name: "Cycle schedule",
    exact: true,
  });
  await expect(calendar.locator(".calendar-day")).toHaveCount(0);
  await expect(
    calendar
      .locator(".week-card-header")
      .getByRole("button", { name: "Edit program" }),
  ).toBeVisible();
  await expect(calendar).toContainText("Cycle 1 · Week 1 of 4");
  await expect(
    calendar.locator(".calendar-lift-summary").first(),
  ).toContainText("Main · 145×5 · 170×5 · 190×5+ lb");
  await expect(
    calendar.locator(".calendar-lift-summary .lift-icon"),
  ).toHaveCount(4);
  await calendar.getByRole("button", { name: "Next week" }).click();
  await expect(
    calendar.getByRole("heading", { name: /3s · Oct/ }),
  ).toBeVisible();
  await calendar
    .getByRole("button", {
      name: /Squat · Planned · main sets 160×3 · 180×3 · 205×3\+ lb · show details/,
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
    page.getByText("0 of 16 workouts", { exact: true }),
  ).toBeVisible();
  await calendar.getByRole("button", { name: "Next week" }).click();
  await calendar.getByRole("button", { name: "Next week" }).click();
  await calendar
    .getByRole("button", {
      name: /Squat · Planned · main sets 90×5 · 115×5 · 135×5 lb · show details/,
    })
    .click();
  await expect(detail.locator(".calendar-detail-sets strong")).toHaveText([
    "90 lb × 5",
    "115 lb × 5",
    "135 lb × 5",
  ]);
  await expect(detail).not.toContainText("BBB ·");
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
    if (width === 320) {
      await calendar.screenshot({ path: "test-results/calendar-320.png" });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (let week = 0; week < 3; week++) {
    await calendar.getByRole("button", { name: "Previous week" }).click();
  }
  await expect(calendar).toContainText("Cycle 1 · Week 1 of 4");
  const notice = page.getByRole("button", { name: "Got it", exact: true });
  if (await notice.isVisible()) await notice.click();
  await calendar.screenshot({ path: "test-results/calendar-mobile.png" });
  // Browse elsewhere, then use the normal primary action: it still starts week one.
  await calendar.getByRole("button", { name: "Next week" }).click();
  await calendar.getByRole("button", { name: "Next week" }).click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await expect(page.locator(".workout-title .eyebrow")).toContainText(
    "CYCLE 1 / WEEK 1",
  );
});

test("cycle card shows actual workout dates and original history in selected units", async ({
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
  await calendar
    .getByRole("button", { name: /Squat · Logged · main sets/ })
    .click();
  const detail = calendar.getByRole("region", {
    name: "Day details",
    exact: true,
  });
  await expect(
    detail.getByRole("heading", { name: "Tuesday, Oct 6" }),
  ).toBeVisible();
  await expect(detail).toContainText("Logged · Week 1");
  await expect(detail).toContainText("Planned · Week 1");
  await expect(
    detail.locator(".calendar-workout-detail").first(),
  ).toContainText("65 kg × 5");
  await expect(detail).not.toContainText(/\blb\b/);
  const notice = page.getByRole("button", { name: "Got it", exact: true });
  if (await notice.isVisible()) await notice.click();
  await calendar.screenshot({
    path: "test-results/calendar-history-mobile.png",
  });
  await detail
    .getByRole("button", { name: "View logged workout", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Back to history", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".set-table-labels").first()).toContainText("KG");
  await page
    .getByRole("button", { name: "Back to history", exact: true })
    .click();
  await expect(page.locator(".history-list")).toContainText("Easy run");
});
