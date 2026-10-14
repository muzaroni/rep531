import { waitForSettingsAutosave } from "./fixtures";
import { openSettingsGroup } from "./settings-navigation";
import { test, expect } from "./fixtures";

test("existing mixed-unit saves are corrected on load and backup import", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await expect(
    page.getByText("Saved on device", { exact: true }),
  ).toBeVisible();
  const backup = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("bbb-training");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction("state", "readwrite");
    const store = transaction.objectStore("state");
    const row = await new Promise<any>((resolve, reject) => {
      const request = store.get("main");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    row.value.settings.units = "kg";
    row.value.settings.rounding = 2.5;
    row.value.history = [
      {
        ...structuredClone(row.value.active),
        id: "old-pound-history",
        completedAt: new Date().toISOString(),
      },
    ];
    store.put(row);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
    return JSON.stringify(row.value);
  });
  await page.reload();
  await expect(page.locator(".next-workout")).toContainText("kg");
  await page
    .getByRole("button", { name: "Resume workout", exact: true })
    .click();
  await expect(page.locator("main")).not.toContainText(/\blb\b/);
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page.locator(".history-row").first().click();
  await expect(page.locator(".set-table-labels").first()).toContainText("KG");
  await expect(page.locator("main")).not.toContainText(/\blb\b/);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles({
    name: "mixed-units.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup),
  });
  await expect(page.locator(".next-workout")).toContainText("kg");
  await page
    .getByRole("button", { name: "Resume workout", exact: true })
    .click();
  await expect(page.locator("main")).not.toContainText(/\blb\b/);
});

test("unit changes apply to active workouts, overview, history details and Markdown", async ({
  page,
}) => {
  const nav = (name: string) =>
    page.getByRole("button", { name, exact: true }).click();
  const units = async (value: "kg" | "lb") => {
    await nav("Settings");
    await openSettingsGroup(page, "appearance");
    await page
      .getByRole("combobox", { name: "Weight units", exact: true })
      .selectOption(value);
    await waitForSettingsAutosave(page);
  };
  await page.goto("./");
  await nav("Start workout");
  await page
    .getByRole("spinbutton", { name: "working set 1 weight", exact: true })
    .fill("175");
  await page
    .getByRole("checkbox", { name: "Complete working set 1", exact: true })
    .check();
  await nav("Dismiss timer");
  await units("kg");
  await nav("Overview");
  await expect(page.locator(".next-workout")).toContainText("kg");
  await expect(page.locator(".next-workout")).not.toContainText(/\blb\b/);
  await nav("Resume workout");
  await expect(page.locator(".set-table-labels").first()).toContainText("KG");
  await expect(
    page.getByRole("spinbutton", { name: "working set 1 weight", exact: true }),
  ).toHaveValue("80");
  await expect(
    page.getByRole("checkbox", { name: "Complete working set 1", exact: true }),
  ).toBeChecked();
  await expect(page.locator("main")).not.toContainText(/\blb\b/);
  await page.reload();
  await nav("Resume workout");
  await expect(page.locator(".set-table-labels").first()).toContainText("KG");
  const boxes = page.getByRole("checkbox");
  for (let i = 0; i < (await boxes.count()); i++) {
    if (!(await boxes.nth(i).isChecked())) await boxes.nth(i).check();
    const dismiss = page.getByRole("button", {
      name: "Dismiss timer",
      exact: true,
    });
    if (await dismiss.isVisible()) await dismiss.click();
  }
  await nav("Finish workout");
  // Switch back to prove older kg history renders in the new lb preference.
  await units("lb");
  await nav("History");
  await page.locator(".history-row").first().click();
  await expect(page.locator(".set-table-labels").first()).toContainText("LB");
  await expect(page.locator("main")).not.toContainText(/\bkg\b/);
  await nav("Back to history");
  await units("kg");
  await nav("History");
  await page.locator(".history-row").first().click();
  await expect(page.locator("main")).not.toContainText(/\blb\b/);
  await nav("Back to history");
  const download = page.waitForEvent("download");
  await nav("Export");
  const file = await download;
  const stream = await file.createReadStream();
  let text = "";
  for await (const chunk of stream!) text += chunk.toString();
  expect(text).toContain("TM 100 kg");
  expect(text).not.toMatch(/\blb\b/);
});
