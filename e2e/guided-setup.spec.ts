import { test, expect, type Page } from "./fixtures";
import { openSettingsGroup } from "./settings-navigation";

async function backup(page: Page) {
  await openSettingsGroup(page, "data");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON backup", exact: true }).click();
  const stream = await (await download).createReadStream();
  let content = "";
  for await (const chunk of stream!) content += chunk.toString();
  return JSON.parse(content);
}

test("Settings reopens a prefilled isolated guide and preserves the active program when saved", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: "working set 1 weight", exact: true })
    .fill("123");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const before = await backup(page);
  await page.getByRole("button", { name: "Guided setup", exact: true }).click();
  const guide = page.getByRole("dialog", { name: "Guided setup", exact: true });
  await expect(guide.getByLabel("Squat initial max")).toHaveValue(
    String(before.settings.maxes.squat),
  );
  await guide.getByLabel("Squat initial max").fill("250");
  await guide.getByRole("button", { name: "Continue", exact: true }).click();
  await guide
    .getByRole("searchbox", { name: "Search accessories" })
    .fill("Push up");
  await guide.getByRole("button", { name: "Add Push up", exact: true }).click();
  await guide
    .getByRole("button", { name: "Cancel guided setup", exact: true })
    .click();
  expect(await backup(page)).toEqual(before);
  await page.getByRole("button", { name: "Guided setup", exact: true }).click();
  await expect(guide.getByLabel("Squat initial max")).toHaveValue(
    String(before.settings.maxes.squat),
  );
  await guide.getByLabel("Squat initial max").fill("250");
  await guide.getByRole("button", { name: "Continue", exact: true }).click();
  await guide
    .getByRole("searchbox", { name: "Search accessories" })
    .fill("Push up");
  await guide.getByRole("button", { name: "Add Push up", exact: true }).click();
  await guide.getByRole("button", { name: "Back", exact: true }).click();
  await expect(guide.getByLabel("Squat initial max")).toHaveValue("250");
  await guide.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(guide.locator(".selected-accessories")).toContainText("Push up");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await guide.getByRole("button", { name: "Save setup", exact: true }).click();
  await expect(guide).toHaveCount(0);
  const after = await backup(page);
  expect(after.settings.maxes.squat).toBe(250);
  expect(after.settings.equipment).toEqual(before.settings.equipment);
  expect([
    after.cycle,
    after.position,
    after.history,
    after.active.id,
    after.active.tm,
  ]).toEqual([
    before.cycle,
    before.position,
    before.history,
    before.active.id,
    before.active.tm,
  ]);
  expect(
    after.active.sets.filter((set: any) => set.kind !== "accessory"),
  ).toEqual(before.active.sets.filter((set: any) => set.kind !== "accessory"));
  expect(
    after.active.sets.filter((set: any) => set.name === "Push up"),
  ).toHaveLength(5);
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Guided setup", exact: true }).click();
  await expect(guide.getByLabel("Squat initial max")).toHaveValue("250");
});
