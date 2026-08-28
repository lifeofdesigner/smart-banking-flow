export interface SpendingCategory {
  key: string;
  label: string;
  color: string;
  icon: string;
}

export const CATEGORIES: SpendingCategory[] = [
  { key: "transfer", label: "Transfers", color: "var(--bank-slate)", icon: "↔️" },
  { key: "wire_transfer", label: "Wire Transfers", color: "#0EA5E9", icon: "🌐" },
  { key: "shopping", label: "Shopping & Retail", color: "#EC4899", icon: "🛍️" },
  { key: "food_dining", label: "Food & Dining", color: "#F59E0B", icon: "🍽️" },
  { key: "bills_utilities", label: "Bills & Utilities", color: "#8B5CF6", icon: "⚡" },
  { key: "travel_transport", label: "Travel & Transport", color: "#10B981", icon: "🚗" },
  { key: "entertainment", label: "Entertainment", color: "#F43F5E", icon: "🎬" },
  { key: "health", label: "Health & Medical", color: "#06B6D4", icon: "💊" },
  { key: "withdrawal", label: "Withdrawals & Cash", color: "#64748B", icon: "📤" },
  { key: "loan_repayment", label: "Loan Repayments", color: "#D97706", icon: "💳" },
  { key: "fee", label: "Bank Fees & Charges", color: "#EF4444", icon: "💰" },
  { key: "investments", label: "Investments", color: "var(--bank-gold)", icon: "📈" },
  { key: "other", label: "Other Expenses", color: "#94A3B8", icon: "📋" },
];

export function getCategoryForType(transactionType: string, description: string = ""): SpendingCategory {
  const desc = (description || "").toLowerCase();
  const t = (transactionType || "").toLowerCase();

  if (desc.includes("amazon") || desc.includes("walmart") || desc.includes("apple") || desc.includes("target") || desc.includes("store") || desc.includes("shop") || desc.includes("mall") || desc.includes("clothing") || desc.includes("ebay") || desc.includes("best buy") || desc.includes("nike") || desc.includes("zara")) {
    return CATEGORIES.find((c) => c.key === "shopping")!;
  }
  if (desc.includes("restaurant") || desc.includes("cafe") || desc.includes("coffee") || desc.includes("starbucks") || desc.includes("mcdonald") || desc.includes("food") || desc.includes("ubereats") || desc.includes("doordash") || desc.includes("diner") || desc.includes("pizza") || desc.includes("grocery") || desc.includes("supermarket") || desc.includes("bakery")) {
    return CATEGORIES.find((c) => c.key === "food_dining")!;
  }
  if (desc.includes("electric") || desc.includes("power") || desc.includes("water") || desc.includes("gas bill") || desc.includes("utility") || desc.includes("rent") || desc.includes("internet") || desc.includes("wifi") || desc.includes("telecom") || desc.includes("phone bill") || desc.includes("bill") || t.includes("bill")) {
    return CATEGORIES.find((c) => c.key === "bills_utilities")!;
  }
  if (desc.includes("uber") || desc.includes("lyft") || desc.includes("airline") || desc.includes("flight") || desc.includes("hotel") || desc.includes("airbnb") || desc.includes("gas station") || desc.includes("fuel") || desc.includes("parking") || desc.includes("transit") || desc.includes("metro")) {
    return CATEGORIES.find((c) => c.key === "travel_transport")!;
  }
  if (desc.includes("netflix") || desc.includes("spotify") || desc.includes("cinema") || desc.includes("movie") || desc.includes("theatre") || desc.includes("steam") || desc.includes("playstation") || desc.includes("xbox") || desc.includes("hulu") || desc.includes("disney") || desc.includes("subscription")) {
    return CATEGORIES.find((c) => c.key === "entertainment")!;
  }
  if (desc.includes("pharmacy") || desc.includes("hospital") || desc.includes("clinic") || desc.includes("doctor") || desc.includes("dental") || desc.includes("health") || desc.includes("gym") || desc.includes("fitness")) {
    return CATEGORIES.find((c) => c.key === "health")!;
  }
  if (desc.includes("fee") || desc.includes("charge") || t.includes("fee")) {
    return CATEGORIES.find((c) => c.key === "fee")!;
  }
  if (t.includes("wire") || desc.includes("wire")) {
    return CATEGORIES.find((c) => c.key === "wire_transfer")!;
  }
  if (t.includes("invest") || desc.includes("invest") || desc.includes("stock") || desc.includes("deposit treasury") || desc.includes("portfolio")) {
    return CATEGORIES.find((c) => c.key === "investments")!;
  }
  if (t.includes("loan_repay") || desc.includes("loan repayment") || desc.includes("mortgage")) {
    return CATEGORIES.find((c) => c.key === "loan_repayment")!;
  }
  if (t.includes("withdraw") || t.includes("atm") || desc.includes("atm")) {
    return CATEGORIES.find((c) => c.key === "withdrawal")!;
  }
  if (t.includes("transfer")) {
    return CATEGORIES.find((c) => c.key === "transfer")!;
  }

  const found = CATEGORIES.find((c) => t.includes(c.key));
  return found || CATEGORIES[CATEGORIES.length - 1];
}

export function isIncomeType(type: string, description: string = ""): boolean {
  const t = (type || "").toLowerCase();
  const d = (description || "").toLowerCase();
  if (t.includes("deposit") || t.includes("credit") || t.includes("cashback") || t.includes("refund") || t.includes("loan_disbursement") || t.includes("salary") || t.includes("payroll")) {
    return true;
  }
  if (d.includes("deposit") || d.includes("salary") || d.includes("received") || d.includes("refund") || d.includes("cashback") || d.includes("payroll")) {
    return true;
  }
  return false;
}

export function isExpenseType(type: string, description: string = ""): boolean {
  return !isIncomeType(type, description);
}
