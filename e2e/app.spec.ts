import { waitForSettingsAutosave } from "./fixtures";
import { openSettingsGroup } from "./settings-navigation";
import { test, expect } from "./fixtures";
test("mobile and desktop dashboard have no horizontal overflow", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "Overview." })).toBeVisible();
  const readyNotice = page.getByRole("button", { name: "Got it", exact: true });
  if (await readyNotice.isVisible()) await readyNotice.click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("touch handle reorders exercises and reset clears only current progress", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Complete working set 1", exact: true })
    .check();
  await page.getByRole("button", { name: "Pause timer" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const handle = page.getByRole("button", {
    name: "Drag Bench press to reorder",
    exact: true,
  });
  await openSettingsGroup(page, "program");
  await handle.scrollIntoViewIfNeeded();
  const target = await page
    .getByRole("button", { name: "Drag Squat to reorder", exact: true })
    .boundingBox();
  await openSettingsGroup(page, "program");
  await handle.dispatchEvent("pointerdown", {
    pointerId: 1,
    pointerType: "touch",
    clientX: target!.x + 10,
    clientY: target!.y + 60,
  });
  await openSettingsGroup(page, "program");
  await handle.dispatchEvent("pointerup", {
    pointerId: 1,
    pointerType: "touch",
    clientX: target!.x + 10,
    clientY: target!.y + 10,
  });
  await expect(page.locator('[data-order-index="0"]')).toContainText(
    "Bench press",
  );
  await waitForSettingsAutosave(page);
  page.on("dialog", (d) => d.accept());
  await openSettingsGroup(page, "data");
  await page.getByRole("button", { name: "Reset cycle", exact: true }).click();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Start workout", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("0 of 16 workouts", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("timer", { name: "Rest timer", exact: true })).toHaveCount(0);
});
test("workout saves edits, survives reload, completes and advances once", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: "working set 3 reps", exact: true })
    .fill("9");
  await page
    .getByRole("checkbox", { name: "Complete warmup set 1", exact: true })
    .check();
  await expect(page.getByRole("timer", { name: "Rest timer", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Dismiss timer" }).click();
  await expect(
    page.getByText("Saved on device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Resume workout" }).click();
  await expect(
    page.getByRole("spinbutton", { name: "working set 3 reps", exact: true }),
  ).toHaveValue("9");
  await expect(
    page.getByRole("checkbox", { name: "Complete warmup set 1", exact: true }),
  ).toBeChecked();
  const boxes = page.getByRole("checkbox");
  for (let i = 0; i < (await boxes.count()); i++) {
    await boxes.nth(i).check();
    const dismiss = page.getByRole("button", { name: "Dismiss timer" });
    if (await dismiss.isVisible()) await dismiss.click();
  }
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your progress." }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: /Main lift estimated one rep max progression/,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.locator(".next-workout h2")).toHaveText("Bench press");
  await expect(
    page.getByText("1 of 16 workouts", { exact: true }),
  ).toBeVisible();
});
test("settings, cardio, JSON backup and restore work on mobile", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await openSettingsGroup(page, "maxes");
  await page
    .getByRole("spinbutton", { name: "Squat one rep max", exact: true })
    .fill("300");
  await openSettingsGroup(page, "maxes");
  await expect(
    page.getByRole("spinbutton", { name: "Squat training max", exact: true }),
  ).toHaveValue("270");
  await openSettingsGroup(page, "appearance");
  await expect(page.getByRole("combobox", { name: "Theme color" })).toHaveCount(0);
  const reorderHandle = page.getByRole("button", {
    name: "Drag Bench press to reorder",
    exact: true,
  });
  await openSettingsGroup(page, "program");
  await reorderHandle.focus();
  await openSettingsGroup(page, "program");
  await reorderHandle.press("ArrowUp");
  await waitForSettingsAutosave(page);
  await expect(
    page.locator(".settings-autosave"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/settings-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.getByRole("button", { name: "Log cardio" }).click();
  await page
    .getByRole("textbox", { name: "Activity", exact: true })
    .fill("Cycling");
  await page
    .getByRole("spinbutton", { name: "Duration (minutes)" })
    .fill("31.5");
  await page.getByRole("button", { name: "Save cardio" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await openSettingsGroup(page, "data");
  await page.getByRole("button", { name: "JSON backup" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  await openSettingsGroup(page, "maxes");
  await page
    .getByRole("spinbutton", { name: "Squat training max", exact: true })
    .fill("100");
  await waitForSettingsAutosave(page);
  page.on("dialog", (d) => d.accept());
  await openSettingsGroup(page, "data");
  await page.locator("input[type=file]").setInputFiles(path!);
  await expect(
    page.getByText("Backup restored", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await openSettingsGroup(page, "maxes");
  await expect(
    page.getByRole("spinbutton", { name: "Squat training max", exact: true }),
  ).toHaveValue("270");
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByText("Cycling", { exact: true })).toBeVisible();
  await expect(page.getByText("31.5 minutes", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.getByRole("button", { name: "Log cardio", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Activity", exact: true }),
  ).toHaveValue("Cycling");
});
test("production app reloads and logs workouts without a network", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Overview." })).toBeVisible();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: "working set 1 weight", exact: true })
    .fill("150");
  await expect(
    page.getByText("Saved on device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Resume workout" }).click();
  await expect(
    page.getByRole("spinbutton", { name: "working set 1 weight", exact: true }),
  ).toHaveValue("150");
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  await expect(page.locator(".local-badge span")).toHaveText("OFFLINE");
  expect(
    await page.evaluate(async () => {
      await document.fonts.load('400 16px "Reddit Sans"');
      await document.fonts.load('italic 400 16px "Reddit Sans"');
      return (
        document.fonts.check('400 16px "Reddit Sans"') &&
        document.fonts.check('italic 400 16px "Reddit Sans"')
      );
    }),
  ).toBe(true);
  expect(
    await page
      .locator("input")
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily),
  ).toContain("Reddit Sans");
});

