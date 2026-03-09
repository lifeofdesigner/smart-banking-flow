export interface SpendingCategory {
  key: string;
  label: string;
  color: string;
  icon: string;
}

export const CATEGORIES: SpendingCategory[] = [
  { key: "transfer", label: "Transfers", color: "hsl(221, 83%, 35%)", icon: "↔" },
  { key: "wire_transfer", label: "Wire Transfers", color: "hsl(200, 70%, 40%)", icon: "🌐" },
  { key: "deposit", label: "Deposits", color: "hsl(142, 60%, 40%)", icon: "📥" },
  { key: "withdrawal", label: "Withdrawals", color: "hsl(0, 70%, 55%)", icon: "📤" },
  { key: "loan_disbursement", label: "Loan Received", color: "hsl(38, 92%, 50%)", icon: "🏦" },
  { key: "loan_repayment", label: "Loan Repayment", color: "hsl(30, 80%, 50%)", icon: "💳" },
  { key: "fee", label: "Fees", color: "hsl(0, 50%, 50%)", icon: "💰" },
  { key: "cashback", label: "Cashback", color: "hsl(160, 60%, 45%)", icon: "🎁" },
  { key: "system", label: "System", color: "hsl(220, 10%, 60%)", icon: "⚙️" },
  { key: "other", label: "Other", color: "hsl(220, 10%, 50%)", icon: "📋" },
];

export function getCategoryForType(transactionType: string): SpendingCategory {
  const found = CATEGORIES.find((c) => transactionType.includes(c.key));
  return found || CATEGORIES[CATEGORIES.length - 1];
}

export function isIncomeType(type: string): boolean {
  return ["deposit", "loan_disbursement", "cashback", "system"].some((t) =>
    type.includes(t)
  );
}

export function isExpenseType(type: string): boolean {
  return !isIncomeType(type) && type !== "fee";
}
