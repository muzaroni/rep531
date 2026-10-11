import { test, expect } from "./fixtures";
import { openSettingsGroup } from "./settings-navigation";
const nav = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("button", { name, exact: true }).click();

test("compact rest sheet swipes away without stopping and survives reload", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("./");
  await nav(page, "Start workout");
  await page.getByLabel("warmup set 2 weight", { exact: true }).fill("100");
  await page.getByLabel("warmup set 2 reps", { exact: true }).fill("7");
  await page.getByLabel("Complete warmup set 1", { exact: true }).check();
  const sheet = page.getByRole("dialog", { name: "Rest timer controls" });
  await expect(sheet).toBeVisible();
  await expect(sheet).not.toContainText("UP NEXT");
  expect((await sheet.boundingBox())!.height).toBeLessThan(170);
  await expect(sheet.getByRole("timer")).toContainText("1:00");
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem("bbb-rest-timer")!).deadline,
  );
  const handle = page.getByRole("button", { name: "Pull down to hide timer" });
  await handle.dispatchEvent("pointerdown", {
    pointerId: 1,
    clientY: 200,
    pointerType: "touch",
  });
  await handle.dispatchEvent("pointermove", {
    pointerId: 1,
    clientY: 280,
    pointerType: "touch",
  });
  await handle.dispatchEvent("pointerup", {
    pointerId: 1,
    clientY: 280,
    pointerType: "touch",
  });
  await expect(sheet).toBeHidden();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("bbb-rest-timer")!).deadline,
    ),
  ).toBe(before);
  await page.clock.runFor(10000);
  await nav(page, "Open rest timer");
  await expect(page.getByRole("timer")).toContainText("0:50");
  await nav(page, "Pause timer");
  await page.reload();
  await nav(page, "Workout");
  await nav(page, "Open rest timer");
  await expect(page.getByRole("timer")).toContainText("0:50");
  await expect(page.getByRole("timer")).toContainText("PAUSED");
  await nav(page, "Add 30 seconds");
  await expect(page.getByRole("timer")).toContainText("1:20");
  await nav(page, "Resume timer");
  await page.clock.runFor(1000);
  await expect(page.getByRole("timer")).toContainText("1:19");
  await nav(page, "Stop timer");
  expect(
    await page.evaluate(() => localStorage.getItem("bbb-rest-timer")),
  ).toBeNull();
});

test("workout timer expiry once, alert preferences and narrow layouts work", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.assign(window, { vibrationCalls: 0 });
    Object.defineProperty(navigator, "vibrate", {
      value: () => {
        (window as unknown as { vibrationCalls: number }).vibrationCalls++;
        return true;
      },
      configurable: true,
    });
  });
  await page.clock.install();
  await page.goto("./");
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Timer", exact: true }),
  ).toHaveCount(0);
  await nav(page, "Start workout");
  await page.getByLabel("Complete warmup set 1", { exact: true }).check();
  await expect(page.getByRole("timer")).toContainText("1:00");
  await nav(page, "Overview");
  await page.clock.runFor(60000);
  await expect(
    page.getByRole("dialog", { name: "Rest timer controls" }),
  ).toContainText("Rest complete.");
  expect(
    await page.evaluate(
      () => (window as unknown as { vibrationCalls: number }).vibrationCalls,
    ),
  ).toBe(1);
  await page.clock.runFor(2000);
  expect(
    await page.evaluate(
      () => (window as unknown as { vibrationCalls: number }).vibrationCalls,
    ),
  ).toBe(1);
  await nav(page, "Dismiss timer");
  await page.reload();
  await nav(page, "Workout");
  await nav(page, "Open rest timer");
  await expect(page.getByRole("timer")).toContainText("REST COMPLETE");
  expect(
    await page.evaluate(
      () => (window as unknown as { vibrationCalls: number }).vibrationCalls,
    ),
  ).toBe(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/timer-complete-mobile.png",
    fullPage: true,
  });
  await nav(page, "Settings");
  await openSettingsGroup(page, "equipment");
  await page.getByRole("checkbox", { name: /Timer sound/ }).uncheck();
  await page.getByRole("checkbox", { name: /Timer vibration/ }).uncheck();
  await nav(page, "Save changes");
  await nav(page, "Workout");
  await page.getByLabel("Complete warmup set 2", { exact: true }).check();
  await page.clock.runFor(60000);
  expect(
    await page.evaluate(
      () => (window as unknown as { vibrationCalls: number }).vibrationCalls,
    ),
  ).toBe(0);
});

test("compact timer opens for working and BBB sets without next-set details", async ({
  page,
}) => {
  await page.goto("./");
  await nav(page, "Settings");
  await openSettingsGroup(page, "appearance");
  await page
    .getByRole("combobox", { name: "Weight units", exact: true })
    .selectOption("kg");
  await nav(page, "Save changes");
  await nav(page, "Overview");
  await nav(page, "Start workout");
  await page.getByLabel("Complete working set 1", { exact: true }).check();
  const sheet = page.getByRole("dialog", { name: "Rest timer controls" });
  await expect(sheet.getByRole("timer")).toContainText("3:00");
  await expect(sheet).not.toContainText("UP NEXT");
  await page.screenshot({ path: "test-results/timer-sheet-mobile.png" });
  await nav(page, "Dismiss timer");
  await page.getByLabel("Complete bbb set 1", { exact: true }).check();
  await expect(sheet.getByRole("timer")).toContainText("1:30");
});

test("notification permission is explicit and completion delivers one local alert", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const alerts = {
      requests: 0,
      deliveries: [] as { title: string; body?: string }[],
    };
    Object.assign(window, { timerNotificationStats: alerts });
    class TestNotification {
      static permission: NotificationPermission = "default";
      static async requestPermission() {
        alerts.requests++;
        TestNotification.permission = "granted";
        return "granted";
      }
      constructor(title: string, options: NotificationOptions) {
        alerts.deliveries.push({ title, body: options.body });
      }
    }
    Object.defineProperty(window, "Notification", {
      value: TestNotification,
      configurable: true,
    });
    if (globalThis.ServiceWorkerRegistration)
      ServiceWorkerRegistration.prototype.showNotification = async function (
        title,
        options,
      ) {
        alerts.deliveries.push({ title, body: options?.body });
      };
  });
  await page.clock.install();
  await page.goto("./");
  await nav(page, "Settings");
  await openSettingsGroup(page, "equipment");
  await page.getByRole("checkbox", { name: /Timer notifications/ }).check();
  await expect(page.locator(".settings-save-bar [role=status]")).toContainText(
    "Notifications enabled",
  );
  await nav(page, "Save changes");
  await nav(page, "Overview");
  await nav(page, "Start workout");
  await page.getByLabel("Complete warmup set 1", { exact: true }).check();
  await page.clock.runFor(60000);
  const stats = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            timerNotificationStats: {
              requests: number;
              deliveries: { title: string; body: string }[];
            };
          }
        ).timerNotificationStats,
    );
  await expect.poll(async () => (await stats()).deliveries.length).toBe(1);
  expect((await stats()).requests).toBe(1);
  expect((await stats()).deliveries[0]).toMatchObject({
    title: "Rest complete",
    body: expect.stringContaining("Squat:"),
  });
  await page.clock.runFor(2000);
  expect((await stats()).deliveries).toHaveLength(1);
});
