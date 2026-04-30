/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import FinancialHealthWidget from "@/components/FinancialHealthWidget";
import SmartInsightsWidget from "@/components/SmartInsightsWidget";
import AccountCard from "@/components/AccountCard";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  Send,
  Globe,
  Shield,
  CreditCard,
  Banknote,
  PiggyBank,
  BarChart3,
  FileText,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";

interface Account {
  id: string;
  account_number: string;
  account_type: string;
  balance: number;
  computed_balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

interface Profile {
  full_name: string;
  email: string;
}

interface MonthlyChartPoint {
  month: string;
  income: number;
  spending: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast: uiToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyChartData, setMonthlyChartData] = useState<MonthlyChartPoint[]>([]);
  const [overviewOpen, setOverviewOpen] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileError) {
        toast.error(profileError.message);
        return;
      }
      if (profileData) {
        setProfile(profileData);
      }

      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id);
      if (accountsError) {
        toast.error(accountsError.message);
        return;
      }

      if (accountsData) {
        const portfolioTotal = accountsData.reduce(
          (sum, account) => sum + (account.available_balance ?? account.balance ?? 0),
          0,
        );
        setTotalBalance(portfolioTotal);

        setAccounts(
          accountsData.map((account) => ({
            ...account,
            computed_balance: account.available_balance ?? account.balance ?? 0,
          })),
        );

        if (accountsData.length > 0) {
          const allAccountIds = accountsData.map((account) => account.id);
          const { data: txData, error: txError } = await supabase
            .from("transactions")
            .select("*")
            .in("account_id", allAccountIds)
            .order("created_at", { ascending: false })
            .limit(5);
          if (txError) {
            toast.error(txError.message);
            return;
          }
          if (txData) {
            setTransactions(txData);
          }

          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
          sixMonthsAgo.setDate(1);
          sixMonthsAgo.setHours(0, 0, 0, 0);

          const { data: chartTxData, error: chartTxError } = await supabase
            .from("transactions")
            .select("amount, transaction_type, created_at, status")
            .in("account_id", allAccountIds)
            .eq("status", "completed")
            .gte("created_at", sixMonthsAgo.toISOString())
            .order("created_at", { ascending: true });

          if (chartTxError) {
            toast.error(chartTxError.message);
            return;
          }

          const monthKeys: string[] = [];
          const monthMap = new Map<string, MonthlyChartPoint>();

          for (let i = 5; i >= 0; i -= 1) {
            const monthDate = new Date();
            monthDate.setMonth(monthDate.getMonth() - i);
            const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
            const label = monthDate.toLocaleString("en-US", { month: "short" });

            monthKeys.push(key);
            monthMap.set(key, { month: label, income: 0, spending: 0 });
          }

          (chartTxData ?? []).forEach((transaction) => {
            if (!transaction.created_at) return;

            const txDate = new Date(transaction.created_at);
            const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;
            const bucket = monthMap.get(key);
            if (!bucket) return;

            const type = transaction.transaction_type;
            const isIncome = ["deposit", "loan_disbursement", "cashback"].some((token) =>
              type.includes(token),
            );

            if (isIncome) {
              bucket.income += transaction.amount;
            } else if (!type.includes("fee")) {
              bucket.spending += transaction.amount;
            }
          });

          setMonthlyChartData(monthKeys.map((key) => monthMap.get(key)!));
        }
      }
    } catch (error: unknown) {
      uiToast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const firstName = profile?.full_name?.split(" ")[0] || "User";
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();
  const latestMonth = monthlyChartData[monthlyChartData.length - 1];
  const previousMonth = monthlyChartData[monthlyChartData.length - 2];
  const latestNet = latestMonth ? latestMonth.income - latestMonth.spending : 0;
  const previousNet = previousMonth ? previousMonth.income - previousMonth.spending : 0;
  const trendChange = previousNet !== 0
    ? Math.round(((latestNet - previousNet) / Math.abs(previousNet)) * 100)
    : latestNet > 0
      ? 12
      : 0;
  const isPositiveTrend = trendChange >= 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 px-0 py-0 md:space-y-6 md:p-6">
        <div className="space-y-4 md:hidden">
          <div className="rounded-b-[30px] bg-[#0A1628] px-4 pb-5 pt-2">
            <div className="rounded-[24px] bg-gradient-to-br from-[#0A1628] via-[#10203B] to-[#1E3A5F] p-5 shadow-[0_18px_36px_rgba(10,22,40,0.35)]">
              <p className="text-[14px] font-medium text-[#C9A84C]">
                {greeting}, {firstName}
              </p>
              <p className="mt-1 text-[12px] text-white/60">Your finances at a glance</p>
              <p className="mt-5 text-[11px] uppercase tracking-[0.2em] text-white/50">Total Balance</p>
              <p
                className="mt-2 text-[28px] font-bold text-white"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                ${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[10px] text-white/40">Across {accounts.length} accounts</p>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium ${
                    isPositiveTrend ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
                  }`}
                >
                  {isPositiveTrend ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(trendChange)}%
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-start justify-between gap-3">
              {[
                { label: "Send", icon: Send, path: "/transfer" },
                { label: "Receive", icon: ArrowDownLeft, path: "/accounts" },
                { label: "Pay", icon: FileText, path: "/bills" },
                { label: "More", icon: MoreHorizontal, path: "/analytics" },
              ].map(({ label, icon: Icon, path }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => navigate(path)}
                  className="flex min-h-[44px] flex-1 flex-col items-center justify-start gap-2"
                >
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#0A1628] shadow-sm">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-[10px] font-medium text-[#C9A84C]">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-3">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => navigate("/accounts")}
                  className="relative w-[200px] overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A1628] via-[#132744] to-[#264978] p-4 text-left text-white shadow-lg"
                >
                  <div className="mb-6 flex items-start justify-between">
                    <span className="rounded-full bg-[#C9A84C] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0A1628]">
                      {account.account_type}
                    </span>
                    <CreditCard className="h-5 w-5 text-white/70" />
                  </div>
                  <p className="font-mono text-sm tracking-[0.24em]">•••• {account.account_number.slice(-4)}</p>
                  <p className="mt-5 text-[10px] uppercase tracking-[0.18em] text-white/60">Available Balance</p>
                  <p className="text-lg font-semibold">
                    {account.currency || "USD"}{" "}
                    {account.computed_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <h2 className="text-2xl font-bold md:text-3xl">Welcome back, {profile?.full_name}!</h2>
          <p className="text-muted-foreground">Here's your financial overview</p>
        </div>

        <Card className="hidden border-0 bg-white p-4 shadow-sm md:block md:rounded-lg md:p-6">
          <button
            type="button"
            onClick={() => setOverviewOpen((value) => !value)}
            className="flex w-full items-center justify-between text-left"
          >
            <h3 className="text-lg font-semibold" style={{ color: "var(--bank-navy)" }}>
              Financial Overview
            </h3>
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground transition-transform ${overviewOpen ? "rotate-180" : ""}`}
            />
          </button>

          {overviewOpen && (
            <div className="mt-4 space-y-4">
              <FinancialHealthWidget />
              <SmartInsightsWidget />

              <Card className="rounded-lg border-0 bg-white p-4 shadow-sm md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold" style={{ color: "var(--bank-navy)" }}>
                    Income vs Spending - Last 6 Months
                  </h3>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: "var(--bank-slate, #2C4A7C)" }}
                      />
                      <span className="text-muted-foreground">Income</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: "var(--bank-gold, #C9A84C)" }}
                      />
                      <span className="text-muted-foreground">Spending</span>
                    </div>
                  </div>
                </div>

                <div className="h-64 md:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyChartData}>
                      <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.2} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} width={42} />
                      <Tooltip
                        formatter={(value: number) =>
                          `$${value.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="income"
                        stroke="var(--bank-slate, #2C4A7C)"
                        fill="var(--bank-slate, #2C4A7C)"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="spending"
                        stroke="var(--bank-gold, #C9A84C)"
                        fill="var(--bank-gold, #C9A84C)"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}
        </Card>

        <Card className="card-banking hidden p-6 md:block">
          <p className="text-sm text-muted-foreground">Total Portfolio Balance</p>
          <p className="mt-1 text-3xl font-bold">
            ${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Across {accounts.length} accounts</p>
        </Card>

        <div className="hidden gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3">
          {accounts.map((account) => (
            <div key={account.id} className="w-[85vw] flex-shrink-0 snap-center md:w-auto">
              <AccountCard
                accountType={account.account_type}
                accountNumber={account.account_number}
                balance={account.computed_balance}
                currency={account.currency || "USD"}
                status="active"
                onClick={() => navigate("/accounts")}
              />
            </div>
          ))}
          {accounts.length === 0 && (
            <Card className="card-banking col-span-full flex items-center justify-center p-6 text-muted-foreground">
              <p>No accounts found. Contact support to get started.</p>
            </Card>
          )}
        </div>

        <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
          <Card className="card-banking hidden p-6 md:block lg:col-span-1">
            <h3 className="mb-4 text-lg font-bold">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: "Transfer Funds", icon: Send, path: "/transfer" },
                { label: "Wire Transfer", icon: Globe, path: "/wire-transfer" },
                { label: "Savings Goals", icon: PiggyBank, path: "/savings-goals" },
                { label: "Loans", icon: Banknote, path: "/loans" },
                { label: "Analytics", icon: BarChart3, path: "/analytics" },
                { label: "Statements", icon: FileText, path: "/statements" },
                { label: "KYC Verification", icon: Shield, path: "/kyc" },
              ].map(({ label, icon: Icon, path }) => (
                <Button
                  key={path}
                  variant="outline"
                  className="h-11 w-full justify-start rounded-xl"
                  onClick={() => navigate(path)}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>
          </Card>

          <Card className="card-banking rounded-none border-0 p-4 shadow-none md:rounded-xl md:p-6 md:shadow-sm lg:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0A1628]">Recent Transactions</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-11 text-[var(--bank-gold)] hover:bg-[var(--bank-gold)]/10 hover:text-[#0A1628]"
                onClick={() => navigate("/transactions")}
              >
                <span className="md:hidden">See All</span>
                <span className="hidden md:inline">View All</span>
              </Button>
            </div>

            {transactions.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No recent transactions</p>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {transactions.map((transaction) => {
                  const isDeposit = transaction.transaction_type.includes("deposit");

                  return (
                    <div
                      key={transaction.id}
                      className="flex min-h-[56px] items-center justify-between rounded-2xl border-0 bg-white p-3 shadow-sm transition-colors md:rounded-xl md:bg-secondary/50 md:shadow-none md:hover:bg-secondary"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full ${
                            isDeposit ? "bg-green-500/10" : "bg-destructive/10"
                          }`}
                        >
                          {isDeposit ? (
                            <ArrowDownRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#0A1628]">
                            {transaction.description || transaction.transaction_type.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${isDeposit ? "text-green-600" : "text-destructive"}`}>
                          {isDeposit ? "+" : "-"}$
                          {transaction.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] ${
                            transaction.status === "completed"
                              ? "bg-green-500/10 text-green-600"
                              : "bg-yellow-500/10 text-yellow-600"
                          }`}
                        >
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="px-4 pb-4 md:hidden">
          <FinancialHealthWidget />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
