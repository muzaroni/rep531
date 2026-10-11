import { openSettingsGroup } from "./settings-navigation";
import { test, expect } from "./fixtures";

test("history plots four lifts on shared dates in preferred units without a dropdown", async ({
  page,
}) => {
  const nav = (name: string) =>
    page.getByRole("button", { name, exact: true }).click();
  await page.goto("./");
  await nav("History");
  await expect(
    page.getByRole("combobox", { name: "Chart exercise" }),
  ).toHaveCount(0);
  await expect(page.locator(".chart-legend > div")).toHaveCount(4);
  await expect(
    page.getByText("Your progress starts with one session."),
  ).toBeVisible();
  await nav("Overview");
  await nav("Start workout");
  await nav("Settings");
  const pending = page.waitForEvent("download");
  await openSettingsGroup(page, "data");
  await nav("JSON backup");
  const stream = await (await pending).createReadStream();
  let json = "";
  for await (const chunk of stream!) json += chunk.toString();
  const state = JSON.parse(json);
  const template = state.active;
  const records = [
    ["squat", "lb", 300, "2026-10-01"],
    ["bench", "kg", 100, "2026-10-02"],
    ["deadlift", "lb", 400, "2026-10-03"],
    ["press", "kg", 50, "2026-10-04"],
    ["squat", "lb", 330, "2026-10-08"],
  ];
  state.active = null;
  state.settings.units = "kg";
  state.settings.rounding = 2.5;
  state.history = records
    .map(([lift, units, weight, day], i) => ({
      ...template,
      id: `history-${i}`,
      lift,
      units,
      date: `${day}T12:00:00.000Z`,
      completedAt: `${day}T13:00:00.000Z`,
      sets: template.sets.map((set: any) => ({
        ...set,
        weight: set.kind === "working" ? weight : set.weight,
        reps: 1,
        done: set.kind === "working",
      })),
    }))
    .reverse(); // Imported history is not necessarily chronological.
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles({
    name: "chart.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(state)),
  });
  await nav("History");
  const chart = page.getByRole("img", {
    name: /Main lift estimated one rep max progression in kg/,
  });
  await expect(chart).toBeVisible();
  await expect(chart.locator("g[data-lift] polyline")).toHaveCount(4);
  await expect(chart.locator("circle")).toHaveCount(5);
  await expect(page.locator(".chart-legend")).toContainText("149.7 kg");
  await expect(page.locator(".chart-legend")).toContainText("100.0 kg");
  await expect(page.locator(".chart-legend")).toContainText("181.4 kg");
  await expect(page.locator(".chart-legend")).toContainText("50.0 kg");
  const positions = await chart
    .locator("circle")
    .evaluateAll((circles) =>
      circles.map((circle) => [
        Number(circle.getAttribute("cx")),
        Number(circle.getAttribute("cy")),
      ]),
    );
  expect(positions[0][0]).toBeLessThan(positions[2][0]);
  expect(positions[2][0]).toBeLessThan(positions[3][0]);
  expect(positions[3][0]).toBeLessThan(positions[4][0]);
  expect(positions[4][0]).toBeLessThan(positions[1][0]);
  expect(positions[3][1]).toBeLessThan(positions[4][1]); // Deadlift exceeds press on the shared y axis.
  const colors = await chart
    .locator("polyline")
    .evaluateAll((lines) => lines.map((line) => getComputedStyle(line).stroke));
  expect(new Set(colors).size).toBe(4);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const notice = page.getByRole("button", { name: "Got it", exact: true });
  if (await notice.isVisible()) await notice.click();
  await page
    .locator(".chart-panel")
    .screenshot({ path: "test-results/combined-history-mobile.png" });
});
