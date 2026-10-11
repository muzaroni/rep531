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
    page.getByText("12 / 16 workouts", { exact: true }),
  ).toBeVisible();
  await nav("Settings");
  await openSettingsGroup(page, "program");
  await page.getByRole("checkbox", { name: /Skip deload week/ }).check();
  await page
    .getByRole("button", { name: "Save changes", exact: true })
    .first()
    .click();
  await openSettingsGroup(page, "maxes");
  await expect(
    page.getByRole("spinbutton", { name: "Squat training max", exact: true }),
  ).toHaveValue("235");
  await page
    .getByRole("button", { name: "Save changes", exact: true })
    .first()
    .click();
  await nav("Overview");
  await expect(
    page.getByText("0 / 12 workouts", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".overview-heading .eyebrow")).toHaveText(
    "CYCLE 2 · WEEK 1 / 3",
  );
  await expect(page.locator(".overview-tm strong")).toHaveText("235 lb");
  await page.reload();
  await expect(page.locator(".overview-tm strong")).toHaveText("235 lb");
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
  await page
    .getByRole("button", { name: "Save changes", exact: true })
    .first()
    .click();
  await page.reload();
  await expect(
    page.getByText("1 / 12 workouts", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".overview-weeks button")).toHaveCount(3);
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

test("named themes lead Preferences with colored text and responsive flare", async ({
  page,
}) => {
  const nav = (name: string) =>
    page.getByRole("button", { name, exact: true }).click();
  await page.goto("./");
  const gradients = new Set<string>();
  for (const [value, label, color] of [
    ["lime", "Acid Moss", "rgb(196, 255, 36)"],
    ["blue", "Deep Cosmos", "rgb(54, 185, 255)"],
    ["orange", "Solar Flare", "rgb(255, 140, 38)"],
    ["starry", "Starry Night", "rgb(216, 232, 255)"],
    ["horizon", "Event Horizon", "rgb(203, 213, 225)"],
  ]) {
    await nav("Settings");
    const preferences = page.locator(".panel").filter({
      has: page.getByRole("heading", {
        name: "Appearance & device",
        exact: true,
      }),
    });
    await openSettingsGroup(page, "appearance");
    await expect(preferences.locator("select").first()).toHaveAccessibleName(
      "Theme color",
    );
    const select = page.getByRole("combobox", {
      name: "Theme color",
      exact: true,
    });
    await openSettingsGroup(page, "appearance");
    await select.selectOption(value);
    await openSettingsGroup(page, "appearance");
    await expect(select.locator(`option[value="${value}"]`)).toHaveText(label);
    expect(await select.evaluate((el) => getComputedStyle(el).color)).toBe(
      color,
    );
    expect(
      await select
        .locator(`option[value="${value}"]`)
        .evaluate((el) => getComputedStyle(el).color),
    ).toBe(color);
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .first()
      .click();
    // Shared action styles must follow the saved theme on every page.
    await openSettingsGroup(page, "data");
    for (const action of ["JSON backup", "Markdown history"]) {
      expect(
        await page
          .getByRole("button", { name: action, exact: true })
          .evaluate((el) => getComputedStyle(el).color),
      ).toBe(color);
    }
    expect(
      await page
        .locator(".import-label")
        .evaluate((el) => getComputedStyle(el).color),
    ).toBe(color);
    await openSettingsGroup(page, "data");
    await page
      .locator(".data-actions")
      .screenshot({ path: `test-results/theme-${value}-data-actions.png` });
    await nav("History");
    for (const action of ["Add past workout", "Export"]) {
      expect(
        await page
          .getByRole("button", { name: action, exact: true })
          .evaluate((el) => getComputedStyle(el).color),
      ).toBe(color);
    }
    await page
      .locator(".history-actions")
      .screenshot({ path: `test-results/theme-${value}-history-actions.png` });
    await nav("Overview");
    expect(
      await page
        .getByRole("button", { name: "Log cardio", exact: true })
        .evaluate((el) => getComputedStyle(el).color),
    ).toBe(color);
    gradients.add(
      await page
        .locator(".app")
        .evaluate((el) => getComputedStyle(el).backgroundImage),
    );
    if (value === "horizon") {
      expect(
        await page
          .locator("html")
          .evaluate((el) => getComputedStyle(el).backgroundColor),
      ).toBe("rgb(0, 0, 0)");
      expect(
        await page
          .locator(".next-workout")
          .evaluate((el) => getComputedStyle(el).backgroundColor),
      ).toBe("rgb(0, 0, 0)");
      expect(
        await page
          .locator(".app")
          .evaluate((el) => getComputedStyle(el).backgroundImage),
      ).not.toContain("gradient");
    }
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const notice = page.getByRole("button", { name: "Got it", exact: true });
    if (await notice.isVisible()) await notice.click();
    await page.screenshot({
      path: `test-results/theme-${value}.png`,
      fullPage: true,
    });
  }
  expect(gradients.size).toBe(5);
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
