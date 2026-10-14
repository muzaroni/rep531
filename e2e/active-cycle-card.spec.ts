import { waitForSettingsAutosave } from "./fixtures";
import { test, expect } from "./fixtures";
import { openSettingsGroup } from "./settings-navigation";

test("card manager adds and removes the three-week cycle card across reloads", async ({
  page,
}) => {
  await page.goto("./");
  const card = page.getByRole("region", { name: "Active cycle", exact: true });
  const thisWeek = page.getByRole("region", { name: "Cycle schedule" });
  await expect(card).toHaveCount(0);
  await expect(thisWeek).toBeVisible();

  const manager = page.getByRole("button", { name: "Manage overview cards" });
  const bounds = await manager.boundingBox();
  expect(bounds!.width).toBeGreaterThanOrEqual(44);
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
  await manager.click();
  const dialog = page.getByRole("dialog", { name: "Overview cards" });
  await expect(dialog).toContainText("Active cycle");
  await expect(dialog).toContainText("This week");
  await dialog.getByRole("button", { name: "Add Active cycle card" }).click();
  await dialog.getByRole("button", { name: "Close Overview cards" }).click();

  await expect(card).toBeVisible();
  await expect(card.locator("tbody tr")).toHaveCount(3);
  await expect(card.locator("tbody td")).toHaveCount(12);
  await expect(card.locator('tbody tr[data-current="true"]')).toHaveCount(1);
  await expect(card).not.toContainText("Deload");
  await expect(card.locator("tbody tr").first()).toContainText("5+ reps");
  await expect(card.locator("tbody tr").first().locator("td").first()).toContainText("190");
  await expect(card.locator('td[data-status="planned"]')).toHaveCount(12);

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Active cycle card overflows at ${width}px`,
    ).toBe(true);
    if (width === 320 || width === 768) {
      await card.screenshot({ path: `test-results/active-cycle-${width}.png` });
      if (width === 320) {
        await page.locator(".overview-heading").screenshot({
          path: "test-results/active-cycle-manager-320.png",
        });
      }
    }
  }

  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await openSettingsGroup(page, "appearance");
  await page
    .getByRole("combobox", { name: "Weight units", exact: true })
    .selectOption("kg");
  await waitForSettingsAutosave(page);
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(card).toContainText("kg");
  await expect(card).not.toContainText(/\blb\b/);
  await page.reload();
  await expect(card).toBeVisible();
  await manager.click();
  await dialog.getByRole("button", { name: "Remove This week card" }).click();
  await expect(thisWeek).toHaveCount(0);
  await dialog.getByRole("button", { name: "Remove Active cycle card" }).click();
  await dialog.getByRole("button", { name: "Close Overview cards" }).click();
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(card).toHaveCount(0);
  await expect(thisWeek).toHaveCount(0);
  await manager.click();
  await dialog.getByRole("button", { name: "Add This week card" }).click();
  await dialog.getByRole("button", { name: "Close Overview cards" }).click();
  await expect(thisWeek).toBeVisible();
});

test("active cycle card keeps edited active loads and marks the finished lift done", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Manage overview cards" }).click();
  const dialog = page.getByRole("dialog", { name: "Overview cards" });
  await dialog.getByRole("button", { name: "Add Active cycle card" }).click();
  await dialog.getByRole("button", { name: "Close Overview cards" }).click();
  const card = page.getByRole("region", { name: "Active cycle", exact: true });
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: "working set 3 weight", exact: true })
    .fill("200");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(card.locator("tbody td").first()).toContainText("200");
  await expect(card.locator("tbody td").first()).toHaveAttribute("data-status", "in progress");
  await page
    .getByRole("button", { name: "Resume workout", exact: true })
    .click();
  for (const kind of ["working", "bbb"]) {
    const boxes = page.getByRole("checkbox", {
      name: new RegExp(`^Complete ${kind} set`),
    });
    for (let index = 0; index < (await boxes.count()); index++) {
      await boxes.nth(index).check();
      await page.getByRole("button", { name: "Dismiss timer" }).click();
    }
  }
  await page.getByRole("button", { name: "Finish workout" }).click();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(card.locator("tbody td").first()).toHaveAttribute("data-status", "completed");
  await expect(card.locator("tbody td").first().locator("svg")).toBeVisible();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const cell = card.locator("tbody td").first();
    const cellBox = (await cell.boundingBox())!;
    const weightBox = (await cell.locator("span").boundingBox())!;
    const checkBox = (await cell.locator("svg").boundingBox())!;
    const nextWeightBox = (await card.locator("tbody td").nth(1).locator("span").boundingBox())!;
    expect(Math.abs(weightBox.x + weightBox.width / 2 - (cellBox.x + cellBox.width / 2))).toBeLessThan(1);
    expect(checkBox.x - (weightBox.x + weightBox.width)).toBeGreaterThanOrEqual(3);
    expect(nextWeightBox.x - (checkBox.x + checkBox.width)).toBeGreaterThanOrEqual(6);
  }
  await page.reload();
  await expect(card.locator("tbody td").first()).toHaveAttribute("data-status", "completed");
  await page.getByRole("button", { name: "Manage overview cards" }).click();
  await page.getByRole("dialog", { name: "Overview cards" }).getByRole("button", { name: "Remove Active cycle card" }).click();
  await page.getByRole("dialog", { name: "Overview cards" }).getByRole("button", { name: "Close Overview cards" }).click();
  await expect(card).toHaveCount(0);
});
