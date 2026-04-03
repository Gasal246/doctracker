import { getOptionalEnv } from "@/lib/env";

const FIREBASE_SCRIPT_VERSION = "12.11.0";

export const dynamic = "force-dynamic";

function buildServiceWorkerScript() {
  const firebaseConfig = {
    apiKey: getOptionalEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: getOptionalEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: getOptionalEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: getOptionalEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: getOptionalEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: getOptionalEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  };
  const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

  return `
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

${isFirebaseConfigured ? `importScripts("https://www.gstatic.com/firebasejs/${FIREBASE_SCRIPT_VERSION}/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/${FIREBASE_SCRIPT_VERSION}/firebase-messaging-compat.js");

firebase.initializeApp(${JSON.stringify(firebaseConfig, null, 2)});
firebase.messaging();` : ""}
`;
}

export async function GET() {
  return new Response(buildServiceWorkerScript(), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
    },
  });
}
