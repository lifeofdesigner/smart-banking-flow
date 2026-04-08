import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES, getCategoryForType, isIncomeType } from "@/lib/categories";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Save } from "lucide-react";

interface Budget {
  id: string;
  category: string;
  monthly_limit: number;
}

interface Spending {
  [category: string]: number;
}

const BUDGET_CATEGORIES = ["transfer", "wire_transfer", "withdrawal", "loan_repayment", "fee"];

export default function BudgetsPage() {
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [spending, setSpending] = useState<Spending>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: budgetData }, { data: accounts }] = await Promise.all([
      supabase.from("budgets").select("*").eq("user_id", user.id),
      supabase.from("accounts").select("id").eq("user_id", user.id),
    ]);

    if (budgetData) {
      setBudgets(budgetData);
      const ev: Record<string, string> = {};
      budgetData.forEach((b) => (ev[b.category] = b.monthly_limit.toString()));
      setEditValues(ev);
    }

    const ids = accounts?.map((a) => a.id) ?? [];
    if (ids.length > 0) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: txns } = await supabase
        .from("transactions")
        .select("amount, transaction_type")
        .in("account_id", ids)
        .eq("status", "completed")
        .gte("created_at", startOfMonth.toISOString());

      const sp: Spending = {};
      (txns ?? []).forEach((t) => {
        if (isIncomeType(t.transaction_type)) return;
        const cat = getCategoryForType(t.transaction_type);
        sp[cat.key] = (sp[cat.key] ?? 0) + t.amount;
      });
      setSpending(sp);
    }

    setLoading(false);
  };

  const saveBudget = async (category: string) => {
    const limit = parseFloat(editValues[category] || "0");
    if (limit <= 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existing = budgets.find((b) => b.category === category);

    if (existing) {
      await supabase.from("budgets").update({ monthly_limit: limit }).eq("id", existing.id);
    } else {
      await supabase.from("budgets").insert({ user_id: user.id, category, monthly_limit: limit });
    }

    toast({ title: "Budget saved" });
    loadData();
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F4F5F7] p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#0A1628] border-l-4 border-[#C9A84C] pl-3">Budgets</h1>
          <p className="text-muted-foreground">Set monthly spending limits by category</p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Card key={idx} className="bg-white rounded-xl shadow-sm border-0 p-5 space-y-3">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-9 w-full" />
              </Card>
            ))}
          </div>
        ) : (
          <>
            {BUDGET_CATEGORIES.every((catKey) => {
              const budget = budgets.find((b) => b.category === catKey);
              const limit = budget?.monthly_limit ?? 0;
              return limit <= 0;
            }) && (
              <Card className="bg-white rounded-xl shadow-sm border-0 p-4">
                <p className="text-sm text-muted-foreground">Set your monthly budget limits to track spending</p>
              </Card>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BUDGET_CATEGORIES.map((catKey) => {
                const cat = CATEGORIES.find((c) => c.key === catKey)!;
                const budget = budgets.find((b) => b.category === catKey);
                const spent = spending[catKey] ?? 0;
                const limit = budget?.monthly_limit ?? 0;
                const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
                const overBudget = limit > 0 && spent > limit * 0.9;

                return (
                  <Card key={catKey} className="bg-white rounded-xl shadow-sm border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2 font-semibold text-[var(--bank-navy)]">
                        <span>{cat.icon}</span> {cat.label}
                        {overBudget && <AlertTriangle className="h-4 w-4 text-destructive ml-auto" />}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {limit > 0 && (
                        <>
                          <Progress value={pct} className={`h-2 ${pct >= 90 ? "[&>div]:bg-red-600" : "[&>div]:bg-[var(--bank-gold)]"}`} />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>${spent.toLocaleString("en-US", { minimumFractionDigits: 0 })} spent</span>
                            <span>${limit.toLocaleString("en-US", { minimumFractionDigits: 0 })} limit</span>
                          </div>
                          {pct >= 90 ? (
                            <Badge className="rounded-full bg-red-100 text-red-700 border border-red-200">Over budget</Badge>
                          ) : (
                            <Badge className="rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Under budget</Badge>
                          )}
                        </>
                      )}
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Monthly limit"
                          value={editValues[catKey] ?? ""}
                          onChange={(e) => setEditValues((v) => ({ ...v, [catKey]: e.target.value }))}
                          className="h-9 text-sm"
                        />
                        <Button size="sm" className="h-9 px-3 bg-[var(--bank-navy)] hover:bg-[var(--bank-slate)]" onClick={() => saveBudget(catKey)}>
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
