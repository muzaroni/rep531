import type { Page } from "@playwright/test";
export async function openSettingsGroup(page: Page, section: string) {
  const back = page.getByRole("button", {
    name: "Back to settings",
    exact: true,
  });
  if (await back.isVisible()) {
    if (section === "accessories") return;
    await back.click();
  }
  const titles: Record<string, string> = {
    appearance: "Appearance & device",
    maxes: "Training maxes",
    program: "Program & schedule",
    equipment: "Equipment & rest",
    data: "Your data",
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
  if (
    !(await page.locator(".settings-page").isVisible()) ||
    (await page.getByRole("dialog").isVisible())
  )
    return;
  const section = /percentage/.test(label)
    ? "program"
    : /seconds|Rounding/.test(label)
      ? "equipment"
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
