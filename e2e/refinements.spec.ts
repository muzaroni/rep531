import { waitForSettingsAutosave } from "./fixtures";
import { openSettingsGroup, openSettingForLabel } from "./settings-navigation";
import { test, expect } from "./fixtures";

test("numeric fields stay empty while typing, retain 1RMs and save corrected values", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const tm = page.getByRole("spinbutton", {
    name: "Squat training max",
    exact: true,
  });
  await openSettingsGroup(page, "maxes");
  await tm.fill("");
  await openSettingsGroup(page, "maxes");
  await expect(tm).toHaveValue("");
  // A rerender caused by another control must not insert a zero.
  await openSettingsGroup(page, "maxes");
  await tm.pressSequentially("225");
  await openSettingsGroup(page, "maxes");
  await expect(tm).toHaveValue("225");
  await openSettingsGroup(page, "maxes");
  await expect(
    page.getByLabel("Squat converted training max", { exact: true }),
  ).toHaveText("≈ 100 kg");
  const oneRM = page.getByRole("spinbutton", {
    name: "Squat one rep max",
    exact: true,
  });
  await openSettingsGroup(page, "maxes");
  await oneRM.fill("300");
  await openSettingsGroup(page, "maxes");
  await expect(oneRM).toHaveValue("300");
  await openSettingsGroup(page, "maxes");
  await expect(tm).toHaveValue("270");
  await openSettingsGroup(page, "accessories");
  await openSettingsGroup(page, "accessories");
  await page
    .getByRole("button", { name: "Edit library Lat pulldown", exact: true })
    .click();
  for (const [label, value] of [
    ["Lat pulldown sets", "4"],
    ["Lat pulldown reps", "12"],
    ["Lat pulldown weight", "50"],
  ]) {
    await openSettingForLabel(page, label);
    const field = page.getByRole("spinbutton", { name: label, exact: true });
    await field.fill("");
    await expect(field).toHaveValue("");
    await field.pressSequentially(value);
    await expect(field).toHaveValue(value);
  }
  await page.getByRole("button", { name: "Done", exact: true }).click();
  for (const [label, value] of [
    ["Warmup (seconds)", "45"],
    ["BBB percentage", "60"],
    ["Week 1 set 1 percentage", "60"],
    ["Rounding increment", "5"],
  ]) {
    await openSettingForLabel(page, label);
    const field = page.getByRole("spinbutton", { name: label, exact: true });
    await field.fill("");
    await expect(field).toHaveValue("");
    await field.pressSequentially(value);
    await expect(field).toHaveValue(value);
  }
  // An abandoned required edit restores the saved draft instead of saving zero.
  await openSettingsGroup(page, "maxes");
  await tm.fill("");
  await openSettingsGroup(page, "maxes");
  await oneRM.focus();
  await openSettingsGroup(page, "maxes");
  await expect(tm).toHaveValue("270");
  await waitForSettingsAutosave(page);
  await expect(
    page.locator(".settings-autosave"),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await openSettingsGroup(page, "maxes");
  await expect(oneRM).toHaveValue("300");
  await openSettingsGroup(page, "maxes");
  await expect(tm).toHaveValue("270");
  await openSettingsGroup(page, "appearance");
  await page
    .getByRole("combobox", { name: "Weight units", exact: true })
    .selectOption("kg");
  await openSettingsGroup(page, "maxes");
  await expect(oneRM).toHaveValue("135");
  await openSettingsGroup(page, "maxes");
  await expect(tm).toHaveValue("120");
  await openSettingsGroup(page, "maxes");
  await expect(
    page.getByLabel("Squat converted training max", { exact: true }),
  ).toHaveText("≈ 265 lb");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  for (const [label, value] of [
    ["working set 1 weight", "155"],
    ["working set 1 reps", "8"],
  ]) {
    await openSettingForLabel(page, label);
    const field = page.getByRole("spinbutton", { name: label, exact: true });
    await field.fill("");
    await expect(field).toHaveValue("");
    await field.pressSequentially(value);
    await expect(field).toHaveValue(value);
  }
  await page.reload();
  await page.getByRole("button", { name: "Resume workout" }).click();
  await expect(
    page.getByRole("spinbutton", { name: "working set 1 weight", exact: true }),
  ).toHaveValue("155");
  await expect(
    page.getByRole("spinbutton", { name: "working set 1 reps", exact: true }),
  ).toHaveValue("8");
});

test("compact accessory controls align and conversion previews use both plate inventories", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const converted = page.getByLabel("Squat converted training max", {
    exact: true,
  });
  await openSettingsGroup(page, "maxes");
  await expect(converted).toHaveText("≈ 100 kg");
  await openSettingsGroup(page, "equipment");
  await page
    .getByRole("textbox", { name: "Available kg plates", exact: true })
    .fill("");
  await openSettingsGroup(page, "maxes");
  await expect(converted).toHaveText("Check kg plates");
  await openSettingsGroup(page, "equipment");
  await page
    .getByRole("textbox", { name: "Available kg plates", exact: true })
    .fill("25");
  await openSettingsGroup(page, "maxes");
  await expect(converted).toHaveText("≈ 120 kg");
  await openSettingsGroup(page, "equipment");
  await page
    .getByRole("textbox", { name: "Available kg plates", exact: true })
    .fill("25, 20, 10, 5, 2.5, 1.25");
  await openSettingsGroup(page, "maxes");
  await expect(converted).toHaveText("≈ 102.5 kg");
  await expect(
    page.getByRole("textbox", { name: /Accessory name/ }),
  ).toHaveCount(0);
  await openSettingsGroup(page, "accessories");
  await openSettingsGroup(page, "accessories");
  await expect(page.locator(".library-row")).toHaveCount(30);
  await openSettingsGroup(page, "accessories");
  await page
    .getByRole("button", { name: "Edit library Push up", exact: true })
    .click();
  await expect(page.getByRole("searchbox", { name: "Search accessories", exact: true })).toHaveCSS("padding-left", "34px");
  await expect(page.getByRole("dialog", { name: "Edit exercise", exact: true })).toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const fields = page.locator(".accessory-inline-numbers input");
    const sets = await fields.nth(0).boundingBox(),
      reps = await fields.nth(1).boundingBox(),
      weight = await fields.nth(2).boundingBox();
    expect(sets!.y).toBe(reps!.y);
    expect(reps!.y).toBe(weight!.y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/accessory-editor-mobile.png" });
});

