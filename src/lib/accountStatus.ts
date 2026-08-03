/**
 * Single source of truth for "can this account be used to move money" on the
 * frontend. The database enforces the same rule independently inside
 * execute_transaction() (SET search_path, SECURITY DEFINER) — this is a
 * convenience layer for UI, not the security boundary.
 */
export const isAccountUsable = (status: string | null | undefined) => status === "active";

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  frozen: "Frozen",
  closed: "Closed",
};

export const getAccountStatusLabel = (status: string | null | undefined) =>
  (status && ACCOUNT_STATUS_LABELS[status]) || (status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown");

export const getAccountStatusMessage = (status: string | null | undefined) => {
  switch (status) {
    case "frozen":
      return "This account is on hold. Transactions are unavailable until the hold is lifted.";
    case "closed":
      return "This account has been closed and can no longer be used.";
    default:
      return status
        ? `This account's status (${getAccountStatusLabel(status)}) does not allow transactions right now.`
        : "This account cannot be used for transactions right now.";
  }
};
