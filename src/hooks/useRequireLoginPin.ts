import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type LoginPinStatus = { pin_set: boolean; pin_verified: boolean };

/**
 * Backstop for pages that don't render inside DashboardLayout (which has its
 * own copy of this check baked into syncAuthState). There's no central
 * route guard in this app, so a session that exists but never completed the
 * sign-in PIN step — another tab, or someone who abandoned the PIN screen —
 * could otherwise reach these pages directly. Signs out and redirects if the
 * signed-in user still owes a PIN verification for their current login.
 * Admins are exempt automatically: my_login_pin_status() already bakes in
 * the same admin bypass used by the backend's pin_verified() check.
 */
export function useRequireLoginPin(redirectPath: string) {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const { data, error } = await supabase.rpc("my_login_pin_status");

      if (!isMounted) return;

      if (error) {
        await supabase.auth.signOut();
        navigate(redirectPath, { replace: true });
        return;
      }

      const status = data as LoginPinStatus;

      // pin_verified already encodes the admin bypass (true for admins
      // regardless of pin_set) — checking pin_set here too would wrongly
      // bounce an admin who was never assigned a PIN in the first place.
      if (!status.pin_verified) {
        await supabase.auth.signOut();
        navigate(redirectPath, { replace: true });
      }
    };

    void check();

    return () => {
      isMounted = false;
    };
  }, [navigate, redirectPath]);
}
