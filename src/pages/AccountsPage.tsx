import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CreditCard, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format, subDays } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";

interface Account {
  id: string;
  account_number: string;
  account_type: string;
  available_balance: number;
  ledger_balance: number;
  currency: string;
  status: string;
  created_at: string;
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balanceHistory, setBalanceHistory] = useState<{ date: string; balance: number }[]>([]);
  const [historyDays, setHistoryDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    if (data) setAccounts(data);
    setLoading(false);
  };

  const loadAccountTransactions = async (accountId: string, days: number) => {
    const since = subDays(new Date(), days).toISOString();
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("account_id", accountId)
      .gte("created_at", since)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error(error.message);
      return [];
    }
    return data ?? [];
  };

  const buildBalanceHistory = (txns: Transaction[], currentBalance: number, days: number) => {
    // walk backwards from current balance
    let bal = currentBalance;
    const sorted = [...txns].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const points: { date: string; balance: number }[] = [{ date: format(new Date(), "MMM dd"), balance: bal }];

    sorted.forEach((t) => {
      const isIncome = ["deposit", "loan_disbursement", "cashback", "system"].some((k) => t.transaction_type.includes(k));
      bal = isIncome ? bal - t.amount : bal + t.amount;
      points.unshift({ date: format(new Date(t.created_at), "MMM dd"), balance: Math.max(0, bal) });
    });

    return points;
  };

  const handleViewAccount = async (account: Account) => {
    setSelectedAccount(account);
    const txns = await loadAccountTransactions(account.id, historyDays);
    setTransactions(txns.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setBalanceHistory(buildBalanceHistory(txns, account.available_balance, historyDays));
    setSheetOpen(true);
  };

  const handleDaysChange = async (days: number) => {
    setHistoryDays(days);
    if (!selectedAccount) return;
    const txns = await loadAccountTransactions(selectedAccount.id, days);
    setTransactions(txns.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setBalanceHistory(buildBalanceHistory(txns, selectedAccount.available_balance, days));
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F4F5F7] p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#0A1628] border-l-4 border-[#C9A84C] pl-3">My Accounts</h1>
          <p className="text-muted-foreground mt-2">Manage your bank accounts</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Card key={idx} className="bg-white rounded-xl shadow-sm border-0 p-5 space-y-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-56" />
                <Skeleton className="h-3 w-32" />
              </Card>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <Card className="bg-white rounded-xl shadow-sm border-0 p-12 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-[#2C4A7C] mb-4" />
            <h3 className="text-lg font-semibold text-[#0A1628] mb-1">No accounts found</h3>
            <p className="text-muted-foreground">You don’t have any accounts yet. Contact support to open one.</p>
          </Card>
        ) : (
          <>
            {/* Mobile: horizontal scroll carousel */}
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory md:hidden">
              {accounts.map((account) => (
                <div key={account.id} className="snap-center flex-shrink-0 w-[85vw]">
                  <button
                    onClick={() => handleViewAccount(account)}
                    className="w-full text-left bg-white rounded-xl shadow-sm border-0 p-5 transition-all hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-5">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{account.account_type} Account</p>
                      <Badge className="rounded-full bg-[var(--bank-navy)] text-white border-0 capitalize px-3 py-1 text-xs">{account.status || "active"}</Badge>
                    </div>
                    <p className="text-sm font-mono text-[var(--bank-slate)] mb-3">•••• •••• •••• {account.account_number.slice(-4)}</p>
                    <p className="text-xs text-muted-foreground">Available Balance</p>
                    <p className="text-3xl font-bold tracking-tight text-[var(--bank-navy)]" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {account.currency || "USD"} {account.available_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop: grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleViewAccount(account)}
                  className="w-full text-left bg-white rounded-xl shadow-sm border-0 p-5 transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{account.account_type} Account</p>
                    <Badge className="rounded-full bg-[var(--bank-navy)] text-white border-0 capitalize px-3 py-1 text-xs">{account.status || "active"}</Badge>
                  </div>
                  <p className="text-sm font-mono text-[var(--bank-slate)] mb-3">•••• •••• •••• {account.account_number.slice(-4)}</p>
                  <p className="text-xs text-muted-foreground">Available Balance</p>
                  <p className="text-3xl font-bold tracking-tight text-[var(--bank-navy)]" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {account.currency || "USD"} {account.available_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="capitalize">
                {selectedAccount?.account_type} Account Details
              </SheetTitle>
              <SheetDescription>
                Account #••••{selectedAccount?.account_number.slice(-4)}
              </SheetDescription>
            </SheetHeader>

            {selectedAccount && (
              <div className="mt-6 space-y-6">
                <Card className="bg-white rounded-xl shadow-sm border-0">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-3xl font-bold mt-1 text-[var(--bank-navy)]" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {selectedAccount.currency} {selectedAccount.available_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    <div className="mt-4 flex justify-between text-sm text-muted-foreground">
                      <span>Ledger: {selectedAccount.currency} {selectedAccount.ledger_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      <Badge className="rounded-full bg-[var(--bank-navy)] text-white border-0 capitalize">{selectedAccount.status}</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Balance History Chart */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm">Balance History</h4>
                    <div className="flex gap-1">
                      {[7, 30, 90].map((d) => (
                        <Button
                          key={d}
                          variant={historyDays === d ? "default" : "outline"}
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => handleDaysChange(d)}
                        >
                          {d}d
                        </Button>
                      ))}
                    </div>
                  </div>
                  {balanceHistory.length > 1 ? (
                    <div className="h-[160px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={balanceHistory}>
                          <defs>
                            <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--bank-gold)" stopOpacity={0.28} />
                              <stop offset="95%" stopColor="var(--bank-gold)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} width={55} />
                          <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                          <Area type="monotone" dataKey="balance" stroke="var(--bank-navy)" fill="url(#balGrad)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">Not enough data for this period</p>
                  )}
                </div>

                {/* Recent Transactions */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm">Recent Transactions</h4>
                  {transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent transactions
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {transactions.slice(0, 10).map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-secondary/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${
                              tx.transaction_type.includes("deposit") ? "bg-green-500/10" : "bg-destructive/10"
                            }`}>
                              {tx.transaction_type.includes("deposit") ? (
                                <ArrowDownRight className="h-4 w-4 text-green-600" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium capitalize">
                                {tx.transaction_type.replace(/_/g, " ")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(tx.created_at), "MMM dd, HH:mm")}
                              </p>
                            </div>
                          </div>
                          <span className={`text-sm font-semibold ${
                            tx.transaction_type.includes("deposit") ? "text-green-600" : "text-destructive"
                          }`}>
                            {tx.transaction_type.includes("deposit") ? "+" : "-"}
                            ${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
}
