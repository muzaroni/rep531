import { openSettingsGroup } from "./settings-navigation";
import { test, expect } from "./fixtures";
const settings = async (page: import("@playwright/test").Page) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
};
const save = async (page: import("@playwright/test").Page) => {
  await page
    .getByRole("button", { name: "Save changes", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Settings saved" }),
  ).toBeVisible();
};
test("unit switching keeps equipment banks intact and snaps converted maxes to available pairs", async ({
  page,
}) => {
  await settings(page);
  await openSettingsGroup(page, "equipment");
  await page
    .getByRole("textbox", { name: "Available kg plates", exact: true })
    .fill("25, 20, 10, 5, 2.5");
  await openSettingsGroup(page, "maxes");
  await page
    .getByRole("spinbutton", { name: "Squat training max", exact: true })
    .fill("225");
  await openSettingsGroup(page, "appearance");
  await page
    .getByRole("combobox", { name: "Weight units", exact: true })
    .selectOption("kg");
  await openSettingsGroup(page, "maxes");
  await expect(
    page.getByRole("spinbutton", { name: "Squat training max", exact: true }),
  ).toHaveValue("100");
  await expect(
    page.getByRole("spinbutton", { name: /Bar 1 weight/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("spinbutton", { name: /Bar 1 weight/ }),
  ).toHaveCount(0);
  await openSettingsGroup(page, "equipment");
  await expect(
    page.getByRole("textbox", { name: "Available lb plates", exact: true }),
  ).toHaveValue("45, 35, 25, 10, 5, 2.5");
  await save(page);
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await openSettingsGroup(page, "appearance");
  await expect(
    page.getByRole("combobox", { name: "Weight units", exact: true }),
  ).toHaveValue("kg");
  await openSettingsGroup(page, "maxes");
  await expect(
    page.getByRole("spinbutton", { name: "Squat training max", exact: true }),
  ).toHaveValue("100");
  await openSettingsGroup(page, "appearance");
  await page
    .getByRole("combobox", { name: "Weight units", exact: true })
    .selectOption("lb");
  await openSettingsGroup(page, "maxes");
  await expect(
    page.getByRole("spinbutton", { name: "Squat training max", exact: true }),
  ).toHaveValue("220");
  await expect(
    page.getByRole("spinbutton", { name: /Bar 1 weight/ }),
  ).toHaveCount(0);
  await openSettingsGroup(page, "appearance");
  await page
    .getByRole("combobox", { name: "Weight units", exact: true })
    .selectOption("kg");
  await save(page);
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "working set 1 weight", exact: true }),
  ).toHaveValue("65");
  await expect(
    page.getByText("Per side: 20 + 2.5 kg", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Unavailable/)).toHaveCount(0);
});
test("accessories are categorized and selected independently for each day", async ({
  page,
}) => {
  await settings(page);
  await openSettingsGroup(page, "accessories");
  await page.locator(".accessory-library > summary").click();
  await openSettingsGroup(page, "accessories");
  await page
    .getByRole("button", { name: "Edit library Lat pulldown", exact: true })
    .click();
  await expect(
    page
      .getByRole("combobox", { name: "Lat pulldown category", exact: true })
      .locator("option"),
  ).toHaveText(["Push", "Pull", "Legs", "Abs"]);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  for (const [name, group] of [
    ["Push ups", "push"],
    ["Split squat", "legs"],
    ["Cable row", "pull"],
  ] as const) {
    await openSettingsGroup(page, "accessories");
    await page
      .getByRole("button", { name: "New exercise", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Accessory name", exact: true })
      .fill(name);
    await page
      .getByRole("combobox", { name: `${name} category`, exact: true })
      .selectOption(group);
    await page.getByRole("button", { name: "Done", exact: true }).click();
  }
  for (const name of ["Lat pulldown", "Push ups", "Split squat", "Cable row"]) {
    await openSettingsGroup(page, "accessories");
    await page
      .getByRole("checkbox", { name: `Squat accessory ${name}`, exact: true })
      .check();
  }
  await page.getByRole("tab", { name: "Bench press", exact: true }).click();
  await openSettingsGroup(page, "accessories");
  await expect(
    page.getByRole("checkbox", {
      name: "Bench press accessory Push ups",
      exact: true,
    }),
  ).not.toBeChecked();
  await openSettingsGroup(page, "accessories");
  await page
    .getByRole("checkbox", {
      name: "Bench press accessory Push ups",
      exact: true,
    })
    .check();
  await save(page);
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  for (const name of [
    "Lat pulldown",
    "Push ups",
    "Split squat",
    "Cable row",
    "Hanging leg raise",
  ])
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  await page.screenshot({
    path: "test-results/workout-large-text.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("BBB Swap uses the paired lift and the option persists for the next cycle", async ({
  page,
}) => {
  await settings(page);
  await openSettingsGroup(page, "program");
  await page
    .getByRole("combobox", { name: "Cycle 1 variation", exact: true })
    .selectOption("swap");
  await openSettingsGroup(page, "program");
  await page
    .getByRole("combobox", { name: "Cycle 2 variation", exact: true })
    .selectOption("swap");
  await save(page);
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(
    page.getByText("BBB · Deadlift · 5 × 10", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await expect(
    page.getByText("Deadlift · 50% of 275 lb TM", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("spinbutton", { name: "bbb set 1 weight", exact: true }),
  ).toHaveValue("140");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await openSettingsGroup(page, "program");
  await page
    .getByRole("combobox", { name: "Cycle 1 variation", exact: true })
    .selectOption("normal");
  await save(page);
  await page.getByRole("button", { name: "Workout", exact: true }).click();
  await expect(
    page.getByText("Deadlift · 50% of 275 lb TM", { exact: true }),
  ).toBeVisible();
});
test("themes change highlights while keeping neutral surfaces and fitting narrow phones", async ({
  page,
}) => {
  await settings(page);
  await expect(
    page.getByRole("button", { name: /Move .* (up|down)/ }),
  ).toHaveCount(0);
  const before = await page
    .locator(".app")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  await openSettingsGroup(page, "appearance");
  await page
    .getByRole("combobox", { name: "Theme color", exact: true })
    .selectOption("blue");
  await save(page);
  const blue = await page
    .locator(".app")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(blue).toBe(before);
  const inputBlue = await page
    .getByRole("combobox", { name: "Weight units", exact: true })
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  const accentBlue = await page
    .locator(".primary")
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  const panelBlue = await page
    .locator(".panel")
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.screenshot({
    path: "test-results/blue-settings.png",
    fullPage: true,
  });
  await openSettingsGroup(page, "appearance");
  await page
    .getByRole("combobox", { name: "Theme color", exact: true })
    .selectOption("orange");
  await save(page);
  expect(
    await page
      .locator(".panel")
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe(panelBlue);
  expect(
    await page
      .locator(".primary")
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundImage),
  ).not.toBe(accentBlue);
  expect(
    await page
      .getByRole("combobox", { name: "Weight units", exact: true })
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).not.toBe(inputBlue);
  await openSettingsGroup(page, "appearance");
  await page
    .getByRole("combobox", { name: "Theme color", exact: true })
    .selectOption("lime");
  await save(page);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Settings overflow at ${width}px`,
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await openSettingsGroup(page, "maxes");
  await page.screenshot({
    path: "test-results/lime-inputs.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  expect(
    await page
      .locator(".overview-accessories p")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(14);
  await page.screenshot({
    path: "test-results/lime-dashboard.png",
    fullPage: true,
  });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Dashboard overflow at ${width}px`,
    ).toBe(true);
  }
});
