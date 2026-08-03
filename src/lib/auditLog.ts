import { supabase } from "@/integrations/supabase/client";

/**
 * Records an admin audit-log entry on a best-effort basis. Never throws: a
 * logging failure must not block or falsely report failure for the action
 * it's describing (the action's own write already succeeded by the time
 * this is called).
 */
export const logAdminAction = async (action: string, userId: string | null | undefined, metadata: Record<string, unknown>) => {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      action,
      user_id: userId ?? null,
      metadata,
    });
    if (error) console.warn(`Audit log failed for "${action}":`, error.message);
  } catch (error) {
    console.warn(`Audit log failed for "${action}":`, error);
  }
};
