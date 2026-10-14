import type { Settings } from "../domain/model";
import { playChime } from "./timerAudio";
export async function requestTimerNotifications(): Promise<string> {
  if (!("Notification" in window) || !window.isSecureContext)
    return "Notifications are unavailable here. Use HTTPS and, on iPhone, the installed Home Screen app.";
  try {
    const permission = await Notification.requestPermission();
    return permission === "granted"
      ? "Notifications enabled. Save changes to keep this preference."
      : "Notifications were not allowed. You can change permission in your browser settings.";
  } catch {
    return "This browser could not enable notifications.";
  }
}
export async function alertTimerComplete(
  settings: Settings,
  id: string,
  body: string,
) {
  if (settings.timerAlerts.sound) {
    try {
      playChime(settings.chime, 10);
    } catch {
      /* Browser may block audio. */
    }
  }
  if (settings.timerAlerts.vibration) {
    try {
      navigator.vibrate?.([200, 100, 200]);
    } catch {
      /* Unsupported devices remain usable. */
    }
  }
  if (
    !settings.timerAlerts.notifications ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  )
    return;
  try {
    const url = new URL(location.href);
    url.searchParams.set("timer", "1");
    const options: NotificationOptions = {
      body,
      tag: `bbb-rest-${id}`,
      icon: new URL("icon-192.png", document.baseURI).href,
      silent: !settings.timerAlerts.sound,
      data: { url: url.href },
    };
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration)
      await registration.showNotification("Rest complete", options);
    else new Notification("Rest complete", options);
  } catch {
    /* Permission, platform or service worker restrictions must not interrupt logging. */
  }
}
