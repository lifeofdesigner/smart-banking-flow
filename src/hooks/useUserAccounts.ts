import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isAccountUsable } from "@/lib/accountStatus";

export interface UserAccount {
  id: string;
  account_number: string;
  account_type: string;
  currency: string;
  status: string;
  computed_balance: number;
}

/**
 * Loads every account the current user owns, regardless of status, so
 * restricted accounts can be shown (and clearly explained) instead of
 * silently vanishing from selectors. Use `usableAccounts` for anything that
 * moves money.
 */
export function useUserAccounts(userId: string | null | undefined) {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("accounts")
      .select("id, account_number, account_type, currency, status, available_balance")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    setAccounts(
      (data || []).map((a) => ({
        id: a.id,
        account_number: a.account_number,
        account_type: a.account_type,
        currency: a.currency || "USD",
        status: a.status || "active",
        computed_balance: a.available_balance ?? 0,
      })),
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const usableAccounts = accounts.filter((a) => isAccountUsable(a.status));
  const restrictedAccounts = accounts.filter((a) => !isAccountUsable(a.status));

  return {
    accounts,
    usableAccounts,
    restrictedAccounts,
    hasUsableAccount: usableAccounts.length > 0,
    loading,
    reload,
  };
}
