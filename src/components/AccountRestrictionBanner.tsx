import { ShieldAlert } from "lucide-react";
import { getAccountStatusLabel, getAccountStatusMessage } from "@/lib/accountStatus";
import type { UserAccount } from "@/hooks/useUserAccounts";

/**
 * Persistent, full-width, unmissable banner shown whenever the signed-in
 * user has one or more restricted accounts. Lists each affected account by
 * name so the customer isn't left guessing which one, or why. Rendered
 * inside the normal document flow (never as a sibling of a flex row) so it
 * can never collapse into a vertical sliver.
 */
export function AccountRestrictionBanner({ restrictedAccounts }: { restrictedAccounts: UserAccount[] }) {
  if (restrictedAccounts.length === 0) return null;

  return (
    <div className="w-full border-b border-red-800 bg-red-600 px-4 py-3 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold">
            {restrictedAccounts.length === 1 ? "One of your accounts is restricted" : "Some of your accounts are restricted"}
          </p>
          <ul className="space-y-0.5 text-sm text-white/90">
            {restrictedAccounts.map((account) => (
              <li key={account.id}>
                <span className="font-medium">
                  {account.account_type.toUpperCase()} •••{account.account_number.slice(-4)}
                </span>{" "}
                — {getAccountStatusLabel(account.status)}: {getAccountStatusMessage(account.status)}
              </li>
            ))}
          </ul>
          <p className="text-xs text-white/80">
            Transfers, payments, and other transactions are unavailable on restricted accounts. Contact support to resolve this.
          </p>
        </div>
      </div>
    </div>
  );
}
