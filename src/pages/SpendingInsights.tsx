import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES, getCategoryForType, isIncomeType } from "@/lib/categories";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingUp } from "lucide-react";

interface CatSum {
  category: string;
  color: string;
  amount: number;
}

const CHART_COLORS = ["var(--bank-slate)", "var(--bank-gold)", "#7B8BAE", "#D8BD70", "#2E3C5E", "#A0AEC0"];

export default function SpendingInsights() {
  const [catData, setCatData] = useState<CatSum[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: accounts } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", user.id);

    const ids = accounts?.map((a) => a.id) ?? [];
    if (ids.length === 0) { setLoading(false); return; }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: txns } = await supabase
      .from("transactions")
      .select("amount, transaction_type")
      .in("account_id", ids)
      .eq("status", "completed")
      .gte("created_at", startOfMonth.toISOString());

    const map = new Map<string, number>();
    (txns ?? []).forEach((t) => {
      if (isIncomeType(t.transaction_type)) return;
      const cat = getCategoryForType(t.transaction_type);
      map.set(cat.key, (map.get(cat.key) ?? 0) + t.amount);
    });

    const result: CatSum[] = [];
    map.forEach((amount, key) => {
      const cat = CATEGORIES.find((c) => c.key === key)!;
      result.push({ category: cat.label, color: cat.color, amount });
    });
    result.sort((a, b) => b.amount - a.amount);

    setCatData(result);
    setLoading(false);
  };

  const totalSpend = catData.reduce((s, c) => s + c.amount, 0);
  const top = catData[0];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F4F5F7] p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#0A1628] border-l-4 border-[#C9A84C] pl-3">Spending Insights</h1>
          <p className="text-muted-foreground">Understand where your money goes this month</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-[320px] w-full" />
              <Skeleton className="h-[320px] w-full" />
            </div>
          </div>
        ) : catData.length === 0 ? (
          <Card className="bg-white rounded-xl shadow-sm border-0 p-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-[var(--bank-slate)] mb-3" />
            <p className="text-lg font-semibold text-[#0A1628]">No spending data available</p>
            <p className="text-muted-foreground">Complete some transactions to see your spending breakdown.</p>
          </Card>
        ) : (
          <>
            {top && (
              <Card className="bg-white rounded-xl shadow-sm border-0 border-l-4 border-l-[var(--bank-gold)]">
                <CardContent className="pt-6 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <span className="text-2xl">{CATEGORIES.find((c) => c.label === top.category)?.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Largest Category</p>
                    <p className="text-lg font-bold">{top.category}</p>
                    <p className="text-sm font-semibold text-primary">
                      ${top.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ({Math.round((top.amount / totalSpend) * 100)}%)
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-white rounded-xl shadow-sm border-0">
              <CardHeader>
                <CardTitle className="text-base">Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {catData.map((c) => {
                  const pct = totalSpend > 0 ? Math.round((c.amount / totalSpend) * 100) : 0;
                  return (
                    <div key={c.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-[#0A1628]">{c.category}</span>
                        <span className="text-muted-foreground">${c.amount.toLocaleString()}</span>
                      </div>
                      <Progress value={pct} className="h-2 [&>div]:bg-[var(--bank-gold)]" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white rounded-xl shadow-sm border-0">
                <CardHeader><CardTitle className="text-base">Category Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={catData} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                          {catData.map((c, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {catData.map((c) => (
                      <div key={c.category} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[catData.findIndex((x) => x.category === c.category) % CHART_COLORS.length] }} />
                        {c.category}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white rounded-xl shadow-sm border-0">
                <CardHeader><CardTitle className="text-base">Spending by Category</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={catData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                        <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
                        <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                          {catData.map((c, i) => (
                            <Cell key={i} fill={i % 2 === 0 ? "var(--bank-slate)" : "var(--bank-gold)"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
