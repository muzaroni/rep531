import { waitForSettingsAutosave } from "./fixtures";
import { test, expect } from "./fixtures";
import { openSettingsGroup } from "./settings-navigation";

test("save toast shows activity, dismisses success and replaces the footer", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator("main > footer")).toHaveCount(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await openSettingsGroup(page, "maxes");
  await page.getByLabel("Squat training max", { exact: true }).fill("260");
  await expect(page.locator(".save-toast .save-spinner")).toBeVisible();
  await expect(page.locator(".settings-autosave")).toHaveText("Saved");
  await expect(page.locator(".settings-autosave")).toBeHidden();
});

test("Overview aligns card picker, keeps cardio in the session card, and Settings opens install instructions", async ({
  page,
}) => {
  await page.goto("./");
  await page.locator(".page-transition").evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished),
    );
  });
  await expect(page.locator(".overview-tm")).toHaveCount(0);
  await expect(page.locator(".overview-variant")).toHaveCount(0);
  await expect(page.locator(".overview-heading")).not.toContainText(
    "Normal BBB",
  );
  await expect(
    page.locator(".next-workout").getByRole("button", { name: "Log cardio" }),
  ).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const heading = await page.locator(".overview-heading").boundingBox();
    const picker = await page
      .getByRole("button", { name: "Manage overview cards" })
      .boundingBox();
    const eyebrow = await page
      .locator(".overview-heading .eyebrow")
      .boundingBox();
    const title = await page.locator(".overview-heading h1").boundingBox();
    expect(picker!.width).toBeGreaterThanOrEqual(44);
    expect(picker!.height).toBeGreaterThanOrEqual(44);
    expect(picker!.x).toBeGreaterThan(title!.x + title!.width);
    expect(picker!.y).toBeGreaterThanOrEqual(heading!.y);
    expect(picker!.y + picker!.height).toBeLessThanOrEqual(
      heading!.y + heading!.height,
    );
    expect(eyebrow!.x).toBe(title!.x);
    const status = await page
      .locator(".next-workout .session-status")
      .boundingBox();
    const lift = await page.locator(".next-workout-title").boundingBox();
    const cardio = await page
      .locator(".next-workout .overview-cardio-action")
      .boundingBox();
    expect(lift!.y - (status!.y + status!.height)).toBeLessThanOrEqual(6);
    expect(cardio!.height).toBeGreaterThanOrEqual(44);
    if (width === 320) {
      await page
        .locator(".next-workout")
        .screenshot({ path: "test-results/next-workout-320.png" });
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator('.settings-page .settings-group').last()).toHaveAttribute('data-section', 'install');
  await openSettingsGroup(page, "install");
  await expect(page.locator('.settings-install')).toContainText('Add to Home Screen');
  await expect(page.locator('.settings-install')).toContainText('Ready offline');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test("Event Horizon is the only available appearance after reload", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "horizon");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await openSettingsGroup(page, "appearance");
  await expect(page.getByRole("combobox", { name: "Theme color" })).toHaveCount(
    0,
  );
  await expect(page.locator(".settings-group-toggle small")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "horizon");
});

test("settings groups retain drafts, remember the open section and fit narrow phones", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator(".settings-group")).toHaveCount(7);
  await expect(page.getByRole("button", { name: "Manage accessories", exact: true })).toHaveCount(0);
  await expect(
    page.locator(".settings-group-toggle[aria-expanded=true]"),
  ).toHaveCount(1);
  await openSettingsGroup(page, "maxes");
  await page.getByLabel("Squat training max", { exact: true }).fill("250");
  await openSettingsGroup(page, "program");
  await expect(
    page.getByLabel("Squat training day", { exact: true }).locator("option"),
  ).toHaveText(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  await expect(
    page.getByLabel("Squat training day", { exact: true }),
  ).toHaveValue("1");
  await expect(
    page.getByLabel("Squat training max", { exact: true }),
  ).toBeHidden();
  await openSettingsGroup(page, "accessories");
  await expect(
    page.getByRole("heading", { name: "Accessories.", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New exercise", exact: true }).click();
  await page
    .getByLabel("Accessory name", { exact: true })
    .fill("Custom test exercise");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page
    .getByRole("button", { name: "Back to program", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Edit program.", exact: true })).toBeVisible();
  await expect(page.locator(".settings-group")).toHaveCount(1);
  await openSettingsGroup(page, "maxes");
  await expect(
    page.getByLabel("Squat training max", { exact: true }),
  ).toHaveValue("250");
  await waitForSettingsAutosave(page);
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Training maxes", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByLabel("Squat training max", { exact: true }),
  ).toHaveValue("250");
  await openSettingsGroup(page, "accessories");
  await expect(
    page.getByRole("button", {
      name: "Edit Custom test exercise",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Back to program", exact: true })
    .click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(
      page.locator(".settings-group-toggle[aria-expanded=true]"),
    ).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Save changes", exact: true }),
    ).toHaveCount(0);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/settings-grouped-mobile.png",
    fullPage: true,
  });
});

test("invalid settings stay unsaved until corrected", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await openSettingsGroup(page, "equipment");
  await page.getByLabel("Available kg plates", { exact: true }).fill("");
  await expect(page.locator(".settings-autosave")).toContainText(
    "Changes not saved",
  );
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await openSettingsGroup(page, "equipment");
  await expect(
    page.getByLabel("Available kg plates", { exact: true }),
  ).toHaveValue("25, 20, 10, 5, 2.5");
  await page
    .getByLabel("Available kg plates", { exact: true })
    .fill("25, 10, 5");
  await waitForSettingsAutosave(page);
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await openSettingsGroup(page, "equipment");
  await expect(
    page.getByLabel("Available kg plates", { exact: true }),
  ).toHaveValue("25, 10, 5");
});

test("settings autosave valid edits, pause for blank numbers and flush on navigation", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await openSettingsGroup(page, "maxes");
  const max = page.getByLabel("Squat training max", { exact: true });
  await max.fill("250");
  await expect(page.locator(".settings-autosave")).toHaveText("Saved");
  await max.fill("");
  await expect(page.locator(".settings-autosave")).toContainText(
    "Finish entering",
  );
  await page.waitForTimeout(800);
  await expect(max).toHaveValue("");
  await max.fill("260");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await openSettingsGroup(page, "maxes");
  await expect(max).toHaveValue("260");
  await waitForSettingsAutosave(page);
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await openSettingsGroup(page, "maxes");
  await expect(max).toHaveValue("260");
});

test("Settings design roles and local-data dialog work at all widths", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await openSettingsGroup(page, "data");
  {
    const roles = await page.locator(".settings-page").evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        action: styles.getPropertyValue("--role-action").trim(),
        surface: styles.getPropertyValue("--role-surface").trim(),
        focus: styles.getPropertyValue("--role-focus").trim(),
      };
    });
    expect(roles.action).toBeTruthy();
    expect(roles.surface).toBeTruthy();
    expect(roles.focus).toBe(roles.action);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.getByRole("button", { name: "About local data" }).click();
      const dialog = page.getByRole("dialog", {
        name: "Your data stays on this device",
      });
      await expect(dialog).toBeVisible();
      const bounds = await dialog.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      if ([320, 390, 1440].includes(width)) {
        await page.screenshot({
          path: `test-results/settings-pilot-${width}.png`,
        });
      }
    }
  }
});



