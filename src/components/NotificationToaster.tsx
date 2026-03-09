import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function NotificationToaster() {
  useEffect(() => {
    let userId: string | null = null;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      const channel = supabase
        .channel("notification-toasts")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications" },
          (payload) => {
            const n = payload.new as any;
            if (n.user_id !== userId) return;

            const isAlert = ["debit_alert", "transfer_failed", "fraud_alert"].includes(n.type);
            if (isAlert) {
              toast.warning(n.title, { description: n.message, duration: 6000 });
            } else {
              toast(n.title, { description: n.message, duration: 4000 });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setup();
    return () => { cleanup.then((fn) => fn?.()); };
  }, []);

  return null;
}
