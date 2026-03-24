"use client";

import { useEffect, useState } from "react";

import { BrandMark, SketchButton } from "@/components/sketch-ui";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

function isStandalone() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari standalone
    window.navigator.standalone === true
  );
}

function isMobileBrowser() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(max-width: 1024px)").matches;
}

function isIosBrowser() {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();

  return /iphone|ipad|ipod/.test(userAgent);
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIosHelpVisible, setIsIosHelpVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (!isMobileBrowser() || isStandalone()) {
      return;
    }

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }

    if (isIosBrowser()) {
      const timeoutId = window.setTimeout(() => {
        setIsIosHelpVisible(true);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  async function handleInstall() {
    if (!installEvent) {
      return;
    }

    setIsInstalling(true);

    await installEvent.prompt();
    await installEvent.userChoice;

    setIsInstalling(false);
    setIsVisible(false);
    setInstallEvent(null);
  }

  if (!isVisible && !isIosHelpVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[rgba(34,31,28,0.28)] p-4 sm:items-center">
      <div className="sketch-panel paper-grid w-full max-w-md p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <p className="text-3xl leading-none">Install Doc Tracker</p>
              <p className="mt-2 text-xl text-[var(--sketch-muted)]">
                Open it like a native app on your device.
              </p>
            </div>
          </div>

          <button
            aria-label="Close install prompt"
            className="flex h-10 w-10 items-center justify-center rounded-[14px] border-[3px] border-[var(--sketch-ink)] bg-[rgba(255,255,255,0.82)] text-2xl shadow-[2px_2px_0_rgba(34,31,28,0.45)]"
            onClick={() => {
              setIsVisible(false);
              setIsIosHelpVisible(false);
            }}
            type="button"
          >
            ×
          </button>
        </div>

        {isIosHelpVisible ? (
          <div className="space-y-4">
            <p className="text-xl leading-snug">
              To install on iPhone or iPad, tap the browser share button and then
              choose <strong>Add to Home Screen</strong>.
            </p>
            <SketchButton
              className="w-full"
              onClick={() => setIsIosHelpVisible(false)}
              tone="muted"
            >
              Close
            </SketchButton>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xl leading-snug">
              Install this app on your device for a full-screen, native-style
              experience.
            </p>

            <div className="flex flex-wrap gap-3">
              <SketchButton
                className="flex-1"
                disabled={isInstalling}
                onClick={() => void handleInstall()}
              >
                {isInstalling ? "Installing..." : "Install App"}
              </SketchButton>
              <SketchButton
                className="flex-1"
                onClick={() => setIsVisible(false)}
                tone="muted"
              >
                Later
              </SketchButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
