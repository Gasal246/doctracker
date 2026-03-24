self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination =
    event.notification?.data?.FCM_MSG?.data?.url ||
    event.notification?.data?.url ||
    "/dashboard/documents";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => "focus" in client);

      if (existingClient) {
        existingClient.navigate(destination);
        return existingClient.focus();
      }

      return self.clients.openWindow(destination);
    }),
  );
});
