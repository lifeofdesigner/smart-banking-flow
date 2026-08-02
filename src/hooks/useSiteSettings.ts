import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let settingsCache: Record<string, string> | null = null;
let settingsPromise: Promise<Record<string, string>> | null = null;
const SITE_SETTINGS_CHANGED_EVENT = "site-settings-changed";

export const invalidateSiteSettingsCache = () => {
  settingsCache = null;
  settingsPromise = null;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SITE_SETTINGS_CHANGED_EVENT));
  }
};

const loadSiteSettings = async () => {
  if (settingsCache) {
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
        settingsCache = {};
        return settingsCache;
      }

      settingsCache = (data || []).reduce<Record<string, string>>((acc, row) => {
        // Trim so a whitespace-only value (e.g. an admin accidentally saving
        // a blank field) doesn't defeat `siteSettings.x || fallback` checks
        // everywhere — whitespace-only is truthy in JS but not a real value.
        acc[row.key] = (row.value || "").trim();
        return acc;
      }, {});

      return settingsCache;
    })
    .catch(() => {
      settingsCache = {};
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

