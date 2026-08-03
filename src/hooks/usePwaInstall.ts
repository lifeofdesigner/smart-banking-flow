import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const isIOSDevice = () => {
  const ua = window.navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ reports as "MacIntel" with touch support — treat as iOS too.
  const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isIOS || isIPadOS;
};

const isStandaloneDisplay = () =>
  window.matchMedia("(display-mode: standalone)").matches
  || (window.navigator as unknown as { standalone?: boolean }).standalone === true
  || document.referrer.startsWith("android-app://");

/**
 * Wraps the native beforeinstallprompt flow (Chrome/Edge/Android) and adds
 * the two things the browser API doesn't give you: reliable "already
 * installed" detection, and an iOS flag so callers can fall back to manual
 * "Add to Home Screen" instructions (Safari never fires
 * beforeinstallprompt at all).
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay());
    setIsIOS(isIOSDevice());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === "accepted";
  }, [deferredPrompt]);

  return {
    /** True once the browser has offered a native install prompt we can trigger. */
    canPromptNatively: deferredPrompt !== null,
    /** True if the app is already running as an installed PWA. */
    isStandalone,
    /** True on iOS/iPadOS, where only manual "Add to Home Screen" instructions are possible. */
    isIOS,
    promptInstall,
  };
}
