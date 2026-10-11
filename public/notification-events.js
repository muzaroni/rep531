// Local timer notifications navigate back to the offline app, never an external URL.
self.addEventListener("notificationclick", (event) => {
  if (!event.notification.tag.startsWith("bbb-rest-")) return;
  event.notification.close();
  event.waitUntil(
    (async () => {
      const target = new URL(
        event.notification.data?.url || self.registration.scope,
      );
      if (
        target.origin !== self.location.origin ||
        !target.href.startsWith(self.registration.scope)
      )
        return;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windows.find((client) =>
        client.url.startsWith(self.registration.scope),
      );
      if (existing) {
        await existing.focus();
        existing.postMessage({ type: "bbb-open-timer" });
      } else await self.clients.openWindow(target.href);
    })(),
  );
});
