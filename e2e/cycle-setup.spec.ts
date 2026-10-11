import { test, expect, type Page } from "./fixtures";
import { openSettingsGroup } from "./settings-navigation";
const click = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true }).click();
async function seedFinalWorkout(page: Page) {
  await page.goto("./");
  await click(page, "Settings");
  await openSettingsGroup(page, "data");
  const pending = page.waitForEvent("download");
  await click(page, "JSON backup");
  const stream = await (await pending).createReadStream();
  let raw = "";
  for await (const chunk of stream!) raw += chunk.toString();
  const backup = JSON.parse(raw);
  backup.position = 15;
  backup.settings.autoIncrease = true;
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles({
    name: "cycle.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.locator(".overview-heading .eyebrow")).toContainText(
    "WEEK 4",
  );
  await click(page, "Start workout");
  for (let i = 1; i <= 3; i++) {
    await page.getByLabel(`Complete working set ${i}`, { exact: true }).check();
    await click(page, "Dismiss timer");
  }
  await click(page, "Finish workout");
  await click(page, "Overview");
}
test("new cycle reviews maxes and variation, cancellation is safe and increases apply once", async ({
  page,
}) => {
  await seedFinalWorkout(page);
  await click(page, "Start workout");
  const setup = page.getByRole("dialog", { name: "Set up cycle 2" });
  await expect(setup).toBeVisible();
  await expect(setup.getByLabel("Squat cycle training max")).toHaveValue("235");
  await click(page, "Cancel");
  await page.reload();
  await click(page, "Start workout");
  await expect(setup).toBeVisible();
  await page.getByLabel("Training max approach").selectOption("keep");
  await expect(setup.getByLabel("Squat cycle training max")).toHaveValue("225");
  await page.getByLabel("Training max approach").selectOption("increase");
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
  await page.screenshot({ path: "test-results/cycle-setup-mobile.png" });
  await click(page, "Start cycle 2");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("235 lb", { exact: true }).first()).toBeVisible();
  await expect(page.locator("main")).toContainText("Deadlift");
  await page.reload();
  await click(page, "Resume workout");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  page.once("dialog", (dialog) => dialog.accept());
  await click(page, "Discard workout");
  await click(page, "Start workout");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("custom cycle maxes are rounded to plate loading", async ({ page }) => {
  await seedFinalWorkout(page);
  await click(page, "Start workout");
  await page.getByLabel("Training max approach").selectOption("custom");
  await page.getByLabel("Squat cycle training max").fill("232");
  await click(page, "Start cycle 2");
  await expect(page.getByText("230 lb", { exact: true }).first()).toBeVisible();
});
