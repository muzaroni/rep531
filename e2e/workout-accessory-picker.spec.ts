import { test, expect } from "./fixtures";
import { makeWorkout } from "../src/domain/calculations";
import type { AppState } from "../src/domain/model";

async function savedState(page: import("@playwright/test").Page): Promise<AppState> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("bbb-training");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise((resolve, reject) => {
        const request = db.transaction("state").objectStore("state").get("main");
        request.onsuccess = () => resolve(request.result.value);
        request.onerror = () => reject(request.error);
      });
    } finally { db.close(); }
  });
}

test("quick accessories update lift assignments and survive reload and removal", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("./");
  await page.getByRole("button", { name: "Start workout", exact: true }).click();
  await page.getByRole("button", { name: "Add accessory", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Add accessories" });
  await page.getByLabel("Search accessories").fill("Lat pulldown");
  await page.getByRole("button", { name: "Add Lat pulldown", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove Lat pulldown", exact: true })).toBeEnabled();
  const box = await picker.boundingBox();
  const searchBox = await page.getByLabel("Search accessories").boundingBox();
  expect(searchBox!.width).toBeGreaterThan(box!.width - 30);
  expect(await picker.evaluate(element => getComputedStyle(element).backgroundColor)).toBe("rgb(11, 11, 12)");
  expect(await page.locator(".settings-ui-dialog-overlay").evaluate(element => getComputedStyle(element).backdropFilter)).toBe("blur(8px)");
  const filtersBox = await picker.locator(".workout-accessory-filters").boundingBox();
  const resultsBox = await picker.locator(".workout-accessory-results").boundingBox();
  expect(filtersBox!.y).toBeGreaterThanOrEqual(searchBox!.y + searchBox!.height + 7);
  expect(resultsBox!.y).toBeGreaterThanOrEqual(filtersBox!.y + filtersBox!.height + 7);
  expect(resultsBox!.y + resultsBox!.height).toBeLessThanOrEqual(box!.y + box!.height - 10);
  await picker.screenshot({ path: "test-results/accessory-picker-spacing.png" });
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  await picker.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Arrange Lat pulldown", exact: true }).press("ArrowUp");
  await expect(page.locator(".accessory-workout-heading h3").first()).toHaveText("Lat pulldown");
  await expect.poll(async () => {
    const state = await savedState(page);
    return state.settings.accessoryAssignments.squat.includes(state.settings.accessories.find(exercise => exercise.name === "Lat pulldown")!.id);
  }).toBe(true);
  const addedState = await savedState(page);
  expect(makeWorkout({ ...addedState, active: null, position: 4 }).sets.some(set => set.name === "Lat pulldown")).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Resume workout", exact: true }).click();
  await expect(page.locator(".accessory-workout-heading h3").first()).toHaveText("Lat pulldown");
  await expect(page.locator(".accessory-workout-heading").filter({ hasText: "Lat pulldown" })).toBeVisible();
  for (let i = 0; i < 5; i++) await page.getByRole("button", { name: "Remove set from Lat pulldown", exact: true }).click();
  await expect(page.locator(".accessory-workout-heading").filter({ hasText: "Lat pulldown" })).toHaveCount(0);
  await expect.poll(async () => (await savedState(page)).settings.accessoryAssignments.squat.includes(addedState.settings.accessories.find(exercise => exercise.name === "Lat pulldown")!.id)).toBe(false);
  const removedState = await savedState(page);
  expect(makeWorkout({ ...removedState, active: null, position: 4 }).sets.some(set => set.name === "Lat pulldown")).toBe(false);
  expect(removedState.history).toEqual(addedState.history);
  await page.reload();
  await page.getByRole("button", { name: "Resume workout", exact: true }).click();
  await expect(page.locator(".accessory-workout-heading").filter({ hasText: "Lat pulldown" })).toHaveCount(0);
});

test("removing a selected accessory preserves completed sets", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Start workout", exact: true }).click();
  await page.getByRole("checkbox", { name: "Complete accessory set 1", exact: true }).check();
  await page.getByRole("button", { name: "Dismiss timer", exact: true }).click();
  await page.getByRole("button", { name: "Add accessory", exact: true }).click();
  await page.getByRole("button", { name: "Remove Hanging leg raise", exact: true }).click();
  await page.getByRole("dialog", { name: "Add accessories" }).getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Resume workout", exact: true }).click();
  const state = await savedState(page);
  const sets = state.active!.sets.filter(set => set.name === "Hanging leg raise");
  expect(sets).toHaveLength(1);
  expect(sets[0].done).toBe(true);
  expect(makeWorkout({ ...state, active: null, position: 4 }).sets.some(set => set.name === "Hanging leg raise")).toBe(false);
});
