import { test as base } from "@playwright/test";
import { expect, type Page } from "@playwright/test";
export async function waitForSettingsAutosave(page: Page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  // Timer tests use a mocked browser clock; ordinary tests use real time.
  await page.clock.runFor(700).catch(() => {});
  await expect(page.locator(".settings-autosave")).toHaveText("Saved");
}
export * from "@playwright/test";
// Existing feature tests begin after onboarding; onboarding has its own tests.
export const test = base.extend<{ completeSetupAutomatically: boolean }>({
  completeSetupAutomatically: [true, { option: true }],
  page: async ({ page, completeSetupAutomatically }, use) => {
    if (completeSetupAutomatically) {
      await page.goto("./");
      await page
        .getByRole("button", { name: "Use defaults", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Save setup", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Set up your training" })
        .waitFor({ state: "detached" });
      await page.getByText("Saved on device", { exact: true }).waitFor();
    }
    await use(page);
  },
});
