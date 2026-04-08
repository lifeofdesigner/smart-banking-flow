import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight } from "lucide-react";
import { format, startOfMonth, subMonths } from "date-fns";

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  created_at: string;
}

interface CategoryData {
  name: string;
  amount: number;
  count: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

const COLORS = ["var(--bank-slate)", "var(--bank-gold)", "#7B8BAE", "#D8BD70", "#2E3C5E", "#A0AEC0"];

export default function Analytics() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("6");

  useEffect(() => {
    loadTransactions();
  }, [period]);

  const loadTransactions = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: accounts } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", user.id);

    if (accounts && accounts.length > 0) {
      const accountIds = accounts.map(a => a.id);
      const startDate = subMonths(new Date(), parseInt(period));

      const { data } = await supabase
        .from("transactions")
        .select("id, transaction_type, amount, created_at")
        .in("account_id", accountIds)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (data) setTransactions(data);
    }
    setLoading(false);
  };

  // Calculate category breakdown
  const categoryData: CategoryData[] = transactions.reduce((acc: CategoryData[], tx) => {
    const existing = acc.find(c => c.name === tx.transaction_type);
    if (existing) {
      existing.amount += tx.amount;
      existing.count += 1;
    } else {
      acc.push({ name: tx.transaction_type, amount: tx.amount, count: 1 });
    }
    return acc;
  }, []).map(c => ({
    ...c,
    name: c.name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
  })).sort((a, b) => b.amount - a.amount);

  // Calculate monthly trends
  const monthlyData: MonthlyData[] = [];
  for (let i = parseInt(period) - 1; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(new Date(), i));
    const monthEnd = startOfMonth(subMonths(new Date(), i - 1));
    const monthLabel = format(monthStart, "MMM yyyy");

    const monthTxs = transactions.filter(tx => {
      const txDate = new Date(tx.created_at);
      return txDate >= monthStart && txDate < monthEnd;
    });

    const income = monthTxs
      .filter(tx => tx.transaction_type.includes("deposit") || tx.transaction_type === "loan_disbursement")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const expenses = monthTxs
      .filter(tx => !tx.transaction_type.includes("deposit") && tx.transaction_type !== "loan_disbursement")
      .reduce((sum, tx) => sum + tx.amount, 0);

    monthlyData.push({ month: monthLabel, income, expenses });
  }

  // Summary stats
  const totalIncome = transactions
    .filter(tx => tx.transaction_type.includes("deposit") || tx.transaction_type === "loan_disbursement")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpenses = transactions
    .filter(tx => !tx.transaction_type.includes("deposit") && tx.transaction_type !== "loan_disbursement")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netFlow = totalIncome - totalExpenses;
  const avgMonthlySpending = totalExpenses / parseInt(period);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F4F5F7] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#0A1628] border-l-4 border-[#C9A84C] pl-3">Analytics</h1>
            <p className="text-muted-foreground">Track your spending patterns and trends</p>
          </div>
          <div className="inline-flex rounded-full bg-white shadow-sm p-1 border border-[#E6EAF0]">
            {[
              { value: "3", label: "3M" },
              { value: "6", label: "6M" },
              { value: "12", label: "12M" },
            ].map((p) => (
              <Button
                key={p.value}
                type="button"
                size="sm"
                variant="ghost"
                className={period === p.value ? "rounded-full bg-[var(--bank-navy)] text-white hover:bg-[var(--bank-slate)]" : "rounded-full text-muted-foreground"}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <Skeleton className="h-[320px] w-full" />
              <Skeleton className="h-[320px] w-full" />
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-white rounded-xl shadow-sm border-0 border-l-4 border-l-[var(--bank-gold)]">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-500/10">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Income</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white rounded-xl shadow-sm border-0 border-l-4 border-l-[var(--bank-gold)]">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-red-500/10">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-600">
                        ${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white rounded-xl shadow-sm border-0 border-l-4 border-l-[var(--bank-gold)]">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${netFlow >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                      <DollarSign className={`h-5 w-5 ${netFlow >= 0 ? "text-green-600" : "text-red-600"}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Net Flow</p>
                      <p className={`text-2xl font-bold ${netFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {netFlow >= 0 ? "+" : ""}${netFlow.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white rounded-xl shadow-sm border-0 border-l-4 border-l-[var(--bank-gold)]">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <ArrowUpRight className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Monthly</p>
                      <p className="text-2xl font-bold">
                        ${avgMonthlySpending.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Monthly Trends */}
              <Card className="bg-white rounded-xl shadow-sm border-0">
                <CardHeader>
                  <CardTitle>Monthly Overview</CardTitle>
                  <CardDescription>Income vs Expenses over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                          formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="income" stroke="var(--bank-slate)" strokeWidth={2} name="Income" />
                        <Line type="monotone" dataKey="expenses" stroke="var(--bank-gold)" strokeWidth={2} name="Expenses" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Category Pie Chart */}
              <Card className="bg-white rounded-xl shadow-sm border-0">
                <CardHeader>
                  <CardTitle>Spending by Category</CardTitle>
                  <CardDescription>Distribution of your transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {categoryData.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No transaction data available
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="amount"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {categoryData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px"
                            }}
                            formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="mt-4 space-y-2">
                    {categoryData.slice(0, 5).map((c, idx) => (
                      <div key={c.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span>{c.name}</span>
                        </div>
                        <span className="font-semibold">${c.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Bar Chart */}
            <Card className="bg-white rounded-xl shadow-sm border-0">
              <CardHeader>
                <CardTitle>Transaction Categories</CardTitle>
                <CardDescription>Total amount by transaction type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {categoryData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No transaction data available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData} layout="vertical" margin={{ left: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${v}`} />
                        <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))" }} width={100} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                          formatter={(value: number, name: string, props: any) => [
                            `$${value.toLocaleString()} (${props.payload.count} transactions)`,
                            ""
                          ]}
                        />
                        <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
