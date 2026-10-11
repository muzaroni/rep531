import { test, expect } from "./fixtures";

test("screen awake requests, releases, reacquires and respects the saved preference", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const stats = { requests: 0, releases: 0 };
    Object.assign(window, { wakeStats: stats });
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: {
        request: async () => {
          stats.requests++;
          const sentinel = {
            released: false,
            release: async () => {
              if (!sentinel.released) stats.releases++;
              sentinel.released = true;
            },
          };
          return sentinel;
        },
      },
    });
  });
  await page.goto("./");
  const stats = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            wakeStats: { requests: number; releases: number };
          }
        ).wakeStats,
    );
  await expect.poll(async () => (await stats()).requests).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(async () => (await stats()).releases).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(async () => (await stats()).requests).toBe(2);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("checkbox", { name: /Keep screen awake/ }).uncheck();
  await page
    .getByRole("button", { name: "Save changes", exact: true })
    .first()
    .click();
  await expect.poll(async () => (await stats()).releases).toBe(2);
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: /Keep screen awake/ }),
  ).not.toBeChecked();
  expect((await stats()).requests).toBe(0);
});

for (const mode of ["unsupported", "refused"]) {
  test(`logging still works when screen wake lock is ${mode}`, async ({
    page,
  }) => {
    await page.addInitScript((mode) => {
      Object.defineProperty(navigator, "wakeLock", {
        configurable: true,
        value:
          mode === "unsupported"
            ? undefined
            : {
                request: async () => {
                  throw new DOMException("Low power", "NotAllowedError");
                },
              },
      });
    }, mode);
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("./");
    await page
      .getByRole("button", { name: "Start workout", exact: true })
      .click();
    await page.getByLabel("working set 1 reps", { exact: true }).fill("7");
    await expect(
      page.getByLabel("working set 1 reps", { exact: true }),
    ).toHaveValue("7");
    expect(errors).toEqual([]);
  });
}
