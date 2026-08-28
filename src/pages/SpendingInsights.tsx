import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, getCategoryForType, isIncomeType } from "@/lib/categories";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Calendar,
  CreditCard,
  PieChart as PieChartIcon,
  BarChart3,
  Receipt,
  Sparkles,
} from "lucide-react";
import { format, subDays, startOfMonth, startOfYear, parseISO } from "date-fns";

interface RawTransaction {
  id: string;
  account_id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  status: string;
  created_at: string;
  reference_number: string | null;
}

interface AccountItem {
  id: string;
  account_number: string;
  account_type: string;
  currency: string;
}

interface CatSum {
  category: string;
  key: string;
  color: string;
  icon: string;
  amount: number;
  count: number;
}

const CHART_COLORS = [
  "#0A1628",
  "#C9A84C",
  "#3B82F6",
  "#10B981",
  "#EC4899",
  "#8B5CF6",
  "#F59E0B",
  "#06B6D4",
  "#EF4444",
  "#64748B",
];

export default function SpendingInsights() {
  const [transactions, setTransactions] = useState<RawTransaction[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("this_month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: accs } = await supabase
        .from("accounts")
        .select("id, account_number, account_type, currency")
        .eq("user_id", user.id);

      const userAccounts = (accs as AccountItem[]) || [];
      setAccounts(userAccounts);

      const ids = userAccounts.map((a) => a.id);
      if (ids.length === 0) {
        setLoading(false);
        return;
      }

      const { data: txns } = await supabase
        .from("transactions")
        .select("id, account_id, amount, transaction_type, description, status, created_at, reference_number")
        .in("account_id", ids)
        .order("created_at", { ascending: false });

      setTransactions((txns as RawTransaction[]) || []);
    } catch (err) {
      console.error("Failed to load spending insights data", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions based on timeframe and account
  const filteredTransactions = useMemo(() => {
    let list = transactions;

    if (selectedAccountId !== "all") {
      list = list.filter((t) => t.account_id === selectedAccountId);
    }

    const now = new Date();
    if (timeRange === "this_month") {
      const startMonth = startOfMonth(now);
      const monthFiltered = list.filter((t) => new Date(t.created_at) >= startMonth);
      // If no transactions this month, keep all or show message
      return monthFiltered;
    } else if (timeRange === "30_days") {
      const start30 = subDays(now, 30);
      return list.filter((t) => new Date(t.created_at) >= start30);
    } else if (timeRange === "90_days") {
      const start90 = subDays(now, 90);
      return list.filter((t) => new Date(t.created_at) >= start90);
    } else if (timeRange === "this_year") {
      const startYear = startOfYear(now);
      return list.filter((t) => new Date(t.created_at) >= startYear);
    }

    return list; // "all"
  }, [transactions, selectedAccountId, timeRange]);

  // Outgoing / spending transactions only
  const spendingTransactions = useMemo(() => {
    return filteredTransactions.filter(
      (t) => !isIncomeType(t.transaction_type, t.description || "") && t.status !== "failed" && t.status !== "cancelled"
    );
  }, [filteredTransactions]);

  // Incoming transactions
  const incomeTransactions = useMemo(() => {
    return filteredTransactions.filter(
      (t) => isIncomeType(t.transaction_type, t.description || "") && t.status !== "failed" && t.status !== "cancelled"
    );
  }, [filteredTransactions]);

  const totalSpent = useMemo(() => {
    return spendingTransactions.reduce((acc, t) => acc + Math.abs(t.amount || 0), 0);
  }, [spendingTransactions]);

  const totalIncome = useMemo(() => {
    return incomeTransactions.reduce((acc, t) => acc + Math.abs(t.amount || 0), 0);
  }, [incomeTransactions]);

  const netCashFlow = totalIncome - totalSpent;

  // Category aggregation
  const catData: CatSum[] = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();

    spendingTransactions.forEach((t) => {
      const cat = getCategoryForType(t.transaction_type, t.description || "");
      const existing = map.get(cat.key) || { amount: 0, count: 0 };
      map.set(cat.key, {
        amount: existing.amount + Math.abs(t.amount || 0),
        count: existing.count + 1,
      });
    });

    const result: CatSum[] = [];
    map.forEach((val, key) => {
      const cat = CATEGORIES.find((c) => c.key === key) || {
        key,
        label: key.replace(/_/g, " "),
        color: "#94A3B8",
        icon: "📋",
      };
      result.push({
        category: cat.label,
        key: cat.key,
        color: cat.color,
        icon: cat.icon,
        amount: val.amount,
        count: val.count,
      });
    });

    result.sort((a, b) => b.amount - a.amount);
    return result;
  }, [spendingTransactions]);

  // Timeline aggregation (e.g. by date for spending trend)
  const timelineData = useMemo(() => {
    const map = new Map<string, number>();

    // Sort ascending for chart
    const sorted = [...spendingTransactions].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    sorted.forEach((t) => {
      const dateKey = format(parseISO(t.created_at), "MMM d");
      map.set(dateKey, (map.get(dateKey) || 0) + Math.abs(t.amount || 0));
    });

    return Array.from(map.entries()).map(([date, amount]) => ({
      date,
      spending: parseFloat(amount.toFixed(2)),
    }));
  }, [spendingTransactions]);

  const topCategory = catData[0] || null;
  const avgTransaction = spendingTransactions.length > 0 ? totalSpent / spendingTransactions.length : 0;
  const largestExpense = spendingTransactions.reduce(
    (max, t) => (Math.abs(t.amount) > max ? Math.abs(t.amount) : max),
    0
  );

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F4F5F7] px-4 py-6 md:p-8 space-y-6">
        {/* Header and Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0A1628] border-l-4 border-[#C9A84C] pl-3">
              Spending Insights
            </h1>
            <p className="text-sm text-muted-foreground">
              Intelligent breakdown and analytics of your outflow and expenses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Account Filter */}
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="h-10 w-[170px] bg-white">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    •••{acc.account_number.slice(-4)} ({acc.account_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Timeframe Filter */}
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="h-10 w-[150px] bg-white font-medium">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="30_days">Last 30 Days</SelectItem>
                <SelectItem value="90_days">Last 90 Days</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl bg-white" />
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-[340px] rounded-xl bg-white" />
              <Skeleton className="h-[340px] rounded-xl bg-white" />
            </div>
          </div>
        ) : spendingTransactions.length === 0 ? (
          <Card className="bg-white rounded-xl shadow-sm border-0 p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
              <TrendingUp className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#0A1628]">No spending data found in this timeframe</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {timeRange !== "all"
                  ? "There are no debit transactions recorded for this period. Try switching to 'All Time'."
                  : "No completed debit or expense transactions exist on your account yet."}
              </p>
            </div>
            {timeRange !== "all" && (
              <Button onClick={() => setTimeRange("all")} className="bg-[var(--bank-navy)] text-white">
                View All Time Spending
              </Button>
            )}
          </Card>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white rounded-xl shadow-sm border-0 p-5 border-l-4 border-l-[var(--bank-slate)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Spent</span>
                  <div className="p-2 rounded-lg bg-red-50 text-red-600">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#0A1628] mt-2">
                  ${totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {spendingTransactions.length} transaction{spendingTransactions.length > 1 ? "s" : ""}
                </p>
              </Card>

              <Card className="bg-white rounded-xl shadow-sm border-0 p-5 border-l-4 border-l-[var(--bank-gold)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Income</span>
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#0A1628] mt-2">
                  ${totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Inflow & deposits ({incomeTransactions.length})
                </p>
              </Card>

              <Card className="bg-white rounded-xl shadow-sm border-0 p-5 border-l-4 border-l-blue-600">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Net Cash Flow</span>
                  <div className={`p-2 rounded-lg ${netCashFlow >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
                <p className={`text-2xl font-bold mt-2 ${netCashFlow >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                  {netCashFlow >= 0 ? "+" : "-"}${Math.abs(netCashFlow).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {netCashFlow >= 0 ? "Positive cash flow" : "Expenses exceed inflow"}
                </p>
              </Card>

              <Card className="bg-white rounded-xl shadow-sm border-0 p-5 border-l-4 border-l-purple-600">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Largest Expense</span>
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                    <Receipt className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#0A1628] mt-2">
                  ${largestExpense.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: ${avgTransaction.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / txn
                </p>
              </Card>
            </div>

            {/* Top Category Highlight */}
            {topCategory && (
              <Card className="bg-white rounded-xl shadow-sm border-0 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-3xl">
                      {topCategory.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-xs">
                          <Sparkles className="w-3 h-3 mr-1" /> Top Outflow Category
                        </Badge>
                      </div>
                      <h3 className="text-xl font-bold text-[#0A1628] mt-1">{topCategory.category}</h3>
                      <p className="text-xs text-muted-foreground">
                        {topCategory.count} transaction{topCategory.count > 1 ? "s" : ""} accounted for this category
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Amount Spent</p>
                    <p className="text-2xl font-bold text-[#0A1628]">
                      ${topCategory.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs font-semibold text-primary">
                      {totalSpent > 0 ? Math.round((topCategory.amount / totalSpent) * 100) : 0}% of all spending
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown (Donut Pie Chart) */}
              <Card className="bg-white rounded-xl shadow-sm border-0 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-[#0A1628] text-base">Category Distribution</h3>
                    <p className="text-xs text-muted-foreground">Proportion of expenses by category</p>
                  </div>
                  <PieChartIcon className="w-5 h-5 text-muted-foreground" />
                </div>

                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={catData}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {catData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [
                          `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${totalSpent > 0 ? Math.round((Number(value) / totalSpent) * 100) : 0}%)`,
                          "Spent",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-4 border-t border-slate-100">
                  {catData.map((c, i) => (
                    <div key={c.category} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-slate-700 font-medium">{c.category}</span>
                      <span className="text-muted-foreground">
                        ({totalSpent > 0 ? Math.round((c.amount / totalSpent) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Spending by Category (Bar Chart) */}
              <Card className="bg-white rounded-xl shadow-sm border-0 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-[#0A1628] text-base">Spending by Category</h3>
                    <p className="text-xs text-muted-foreground">Direct amount comparison</p>
                  </div>
                  <BarChart3 className="w-5 h-5 text-muted-foreground" />
                </div>

                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={catData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`} />
                      <YAxis type="category" dataKey="category" width={110} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: number) => [
                          `$${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                          "Total Spent",
                        ]}
                      />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                        {catData.map((_, i) => (
                          <Cell
                            key={`bar-${i}`}
                            fill={i % 2 === 0 ? "var(--bank-slate)" : "var(--bank-gold)"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Categories tracked: {catData.length}</span>
                  <span>Top category: {topCategory?.category || "N/A"}</span>
                </div>
              </Card>
            </div>

            {/* Timeline Spending Trend (if timeline data exists) */}
            {timelineData.length > 1 && (
              <Card className="bg-white rounded-xl shadow-sm border-0 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-[#0A1628] text-base">Daily Spending Trend</h3>
                    <p className="text-xs text-muted-foreground">Outflow volume over time</p>
                  </div>
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                </div>

                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="spendingGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#C9A84C" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(val: number) => [`$${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Spent"]} />
                      <Area type="monotone" dataKey="spending" stroke="#C9A84C" strokeWidth={2} fillOpacity={1} fill="url(#spendingGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Detailed Category Progress List */}
            <Card className="bg-white rounded-xl shadow-sm border-0 p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base text-[#0A1628]">Category Breakdown</CardTitle>
                <CardDescription>Detailed expenditure by category</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0 space-y-5">
                {catData.map((c) => {
                  const pct = totalSpent > 0 ? Math.round((c.amount / totalSpent) * 100) : 0;
                  return (
                    <div key={c.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{c.icon}</span>
                          <span className="font-semibold text-[#0A1628]">{c.category}</span>
                          <span className="text-xs text-muted-foreground">({c.count} txns)</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#0A1628]">
                            ${c.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">({pct}%)</span>
                        </div>
                      </div>
                      <Progress value={pct} className="h-2.5 [&>div]:bg-[var(--bank-gold)]" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Recent Spending Ledger */}
            <Card className="bg-white rounded-xl shadow-sm border-0 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[#0A1628] text-base">Recent Spending Activity</h3>
                  <p className="text-xs text-muted-foreground">Individual debit records analyzed in this report</p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {spendingTransactions.slice(0, 10).map((t) => {
                  const cat = getCategoryForType(t.transaction_type, t.description || "");
                  return (
                    <div key={t.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg flex-shrink-0">
                          {cat.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-[#0A1628] truncate">
                            {t.description || `${t.transaction_type.replace(/_/g, " ").toUpperCase()}`}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{format(parseISO(t.created_at), "MMM d, yyyy • h:mm a")}</span>
                            <span>&bull;</span>
                            <span className="inline-flex items-center font-medium text-slate-700">{cat.label}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-sm text-red-600">
                          -${Math.abs(t.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <p className="text-[11px] text-muted-foreground capitalize">{t.status}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
