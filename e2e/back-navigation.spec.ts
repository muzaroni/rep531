import { test, expect, type Page } from "./fixtures";

async function swipe(page: Page, dx = 120, dy = 0) {
  const surface = page.locator("main");
  await surface.dispatchEvent("touchstart", {
    touches: [{ identifier: 1, clientX: 10, clientY: 220 }],
  });
  await surface.dispatchEvent("touchmove", {
    touches: [{ identifier: 1, clientX: 10 + dx, clientY: 220 + dy }],
  });
  await surface.dispatchEvent("touchend", {
    touches: [],
    changedTouches: [{ identifier: 1, clientX: 10 + dx, clientY: 220 + dy }],
  });
}
const click = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true }).click();

test("edge swipe returns from a workout without changing its saved sets or progress", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await click(page, "Start workout");
  await page.getByLabel("working set 1 weight", { exact: true }).fill("155");
  await page.getByLabel("Session notes").fill("Keep this session");
  await swipe(page, 30);
  await expect(page.getByLabel("Session notes")).toBeVisible();
  await swipe(page, 20, 130);
  await expect(page.getByLabel("Session notes")).toBeVisible();
  await swipe(page);
  await expect(
    page.getByRole("button", { name: "Resume workout", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("0 of 16 workouts", { exact: true }),
  ).toBeVisible();
  await click(page, "Resume workout");
  await expect(
    page.getByLabel("working set 1 weight", { exact: true }),
  ).toHaveValue("155");
  await expect(page.getByLabel("Session notes")).toHaveValue(
    "Keep this session",
  );
  await page.evaluate(() => history.back());
  await expect(
    page.getByRole("button", { name: "Resume workout", exact: true }),
  ).toBeVisible();
});

test("browser back and edge swipe return one history level at a time and protect unsaved corrections", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await click(page, "History");
  await click(page, "Add past workout");
  await click(page, "Create past workout");
  await click(page, "Mark main & BBB complete");
  await click(page, "Save past workout");
  await page.locator(".history-row").first().click();
  await click(page, "Edit workout");
  const weight = page.getByLabel("working set 1 weight", { exact: true });
  const original = await weight.inputValue();
  await weight.fill("155");
  const index = await page.evaluate(() => history.state.rep531Back.index);
  page.once("dialog", (dialog) => dialog.dismiss());
  await swipe(page);
  await expect(weight).toHaveValue("155");
  await expect
    .poll(() => page.evaluate(() => history.state.rep531Back.index))
    .toBe(index);
  page.once("dialog", (dialog) => dialog.accept());
  await page.evaluate(() => history.back());
  await expect(weight).toBeDisabled();
  await expect(weight).toHaveValue(original);
  await swipe(page);
  await expect(page.locator(".history-row")).toHaveCount(1);
  const chart = page.locator(".chart-scroll");
  await chart.dispatchEvent("touchstart", {
    touches: [{ identifier: 1, clientX: 10, clientY: 220 }],
  });
  await chart.dispatchEvent("touchmove", {
    touches: [{ identifier: 1, clientX: 140, clientY: 220 }],
  });
  await chart.dispatchEvent("touchend", {
    touches: [],
    changedTouches: [{ identifier: 1, clientX: 140, clientY: 220 }],
  });
  await expect(page.locator(".history-row")).toHaveCount(1);
  await page.evaluate(() => history.back());
  await expect(page.getByRole("heading", { name: "Overview." })).toBeVisible();
});

test("accessory settings go back to the program before overview and retain their draft", async ({
  page,
}) => {
  await page.goto("./");
  await click(page, "Edit program");
  await click(page, "Manage accessories");
  await expect(
    page.getByRole("button", { name: "Back to program", exact: true }),
  ).toBeVisible();
  await swipe(page);
  await expect(
    page.getByRole("button", { name: "Back to program", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Manage accessories", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => history.back());
  await expect(page.getByRole("heading", { name: "Overview." })).toBeVisible();
});

test("an open accessory dialog prevents swipe navigation behind it", async ({
  page,
}) => {
  await page.goto("./");
  await click(page, "Start workout");
  await click(page, "Add accessory");
  await swipe(page);
  await expect(
    page.getByRole("dialog", { name: "Add accessories", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => history.back());
  await expect(
    page.getByRole("dialog", { name: "Add accessories", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("working set 1 weight", { exact: true }),
  ).toBeVisible();
});
