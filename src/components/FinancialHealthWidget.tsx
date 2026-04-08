import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, PiggyBank } from "lucide-react";

interface HealthData {
  totalBalance: number;
  monthlyIncome: number;
  monthlySpending: number;
  savingsRate: number;
  score: number;
}

function getLabel(score: number) {
  if (score >= 80) return { text: "Excellent", color: "text-green-600" };
  if (score >= 60) return { text: "Good", color: "text-primary" };
  if (score >= 40) return { text: "Fair", color: "text-yellow-600" };
  return { text: "Needs Work", color: "text-destructive" };
}

export default function FinancialHealthWidget() {
  const [data, setData] = useState<HealthData | null>(null);

  useEffect(() => {
    loadHealth();
  }, []);

  const loadHealth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: accounts } = await supabase
      .from("accounts")
      .select("id, available_balance")
      .eq("user_id", user.id);

    const totalBalance = accounts?.reduce((s, a) => s + (a.available_balance || 0), 0) ?? 0;

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const accountIds = accounts?.map((a) => a.id) ?? [];
    if (accountIds.length === 0) {
      setData({ totalBalance: 0, monthlyIncome: 0, monthlySpending: 0, savingsRate: 0, score: 50 });
      return;
    }

    const { data: txns } = await supabase
      .from("transactions")
      .select("amount, transaction_type")
      .in("account_id", accountIds)
      .eq("status", "completed")
      .gte("created_at", last30Days.toISOString());

    let monthlyIncome = 0;
    let monthlySpending = 0;

    (txns ?? []).forEach((t) => {
      const type = t.transaction_type;
      if (["deposit", "loan_disbursement", "cashback", "system"].some((k) => type.includes(k))) {
        monthlyIncome += t.amount;
      } else if (!type.includes("fee")) {
        monthlySpending += t.amount;
      }
    });

    const savingsRate = monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlySpending) / monthlyIncome) * 100) : 0;
    const balanceRatio = Math.min(totalBalance / Math.max(monthlySpending, 1), 6);
    const score = Math.round(Math.min(100, Math.max(0, savingsRate * 0.5 + balanceRatio * 8 + 10)));

    setData({ totalBalance, monthlyIncome, monthlySpending, savingsRate, score });
  };

  if (!data) return null;

  const label = getLabel(data.score);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (data.score / 100) * circumference;

  const stats = [
    { label: "Total Balance", value: `$${data.totalBalance.toLocaleString("en-US", { minimumFractionDigits: 0 })}`, icon: DollarSign },
    { label: "Monthly Income", value: `$${data.monthlyIncome.toLocaleString("en-US", { minimumFractionDigits: 0 })}`, icon: TrendingUp },
    { label: "Monthly Spending", value: `$${data.monthlySpending.toLocaleString("en-US", { minimumFractionDigits: 0 })}`, icon: TrendingDown },
    { label: "Savings Rate", value: `${data.savingsRate}%`, icon: PiggyBank },
  ];

  return (
    <Card className="card-banking">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative flex-shrink-0">
            <svg width="100" height="100" className="-rotate-90">
              <circle cx="50" cy="50" r="40" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
              <circle
                cx="50" cy="50" r="40" stroke="hsl(var(--primary))" strokeWidth="8" fill="none"
                strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{data.score}</span>
              <span className={`text-[10px] font-semibold ${label.color}`}>{label.text}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1 w-full">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-secondary">
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  <p className="text-sm font-semibold">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
