import { test, expect } from "./fixtures";
import { openSettingsGroup } from "./settings-navigation";
test.use({ completeSetupAutomatically: false });
test("fresh install accepts 1RM and TM per lift, stores variation and never prompts again", async ({
  page,
}) => {
  await page.goto("./");
  const setup = page.getByRole("dialog", { name: "Set up your training" });
  await expect(setup).toBeVisible();
  await page.getByLabel("Squat max type").selectOption("rm");
  await page.getByLabel("Squat initial max").fill("200");
  await page.getByLabel("Bench press initial max").fill("135");
  await page.getByLabel("Deadlift max type").selectOption("rm");
  await page.getByLabel("Deadlift initial max").fill("300");
  await page.getByLabel("Overhead press initial max").fill("95");
  await expect(setup).toContainText("TM: 180 lb");
  await page
    .getByRole("combobox", { name: "Cycle variation", exact: true })
    .selectOption("swap");
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/initial-setup-mobile.png" });
  await page
    .getByRole("button", { name: "Choose accessories", exact: true })
    .click();
  await page.getByRole("button", { name: "Save setup", exact: true }).click();
  await expect(setup).toHaveCount(0);
  await page.reload();
  await expect(setup).toHaveCount(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await openSettingsGroup(page, "maxes");
  await expect(
    page.getByLabel("Squat one rep max", { exact: true }),
  ).toHaveValue("200");
  await expect(
    page.getByLabel("Squat training max", { exact: true }),
  ).toHaveValue("180");
  await expect(
    page.getByLabel("Bench press one rep max", { exact: true }),
  ).toHaveValue("");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await expect(page.locator("main")).toContainText("BBB SWAP");
  await expect(page.locator("main")).toContainText("Deadlift");
});
test("setup can wait, returns before the first workout and offers explicit metric defaults", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Set up later", exact: true }).click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  const setup = page.getByRole("dialog", { name: "Set up your training" });
  await expect(setup).toBeVisible();
  await page
    .getByRole("combobox", { name: "Weight units", exact: true })
    .selectOption("kg");
  await page
    .getByRole("button", { name: "Choose accessories", exact: true })
    .click();
  await expect(setup.getByRole("alert")).toContainText("all four lifts");
  await page.getByRole("button", { name: "Use defaults", exact: true }).click();
  await page.getByRole("button", { name: "Save setup", exact: true }).click();
  await expect(setup).toHaveCount(0);
  await expect(page.locator(".overview-main-sets")).toContainText("kg");
  await page.reload();
  await expect(setup).toHaveCount(0);
});

test("onboarding assigns different accessories per day, keeps drafts on Back and saves them into workouts", async ({
  page,
}) => {
  const click = (name: string) =>
    page.getByRole("button", { name, exact: true }).click();
  await page.goto("./");
  await click("Use defaults");
  const setup = page.getByRole("dialog", { name: "Set up your training" });
  await expect(setup).toContainText("STEP 2 OF 2");
  await page
    .getByLabel("Unselect Hanging leg raise for Squat", { exact: true })
    .click();
  const search = page.getByRole("searchbox", { name: "Search accessories" });
  for (const exercise of ["Push up", "Lat pulldown", "Goblet squat"]) {
    await search.fill(exercise);
    await page
      .getByRole("button", { name: `Add ${exercise}`, exact: true })
      .click();
  }
  await page.getByRole("tab", { name: "Bench press", exact: true }).click();
  await search.fill("Dips");
  await page.getByRole("button", { name: "Add Dips", exact: true }).click();
  await page.getByRole("tab", { name: "Deadlift", exact: true }).click();
  await search.fill("Romanian deadlift");
  await page
    .getByRole("button", { name: "Add Romanian deadlift", exact: true })
    .click();
  await page.getByRole("tab", { name: "Overhead press", exact: true }).click();
  await search.fill("Face pull");
  await page
    .getByRole("button", { name: "Add Face pull", exact: true })
    .click();
  await click("Back");
  await expect(setup).toContainText("STEP 1 OF 2");
  await click("Use defaults");
  await page.getByRole("tab", { name: "Squat", exact: true }).click();
  await expect(setup.locator(".selected-accessories")).toContainText(
    "Goblet squat",
  );
  await expect(setup.locator(".selected-accessories")).not.toContainText(
    "Dips",
  );
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/initial-accessories-mobile.png",
  });
  await click("Save setup");
  await page.reload();
  await click("Start workout");
  for (const name of ["Push up", "Lat pulldown", "Goblet squat"])
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Hanging leg raise", exact: true }),
  ).toHaveCount(0);
  await click("Settings");
  await openSettingsGroup(page, "program");
  await openSettingsGroup(page, "accessories");
  await page.getByRole("tab", { name: "Bench press", exact: true }).click();
  await expect(page.locator(".selected-accessories")).toContainText("Dips");
  await page.getByRole("tab", { name: "Deadlift", exact: true }).click();
  await expect(page.locator(".selected-accessories")).toContainText(
    "Romanian deadlift",
  );
  await page.getByRole("tab", { name: "Overhead press", exact: true }).click();
  await expect(page.locator(".selected-accessories")).toContainText(
    "Face pull",
  );
});

test("closing accessory setup leaves selections and completion uncommitted", async ({
  page,
}) => {
  const click = (name: string) =>
    page.getByRole("button", { name, exact: true }).click();
  await page.goto("./");
  await click("Use defaults");
  await page
    .getByRole("searchbox", { name: "Search accessories" })
    .fill("Push up");
  await page.getByRole("button", { name: "Add Push up", exact: true }).click();
  await click("Set up later");
  await click("Start workout");
  await expect(
    page.getByRole("dialog", { name: "Set up your training" }),
  ).toContainText("STEP 1 OF 2");
  await click("Use defaults");
  await expect(page.locator(".selected-accessories")).not.toContainText(
    "Push up",
  );
  await expect(page.locator(".selected-accessories")).toContainText(
    "Hanging leg raise",
  );
  await click("Save setup");
});


