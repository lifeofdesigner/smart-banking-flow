import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSiteSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase.from("site_settings").select("key, value");
      if (error || !mounted) return;

      const map = (data || []).reduce<Record<string, string>>((acc, row) => {
        acc[row.key] = row.value || "";
        return acc;
      }, {});

      setSettings(map);
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return settings;
}

