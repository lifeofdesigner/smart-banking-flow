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

  const scoreColor = data.score > 70 ? "#10B981" : data.score >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <Card className="card-banking rounded-2xl border-0 shadow-sm">
      <CardContent className="p-4 md:pt-6">
        <div className="flex items-start gap-4 md:flex-col md:items-center md:gap-6 lg:flex-row lg:items-center">
          <div className="relative flex-shrink-0">
            <svg width="88" height="88" className="-rotate-90 md:h-[100px] md:w-[100px]">
              <circle cx="44" cy="44" r="34" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" className="md:hidden" />
              <circle
                cx="44"
                cy="44"
                r="34"
                stroke={scoreColor}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={(2 * Math.PI * 34) - (data.score / 100) * (2 * Math.PI * 34)}
                className="transition-all duration-1000 md:hidden"
              />
              <circle cx="50" cy="50" r="40" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" className="hidden md:block" />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke={scoreColor}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="hidden transition-all duration-1000 md:block"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-[#0A1628] md:text-2xl">{data.score}</span>
              <span className={`text-[10px] font-semibold ${label.color}`}>{label.text}</span>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-3 md:w-full md:gap-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-[#F8FAFC] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <div className="rounded-xl bg-white p-2 shadow-sm">
                    <s.icon className="h-4 w-4 text-[#0A1628]" />
                  </div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#6B7280]">{s.label}</p>
                </div>
                <p className="text-sm font-semibold text-[#0A1628]">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
