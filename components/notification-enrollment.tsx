"use client";

import { onMessage, getToken } from "firebase/messaging";
import { useEffect, useState } from "react";

import { SketchButton } from "@/components/sketch-ui";
import { getFirebaseMessagingClient } from "@/lib/firebase-client";

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function NotificationEnrollment() {
  const [isSupported, setIsSupported] = useState(true);
  const [status, setStatus] = useState<
    "denied" | "enabled" | "idle" | "prompting" | "unsupported"
  >("idle");
  const [message, setMessage] = useState("");

  async function saveToken(
    messaging: Awaited<ReturnType<typeof getFirebaseMessagingClient>>,
    registration: ServiceWorkerRegistration,
  ) {
    if (!messaging) {
      throw new Error("Firebase messaging is not available on this device.");
    }

    if (!vapidKey) {
      throw new Error("Push notifications are not configured correctly.");
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      throw new Error("Unable to create a push notification token.");
    }

    const response = await fetch("/api/notifications/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        platform: "web",
        userAgent: navigator.userAgent,
      }),
    });

    if (!response.ok) {
      throw new Error("Unable to save this device for push reminders.");
    }
  }

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function setup() {
      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        !("serviceWorker" in navigator)
      ) {
        setStatus("unsupported");
        setIsSupported(false);
        return;
      }

      const messaging = await getFirebaseMessagingClient();

      if (!messaging) {
        setStatus("unsupported");
        setIsSupported(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");

        if (Notification.permission === "granted") {
          await saveToken(messaging, registration);
          setStatus("enabled");
        } else if (Notification.permission === "denied") {
          setStatus("denied");
        }
      } catch (error) {
        setStatus("idle");
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to enable push notifications on this device.",
        );
      }

      unsubscribe = onMessage(messaging, (payload) => {
        const title =
          payload.notification?.title ||
          payload.data?.title ||
          "Doc Tracker Reminder";
        const body = payload.notification?.body || payload.data?.body || "";

        if (Notification.permission === "granted") {
          new Notification(title, {
            body,
            icon: "/android-chrome-192x192.png",
          });
        }
      });
    }

    void setup();

    return () => {
      unsubscribe?.();
    };
  }, []);

  async function enableNotifications() {
    try {
      setStatus("prompting");
      setMessage("");

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "idle");
        return;
      }

      const messaging = await getFirebaseMessagingClient();

      if (!messaging) {
        setStatus("unsupported");
        setIsSupported(false);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await saveToken(messaging, registration);

      setStatus("enabled");
      setMessage("Push notifications enabled.");
    } catch (error) {
      setStatus("idle");
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to enable notifications.",
      );
    }
  }

  if (!isSupported || status === "enabled") {
    return null;
  }

  return (
    <div className="mb-6 rounded-[24px] border-[3px] border-[var(--sketch-ink)] bg-[rgba(255,255,255,0.52)] p-4 shadow-[2px_2px_0_rgba(34,31,28,0.45)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-3xl leading-none">Enable push reminders</p>
          <p className="mt-2 text-xl text-[var(--sketch-muted)]">
            Allow browser notifications to receive reminder alerts on this
            device.
          </p>
          {message ? (
            <p className="mt-2 text-lg text-[var(--sketch-muted)]">{message}</p>
          ) : null}
          {status === "denied" ? (
            <p className="mt-2 text-lg text-[var(--sketch-muted)]">
              Notifications are blocked in this browser. Re-enable them from the
              browser site settings.
            </p>
          ) : null}
        </div>

        {status !== "denied" ? (
          <SketchButton
            disabled={status === "prompting"}
            onClick={() => void enableNotifications()}
          >
            {status === "prompting" ? "Enabling..." : "Enable Notifications"}
          </SketchButton>
        ) : null}
      </div>
    </div>
  );
}
