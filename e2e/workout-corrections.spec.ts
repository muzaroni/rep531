import { test, expect } from "./fixtures";

test("discard confirms, clears the timer and draft, and keeps program progress", async ({
  page,
}) => {
  await page.goto("./");
  const click = (name: string) =>
    page.getByRole("button", { name, exact: true }).click();
  await click("Start workout");
  await page.getByLabel("working set 1 weight", { exact: true }).fill("155");
  await page.getByLabel("Complete working set 1", { exact: true }).check();
  await click("Dismiss timer");
  page.once("dialog", (dialog) => dialog.dismiss());
  await click("Discard workout");
  await expect(
    page.getByLabel("working set 1 weight", { exact: true }),
  ).toHaveValue("155");
  page.once("dialog", (dialog) => dialog.accept());
  await click("Discard workout");
  await expect(
    page.getByText("0 of 16 workouts", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("bbb-rest-timer")),
  ).toBeNull();
  await page.reload();
  await click("Start workout");
  await expect(
    page.getByLabel("Complete working set 1", { exact: true }),
  ).not.toBeChecked();
});

test("saved performance edits can be cancelled or saved and survive reload", async ({
  page,
}) => {
  await page.goto("./");
  const click = (name: string) =>
    page.getByRole("button", { name, exact: true }).click();
  await click("History");
  await click("Add past workout");
  await click("Create past workout");
  await click("Mark main & BBB complete");
  await click("Save past workout");
  await page.locator(".history-row").first().click();
  const weight = page.getByLabel("working set 1 weight", { exact: true });
  const reps = page.getByLabel("working set 1 reps", { exact: true });
  const before = await weight.inputValue();
  await click("Edit workout");
  await weight.fill("155");
  await click("Cancel edits");
  await expect(weight).toHaveValue(before);
  await click("Edit workout");
  await weight.fill("160");
  await reps.fill("9");
  await page.getByLabel("Session notes").fill("Corrected weight and reps");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(weight).toBeDisabled();
  await expect(weight).toHaveValue("160");
  await click("Back to history");
  await expect(page.locator(".history-row")).toHaveCount(1);
  await page.reload();
  await click("History");
  await page.locator(".history-row").first().click();
  await expect(weight).toHaveValue("160");
  await expect(reps).toHaveValue("9");
  await expect(page.getByLabel("Session notes")).toHaveValue(
    "Corrected weight and reps",
  );
  await click("Overview");
  await expect(
    page.getByText("0 of 16 workouts", { exact: true }),
  ).toBeVisible();
});
