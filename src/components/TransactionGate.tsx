import { ReactNode } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAccountStatusLabel, getAccountStatusMessage } from "@/lib/accountStatus";
import type { UserAccount } from "@/hooks/useUserAccounts";

/**
 * Wraps a transactional page's content (Transfer, Wire Transfer, Bill Pay,
 * ATM Withdrawal, add-Beneficiary, etc.). If the user has no usable
 * account at all, this replaces the form entirely with a prominent,
 * full-width gate explaining why — rather than showing a broken or empty
 * form. If at least one usable account exists, children render normally
 * (individual pages are still responsible for excluding/flagging any
 * restricted accounts in their own selectors).
 */
export function TransactionGate({
  loading,
  hasUsableAccount,
  restrictedAccounts,
  children,
}: {
  loading: boolean;
  hasUsableAccount: boolean;
  restrictedAccounts: UserAccount[];
  children: ReactNode;
}) {
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasUsableAccount) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Card className="border-0 shadow-sm">
          <CardContent className="space-y-5 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <ShieldAlert className="h-8 w-8 text-red-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-[#0A1628]">Transactions Unavailable</h2>
              <p className="text-sm text-muted-foreground">
                {restrictedAccounts.length > 0
                  ? "None of your accounts are currently able to transact."
                  : "You don't have an account set up for transactions yet."}
              </p>
            </div>
            {restrictedAccounts.length > 0 && (
              <div className="space-y-2 rounded-lg bg-red-50 p-4 text-left">
                {restrictedAccounts.map((account) => (
                  <div key={account.id} className="text-sm">
                    <p className="font-medium text-red-800">
                      {account.account_type.toUpperCase()} •••{account.account_number.slice(-4)} — {getAccountStatusLabel(account.status)}
                    </p>
                    <p className="text-red-700">{getAccountStatusMessage(account.status)}</p>
                  </div>
                ))}
              </div>
            )}
            <Button
              onClick={() => {
                window.location.href = "/help";
              }}
            >
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
