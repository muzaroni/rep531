import { waitForSettingsAutosave } from "./fixtures";
import { openSettingsGroup } from "./settings-navigation";
import { test, expect } from "./fixtures";

test("skipping an idle deload advances once and keeps cycle increases on repeated saves", async ({
  page,
}) => {
  const nav = (name: string) =>
    page.getByRole("button", { name, exact: true }).click();
  await page.goto("./");
  await nav("Settings");
  const pendingDownload = page.waitForEvent("download");
  await openSettingsGroup(page, "data");
  await nav("JSON backup");
  const stream = await (await pendingDownload).createReadStream();
  let json = "";
  for await (const chunk of stream!) json += chunk.toString();
  const backup = JSON.parse(json);
  backup.position = 12;
  backup.settings.autoIncrease = true;
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles({
    name: "deload.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByText("12 of 16 workouts", { exact: true }),
  ).toBeVisible();
  await nav("Settings");
  await openSettingsGroup(page, "program");
  await page.getByRole("checkbox", { name: /Skip deload week/ }).check();
  await waitForSettingsAutosave(page);
  await openSettingsGroup(page, "maxes");
  await expect(
    page.getByRole("spinbutton", { name: "Squat training max", exact: true }),
  ).toHaveValue("235");
  await waitForSettingsAutosave(page);
  await nav("Overview");
  await expect(
    page.getByText("0 of 12 workouts", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".overview-heading .eyebrow")).toHaveText(
    "CYCLE 2 · WEEK 1 / 3",
  );
  await page.reload();
  await nav("Settings");
  await openSettingsGroup(page, "maxes");
  await expect(
    page.getByLabel("Squat training max", { exact: true }),
  ).toHaveValue("235");
});

test("skip options persist, warmups can be skipped now, and only main/BBB gates finishing", async ({
  page,
}) => {
  const nav = (name: string) =>
    page.getByRole("button", { name, exact: true }).click();
  await page.goto("./");
  await nav("Start workout");
  await expect(
    page.getByRole("button", { name: "Finish workout", exact: true }),
  ).toBeDisabled();
  await nav("Skip warmups");
  await expect(
    page.getByRole("heading", { name: "Warm up", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(/Every change saves automatically/)).toHaveCount(
    0,
  );
  await page.reload();
  await nav("Resume workout");
  await expect(
    page.getByRole("heading", { name: "Warm up", exact: true }),
  ).toHaveCount(0);
  for (const kind of ["working", "bbb"]) {
    const sets = page.getByRole("checkbox", {
      name: new RegExp(`^Complete ${kind} set`),
    });
    for (let i = 0; i < (await sets.count()); i++) {
      await sets.nth(i).check();
      await nav("Dismiss timer");
    }
    if (kind === "working")
      await expect(
        page.getByRole("button", { name: "Finish workout", exact: true }),
      ).toBeDisabled();
  }
  await expect(
    page.getByRole("checkbox", {
      name: "Complete accessory set 1",
      exact: true,
    }),
  ).not.toBeChecked();
  await nav("Finish workout");
  await page.locator(".history-row").first().click();
  await expect(
    page.getByRole("checkbox", {
      name: "Complete accessory set 1",
      exact: true,
    }),
  ).not.toBeChecked();
  await nav("Settings");
  await openSettingsGroup(page, "program");
  await page.getByRole("checkbox", { name: /Skip warmups/ }).check();
  await openSettingsGroup(page, "program");
  await page.getByRole("checkbox", { name: /Skip deload week/ }).check();
  await waitForSettingsAutosave(page);
  await page.reload();
  await expect(
    page.getByText("1 of 12 workouts", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".week-swipe-dots span")).toHaveCount(3);
  await nav("Start workout");
  await expect(
    page.getByRole("heading", { name: "Warm up", exact: true }),
  ).toHaveCount(0);
  await nav("Settings");
  await openSettingsGroup(page, "program");
  await expect(
    page.getByRole("checkbox", { name: /Skip warmups/ }),
  ).toBeChecked();
  await openSettingsGroup(page, "program");
  await expect(
    page.getByRole("checkbox", { name: /Skip deload week/ }),
  ).toBeChecked();
});

test("Event Horizon colors actions and keeps its black surfaces", async ({
  page,
}) => {
  const nav = (name: string) =>
    page.getByRole("button", { name, exact: true }).click();
  await page.goto("./");
  await nav("Settings");
  await openSettingsGroup(page, "appearance");
  await expect(page.getByRole("combobox", { name: "Theme color" })).toHaveCount(0);
  await expect(page.locator(".settings-group-toggle small")).toHaveCount(0);
  await openSettingsGroup(page, "data");
  for (const action of ["JSON backup", "Markdown history"]) {
    await expect(page.getByRole("button", { name: action, exact: true })).toHaveCSS("color", "rgb(184, 145, 4)");
  }
  await expect(page.locator(".import-label")).toHaveCSS("color", "rgb(184, 145, 4)");
  await expect(page.getByRole("button", { name: "Reset cycle", exact: true })).toHaveCSS("color", "rgb(255, 154, 154)");
  await nav("History");
  for (const action of ["Add past workout", "Export"]) {
    await expect(page.getByRole("button", { name: action, exact: true })).toHaveCSS("color", "rgb(184, 145, 4)");
  }
  await nav("Overview");
  await expect(page.getByRole("button", { name: "Log cardio", exact: true })).toHaveCSS("color", "rgb(184, 145, 4)");
  const colorRoles = await page.locator("html").evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      primary: styles.getPropertyValue("--accent").trim(),
      secondary: styles.getPropertyValue("--accent-secondary").trim(),
      container: styles.getPropertyValue("--role-action-container").trim(),
      input: styles.getPropertyValue("--input").trim(),
    };
  });
  expect(colorRoles).toEqual({ primary: "#b89104", secondary: "#b59a36", container: "#29250f", input: "#0d0d0e" });
  await expect(page.locator("html")).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await expect(page.locator(".next-workout")).toHaveCSS("background-color", "rgba(18, 18, 19, 0.75)");
  await expect(page.locator(".app")).not.toHaveCSS("background-image", /gradient/);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  const sky = page.locator(".star-field");
  await expect(sky).toHaveAttribute("aria-hidden", "true");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(
    await sky.evaluate((el) => getComputedStyle(el, "::before").animationName),
  ).not.toBe("none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await sky.evaluate((el) => getComputedStyle(el, "::before").animationName),
  ).toBe("none");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "horizon");
});
