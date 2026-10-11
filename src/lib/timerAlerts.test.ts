import { afterEach, describe, expect, it, vi } from "vitest";
import { defaults } from "../domain/model";
import { parseBackup, exportBackup } from "../data/storage";
import { alertTimerComplete, requestTimerNotifications } from "./timerAlerts";
import { playChime } from "./timerAudio";
vi.mock("./timerAudio", () => ({ playChime: vi.fn() }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
describe("timer alerts", () => {
  it("fires configured audio, vibration and local notification without requesting permission", async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined),
      vibrate = vi.fn(),
      requestPermission = vi.fn();
    vi.stubGlobal("window", { Notification: {} });
    vi.stubGlobal("Notification", { permission: "granted", requestPermission });
    vi.stubGlobal("navigator", {
      vibrate,
      serviceWorker: { getRegistration: async () => ({ showNotification }) },
    });
    vi.stubGlobal("location", { href: "https://example.com/bbb/" });
    vi.stubGlobal("document", { baseURI: "https://example.com/bbb/" });
    const settings = defaults().settings;
    settings.timerAlerts.notifications = true;
    await alertTimerComplete(settings, "timer-one", "Squat: 100 kg × 5");
    expect(playChime).toHaveBeenCalledWith(settings.chime);
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(showNotification).toHaveBeenCalledWith(
      "Rest complete",
      expect.objectContaining({
        tag: "bbb-rest-timer-one",
        body: "Squat: 100 kg × 5",
        icon: "https://example.com/bbb/icon-192.png",
        data: { url: "https://example.com/bbb/?timer=1" },
      }),
    );
    expect(requestPermission).not.toHaveBeenCalled();
    settings.timerAlerts = {
      sound: false,
      vibration: false,
      notifications: false,
    };
    await alertTimerComplete(settings, "timer-two", "Rest over");
    expect(showNotification).toHaveBeenCalledTimes(1);
    expect(playChime).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledTimes(1);
  });
  it("handles unsupported APIs, denied permission and unavailable delivery", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", {});
    await expect(requestTimerNotifications()).resolves.toContain("unavailable");
    await expect(
      alertTimerComplete(defaults().settings, "one", "Rest over"),
    ).resolves.toBeUndefined();
    vi.stubGlobal("window", { Notification: {}, isSecureContext: true });
    vi.stubGlobal("Notification", {
      permission: "denied",
      requestPermission: async () => "denied",
    });
    await expect(requestTimerNotifications()).resolves.toContain("not allowed");
  });
  it("keeps alert preferences in backups and defaults older files safely", () => {
    const state = defaults();
    state.settings.timerAlerts = {
      sound: false,
      vibration: false,
      notifications: true,
    };
    expect(parseBackup(exportBackup(state)).settings.timerAlerts).toEqual(
      state.settings.timerAlerts,
    );
    const legacy = JSON.parse(exportBackup(state));
    delete legacy.settings.timerAlerts;
    expect(parseBackup(JSON.stringify(legacy)).settings.timerAlerts).toEqual({
      sound: true,
      vibration: true,
      notifications: false,
    });
  });
});
