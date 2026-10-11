import { openSettingsGroup } from "./settings-navigation";
import { test, expect } from "./fixtures";
const nav = async (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("button", { name, exact: true }).click();
const save = async (page: import("@playwright/test").Page) => {
  await page
    .getByRole("button", { name: "Save changes", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Settings saved" }),
  ).toBeVisible();
};

test("saved daily selections update an existing workout, group sets, and survive reload", async ({
  page,
}) => {
  await page.goto("./");
  await nav(page, "Start workout");
  await page
    .getByRole("spinbutton", { name: "working set 1 weight", exact: true })
    .fill("155");
  await page
    .getByRole("spinbutton", { name: "accessory set 1 reps", exact: true })
    .fill("15");
  await page
    .getByRole("checkbox", { name: "Complete accessory set 1", exact: true })
    .check();
  await nav(page, "Dismiss timer");
  await nav(page, "Settings");
  await openSettingsGroup(page, "accessories");
  await page.locator(".accessory-library > summary").click();
  await openSettingsGroup(page, "accessories");
  await page
    .getByRole("checkbox", {
      name: "Squat accessory Hanging leg raise",
      exact: true,
    })
    .uncheck();
  for (const name of ["Push up", "Lat pulldown"]) {
    await openSettingsGroup(page, "accessories");
    await page
      .getByRole("checkbox", { name: `Squat accessory ${name}`, exact: true })
      .check();
  }
  await openSettingsGroup(page, "accessories");
  await nav(page, "Edit library Lat pulldown");
  for (const [field, value] of [
    ["sets", "2"],
    ["reps", "12"],
    ["weight", "60"],
  ])
    await page
      .getByRole("spinbutton", { name: `Lat pulldown ${field}`, exact: true })
      .fill(value);
  await nav(page, "Done");
  await page
    .getByRole("button", { name: "Arrange Lat pulldown", exact: true })
    .press("ArrowUp");
  await openSettingsGroup(page, "accessories");
  await expect(
    page.locator(".selected-accessory .accessory-edit strong"),
  ).toHaveText(["Lat pulldown", "Push up"]);
  await openSettingsGroup(page, "accessories");
  await page.locator(".selected-accessories").scrollIntoViewIfNeeded();
  const handle = page.getByRole("button", {
    name: "Arrange Push up",
    exact: true,
  });
  const target = await page
    .locator(".selected-accessory")
    .first()
    .boundingBox();
  await handle.dispatchEvent("pointerdown", {
    pointerId: 1,
    pointerType: "touch",
    clientX: target!.x + 20,
    clientY: target!.y + 80,
  });
  await handle.dispatchEvent("pointerup", {
    pointerId: 1,
    pointerType: "touch",
    clientX: target!.x + 20,
    clientY: target!.y + 20,
  });
  await openSettingsGroup(page, "accessories");
  await expect(
    page.locator(".selected-accessory .accessory-edit strong"),
  ).toHaveText(["Push up", "Lat pulldown"]);
  await page
    .getByRole("button", { name: "Arrange Lat pulldown", exact: true })
    .press("ArrowUp");
  await save(page);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Current workout accessories updated" }),
  ).toBeVisible();
  await nav(page, "Workout");
  await expect(page.locator(".accessory-workout-heading h3")).toHaveText([
    "Lat pulldown",
    "Push up",
    "Hanging leg raise",
  ]);
  await expect(page.locator(".accessory-workout-heading small")).toHaveText([
    "Pull · 2 sets",
    "Push · 5 sets",
    "Abs · 1 set",
  ]);
  await expect(
    page.getByRole("spinbutton", {
      name: "accessory set 1 weight",
      exact: true,
    }),
  ).toHaveValue("60");
  await expect(
    page.getByRole("spinbutton", { name: "accessory set 1 reps", exact: true }),
  ).toHaveValue("12");
  await expect(
    page.getByRole("spinbutton", { name: "accessory set 8 reps", exact: true }),
  ).toHaveValue("15");
  await expect(
    page.getByRole("checkbox", {
      name: "Complete accessory set 8",
      exact: true,
    }),
  ).toBeChecked();
  await expect(
    page.getByRole("spinbutton", { name: "working set 1 weight", exact: true }),
  ).toHaveValue("155");
  await page.reload();
  await nav(page, "Resume workout");
  await expect(page.locator(".accessory-workout-heading h3")).toHaveText([
    "Lat pulldown",
    "Push up",
    "Hanging leg raise",
  ]);
  await page.screenshot({
    path: "test-results/grouped-accessories.png",
    fullPage: true,
  });
  const boxes = page.getByRole("checkbox");
  for (let i = 0; i < (await boxes.count()); i++) {
    await boxes.nth(i).check();
    const dismiss = page.getByRole("button", {
      name: "Dismiss timer",
      exact: true,
    });
    if (await dismiss.isVisible()) await dismiss.click();
  }
  await nav(page, "Finish workout");
  await nav(page, "Overview");
  await nav(page, "Start workout");
  await expect(page.locator(".accessory-workout-heading h3")).toHaveText([
    "Lat pulldown",
  ]);
  await expect(page.locator(".accessory-workout-heading small")).toHaveText([
    "Pull · 2 sets",
  ]);
});

test("mobile accessory library searches, filters, bounds scrolling, edits and removes day assignments", async ({
  page,
}) => {
  await page.goto("./");
  await nav(page, "Settings");
  await openSettingsGroup(page, "accessories");
  await expect(
    page.locator(".selected-accessory .accessory-edit strong"),
  ).toHaveText(["Hanging leg raise"]);
  await openSettingsGroup(page, "accessories");
  await page.locator(".accessory-library > summary").click();
  const search = page.getByRole("searchbox", {
    name: "Search accessories",
    exact: true,
  });
  await search.fill(" CURL ");
  await openSettingsGroup(page, "accessories");
  await expect(page.locator(".library-row")).toHaveCount(3);
  await openSettingsGroup(page, "accessories");
  await page
    .getByRole("combobox", { name: "Filter accessory category", exact: true })
    .selectOption("push");
  await expect(
    page.getByText("No matches. Try another search or add a new exercise.", {
      exact: true,
    }),
  ).toBeVisible();
  await openSettingsGroup(page, "accessories");
  await page
    .getByRole("combobox", { name: "Filter accessory category", exact: true })
    .selectOption("pull");
  await openSettingsGroup(page, "accessories");
  await page
    .getByRole("checkbox", { name: "Squat accessory Biceps curl", exact: true })
    .check();
  await nav(page, "Edit Biceps curl");
  const dialog = page.getByRole("dialog", {
    name: "Edit exercise",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await page
    .getByRole("spinbutton", { name: "Biceps curl sets", exact: true })
    .fill("4");
  await nav(page, "Done");
  await openSettingsGroup(page, "accessories");
  await expect(
    page.locator(".selected-accessory").filter({ hasText: "Biceps curl" }),
  ).toContainText("4 × 10");
  await search.fill("");
  await openSettingsGroup(page, "accessories");
  await page
    .getByRole("combobox", { name: "Filter accessory category", exact: true })
    .selectOption("all");
  expect(
    await page
      .locator(".accessory-results")
      .evaluate(
        (el) => el.clientHeight < el.scrollHeight && el.clientHeight <= 320,
      ),
  ).toBe(true);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await openSettingsGroup(page, "accessories");
  await page.locator(".accessory-manager").scrollIntoViewIfNeeded();
  await openSettingsGroup(page, "accessories");
  await page.screenshot({ path: "test-results/accessory-library-mobile.png" });
  await page.getByRole("tab", { name: "Bench press", exact: true }).click();
  await openSettingsGroup(page, "accessories");
  await expect(
    page.locator(".selected-accessory .accessory-edit strong"),
  ).toHaveText(["Lat pulldown"]);
  await openSettingsGroup(page, "accessories");
  await page
    .getByRole("checkbox", {
      name: "Bench press accessory Biceps curl",
      exact: true,
    })
    .check();
  await nav(page, "Edit Biceps curl");
  await nav(page, "Delete from all days");
  await openSettingsGroup(page, "accessories");
  await expect(
    page.locator(".selected-accessory .accessory-edit strong"),
  ).toHaveText(["Lat pulldown"]);
  await page.getByRole("tab", { name: "Squat", exact: true }).click();
  await openSettingsGroup(page, "accessories");
  await expect(
    page.locator(".selected-accessory .accessory-edit strong"),
  ).toHaveText(["Hanging leg raise"]);
  await save(page);
});

test("overview stays compact and shows active prescription after main settings change", async ({
  page,
}) => {
  await page.goto("./");
  expect(
    await page
      .locator(".lean-overview")
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeLessThan(1000);
  await expect(page.locator(".overview-main-sets strong")).toHaveText([
    "145 lb",
    "170 lb",
    "190 lb",
  ]);
  await expect(page.locator(".overview-accessories")).toContainText(
    "Hanging leg raise",
  );
  await nav(page, "Start workout");
  await page
    .getByRole("spinbutton", { name: "working set 1 weight", exact: true })
    .fill("155");
  await nav(page, "Settings");
  await openSettingsGroup(page, "maxes");
  await page
    .getByRole("spinbutton", { name: "Squat training max", exact: true })
    .fill("300");
  await openSettingsGroup(page, "appearance");
  await page
    .getByRole("combobox", { name: "Theme color", exact: true })
    .selectOption("blue");
  await save(page);
  await nav(page, "Overview");
  await expect(page.locator(".overview-main-sets strong")).toHaveText([
    "155 lb",
    "170 lb",
    "190 lb",
  ]);
  await expect(page.locator(".overview-tm strong")).toHaveText("225 lb");
  await page.screenshot({
    path: "test-results/lean-blue-overview.png",
    fullPage: true,
  });
  await nav(page, "Settings");
  await openSettingsGroup(page, "appearance");
  await page
    .getByRole("combobox", { name: "Theme color", exact: true })
    .selectOption("orange");
  await save(page);
  await nav(page, "Overview");
  await page.screenshot({
    path: "test-results/lean-orange-overview.png",
    fullPage: true,
  });
});

test("ten leg presets can be assigned without changing other days", async ({
  page,
}) => {
  await page.goto("./");
  await nav(page, "Settings");
  await openSettingsGroup(page, "accessories");
  await page.locator(".accessory-library > summary").click();
  await openSettingsGroup(page, "accessories");
  await page
    .getByRole("combobox", { name: "Filter accessory category", exact: true })
    .selectOption("legs");
  await openSettingsGroup(page, "accessories");
  await expect(page.locator(".library-row")).toHaveCount(10);
  await openSettingsGroup(page, "accessories");
  await page
    .getByRole("checkbox", { name: "Squat accessory Leg press", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Save changes", exact: true })
    .first()
    .click();
  await nav(page, "Overview");
  await nav(page, "Start workout");
  await expect(
    page.getByRole("heading", { name: "Leg press", exact: true }),
  ).toBeVisible();
  await page.reload();
  await nav(page, "Settings");
  await openSettingsGroup(page, "accessories");
  await expect(
    page.locator(".selected-accessory").filter({ hasText: "Leg press" }),
  ).toBeVisible();
});
