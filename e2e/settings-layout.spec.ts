import { test, expect } from "./fixtures";
import { openSettingsGroup } from "./settings-navigation";

test("settings groups retain drafts, remember the open section and fit narrow phones", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator(".settings-group")).toHaveCount(5);
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
  await page.getByRole("button", { name: /Manage accessories/ }).click();
  await expect(
    page.getByRole("heading", { name: "Accessories.", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New exercise", exact: true }).click();
  await page
    .getByLabel("Accessory name", { exact: true })
    .fill("Custom test exercise");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page
    .getByRole("button", { name: "Back to settings", exact: true })
    .click();
  await openSettingsGroup(page, "maxes");
  await expect(
    page.getByLabel("Squat training max", { exact: true }),
  ).toHaveValue("250");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Training maxes", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByLabel("Squat training max", { exact: true }),
  ).toHaveValue("250");
  await openSettingsGroup(page, "accessories");
  await page.locator(".accessory-library > summary").click();
  await expect(
    page.getByRole("button", {
      name: "Edit library Custom test exercise",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Back to settings", exact: true })
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
    const save = await page
      .getByRole("button", { name: "Save changes", exact: true })
      .boundingBox();
    expect(save!.y).toBeGreaterThanOrEqual(0);
    expect(save!.y + save!.height).toBeLessThan(844);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/settings-grouped-mobile.png",
    fullPage: true,
  });
});

test("saving reveals the section containing an invalid field", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await openSettingsGroup(page, "equipment");
  await page.getByLabel("Available kg plates", { exact: true }).fill("");
  await openSettingsGroup(page, "appearance");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Equipment & rest", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByLabel("Available kg plates", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".settings-save-bar [role=status]"),
  ).not.toContainText("Settings saved");
});
