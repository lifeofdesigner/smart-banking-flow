import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--muted))"];

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
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">Track your spending patterns and trends</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
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
              <Card>
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
              <Card>
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
              <Card>
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
              <Card>
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
                        <Line type="monotone" dataKey="income" stroke="hsl(142 76% 36%)" strokeWidth={2} name="Income" />
                        <Line type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={2} name="Expenses" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Category Pie Chart */}
              <Card>
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
                </CardContent>
              </Card>
            </div>

            {/* Category Bar Chart */}
            <Card>
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
