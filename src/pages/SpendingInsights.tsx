import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORIES, getCategoryForType, isIncomeType } from "@/lib/categories";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface CatSum {
  category: string;
  color: string;
  amount: number;
}

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
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Spending Insights</h1>
          <p className="text-muted-foreground">Understand where your money goes this month</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : catData.length === 0 ? (
          <Card className="card-banking p-12 text-center">
            <p className="text-muted-foreground">No spending data this month yet.</p>
          </Card>
        ) : (
          <>
            {top && (
              <Card className="card-banking bg-gradient-to-r from-primary/5 to-accent/5">
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

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="card-banking">
                <CardHeader><CardTitle className="text-base">Category Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={catData} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                          {catData.map((c, i) => (
                            <Cell key={i} fill={c.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {catData.map((c) => (
                      <div key={c.category} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.category}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="card-banking">
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
                            <Cell key={i} fill={c.color} />
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
