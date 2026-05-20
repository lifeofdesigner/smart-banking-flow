import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let settingsCache: Record<string, string> | null = null;
let settingsPromise: Promise<Record<string, string>> | null = null;

export const invalidateSiteSettingsCache = () => {
  settingsCache = null;
  settingsPromise = null;
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
        acc[row.key] = row.value || "";
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

    return () => {
      mounted = false;
    };
  }, []);

  return settings;
}

