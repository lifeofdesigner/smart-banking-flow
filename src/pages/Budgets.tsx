import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CATEGORIES, getCategoryForType, isIncomeType } from "@/lib/categories";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Save, Plus } from "lucide-react";

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
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Budgets</h1>
          <p className="text-muted-foreground">Set monthly spending limits by category</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BUDGET_CATEGORIES.map((catKey) => {
              const cat = CATEGORIES.find((c) => c.key === catKey)!;
              const budget = budgets.find((b) => b.category === catKey);
              const spent = spending[catKey] ?? 0;
              const limit = budget?.monthly_limit ?? 0;
              const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
              const overBudget = limit > 0 && spent > limit * 0.9;

              return (
                <Card key={catKey} className="card-banking">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span>{cat.icon}</span> {cat.label}
                      {overBudget && <AlertTriangle className="h-4 w-4 text-destructive ml-auto" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {limit > 0 && (
                      <>
                        <Progress value={pct} className={`h-2 ${pct >= 90 ? "[&>div]:bg-destructive" : ""}`} />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>${spent.toLocaleString("en-US", { minimumFractionDigits: 0 })} spent</span>
                          <span>${limit.toLocaleString("en-US", { minimumFractionDigits: 0 })} limit</span>
                        </div>
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
                      <Button size="sm" className="h-9 px-3" onClick={() => saveBudget(catKey)}>
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
