import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const LOCAL_STORAGE_KEY = "cached-site-settings";

const readLocalStorageCache = (): Record<string, string> | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeLocalStorageCache = (settings: Record<string, string>) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can fail (quota, private browsing) -- this is only a
    // first-paint optimization, never the source of truth, so ignore it.
  }
};

// Seeded synchronously from localStorage at module load so the very first
// render already shows real branding instead of the empty-object fallback
// every consumer falls back from -- without this, every page navigation
// briefly flashes generic placeholder text/logo before snapping to the
// real site name/branding once the network fetch resolves. A fresh fetch
// still always runs once per session (see hasFetchedThisSession) so
// changes made since the last visit are picked up, just silently in the
// background instead of as a visible flash.
let settingsCache: Record<string, string> | null = readLocalStorageCache();
let settingsPromise: Promise<Record<string, string>> | null = null;
let hasFetchedThisSession = false;
const SITE_SETTINGS_CHANGED_EVENT = "site-settings-changed";

export const invalidateSiteSettingsCache = () => {
  settingsCache = null;
  settingsPromise = null;
  hasFetchedThisSession = false;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SITE_SETTINGS_CHANGED_EVENT));
  }
};

const loadSiteSettings = async () => {
  if (hasFetchedThisSession && settingsCache) {
    return settingsCache;
  }

  if (settingsPromise) {
    return settingsPromise;
  }

  settingsPromise = supabase
    .from("site_settings")
    .select("key, value")
    .then(({ data, error }) => {
      if (error) {
        settingsCache = settingsCache || {};
        return settingsCache;
      }

      settingsCache = (data || []).reduce<Record<string, string>>((acc, row) => {
        // Trim so a whitespace-only value (e.g. an admin accidentally saving
        // a blank field) doesn't defeat `siteSettings.x || fallback` checks
        // everywhere — whitespace-only is truthy in JS but not a real value.
        acc[row.key] = (row.value || "").trim();
        return acc;
      }, {});

      hasFetchedThisSession = true;
      writeLocalStorageCache(settingsCache);
      return settingsCache;
    })
    .catch(() => {
      settingsCache = settingsCache || {};
      return settingsCache;
    })
    .finally(() => {
      settingsPromise = null;
    });

  return settingsPromise;
};

export function useSiteSettings() {
  const [settings, setSettings] = useState<Record<string, string>>(settingsCache || {});

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const nextSettings = await loadSiteSettings();
      if (mounted) {
        setSettings(nextSettings);
      }
    };

    void load();
    window.addEventListener(SITE_SETTINGS_CHANGED_EVENT, load);

    return () => {
      mounted = false;
      window.removeEventListener(SITE_SETTINGS_CHANGED_EVENT, load);
    };
  }, []);

  return settings;
}
