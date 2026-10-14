import type { Page } from "@playwright/test";
export async function openSettingsGroup(page: Page, section: string) {
  const back = page.getByRole("button", {
    name: "Back to program",
    exact: true,
  });
  if (await back.isVisible()) {
    if (section === "accessories") return;
    await back.click();
  }
  if (section === "accessories") {
    if (!(await page.getByRole("button", { name: "Manage accessories", exact: true }).isVisible())) {
      await page.getByRole("button", { name: "Overview", exact: true }).click();
      await page.getByRole("button", { name: "Edit program", exact: true }).first().click();
    }
    await page.getByRole("button", { name: "Manage accessories", exact: true }).click();
    return;
  }
  if (await page.getByRole("button", { name: "Back to overview", exact: true }).isVisible())
    await page.getByRole("button", { name: "Settings", exact: true }).click();
  const titles: Record<string, string> = {
    appearance: "Appearance & device",
    maxes: "Training maxes",
    program: "Program & schedule",
    equipment: "Plates",
    plates: "Plates",
    timers: "Rest Timers",
    data: "Your data",
    install: "Install app",
  };
  const button = page.getByRole("button", {
    name: titles[section === "accessories" ? "program" : section],
    exact: true,
  });
  if ((await button.getAttribute("aria-expanded")) !== "true")
    await button.click();
  if (section === "accessories")
    await page.getByRole("button", { name: /Manage accessories/ }).click();
}
export async function openSettingForLabel(page: Page, label: string) {
  if (await page.getByRole("spinbutton", { name: label, exact: true }).isVisible()) return;
  if (
    !(await page.locator(".settings-page").isVisible()) ||
    (await page.getByRole("dialog").isVisible())
  )
    return;
  const section = /percentage/.test(label)
    ? "program"
    : /seconds/.test(label)
      ? "timers"
      : /Rounding/.test(label) ? "plates"
      : "maxes";
  await openSettingsGroup(page, section);
  if (/Week.*percentage/.test(label))
    if (
      !(await page
        .locator(".settings-advanced")
        .evaluate((el) => (el as HTMLDetailsElement).open))
    )
      await page.locator(".settings-advanced > summary").click();
}
