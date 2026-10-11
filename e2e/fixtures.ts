import { test as base } from "@playwright/test";
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
