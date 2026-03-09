import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Lightbulb, CheckCircle2 } from "lucide-react";

interface Insight {
  text: string;
  type: "up" | "down" | "good" | "neutral";
}

export default function SmartInsightsWidget() {
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    generate();
  }, []);

  const generate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: accounts } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", user.id);

    const accountIds = accounts?.map((a) => a.id) ?? [];
    if (accountIds.length === 0) return;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const { data: thisMonthTxns } = await supabase
      .from("transactions")
      .select("amount, transaction_type")
      .in("account_id", accountIds)
      .eq("status", "completed")
      .gte("created_at", thisMonthStart.toISOString());

    const { data: lastMonthTxns } = await supabase
      .from("transactions")
      .select("amount, transaction_type")
      .in("account_id", accountIds)
      .eq("status", "completed")
      .gte("created_at", lastMonthStart.toISOString())
      .lt("created_at", thisMonthStart.toISOString());

    const sumByKind = (txns: any[], isIncome: boolean) =>
      (txns ?? [])
        .filter((t) => {
          const inc = ["deposit", "cashback", "system"].some((k) => t.transaction_type.includes(k));
          return isIncome ? inc : !inc && !t.transaction_type.includes("fee");
        })
        .reduce((s: number, t: any) => s + t.amount, 0);

    const thisIncome = sumByKind(thisMonthTxns ?? [], true);
    const lastIncome = sumByKind(lastMonthTxns ?? [], true);
    const thisSpend = sumByKind(thisMonthTxns ?? [], false);
    const lastSpend = sumByKind(lastMonthTxns ?? [], false);

    const result: Insight[] = [];

    if (lastIncome > 0 && thisIncome > lastIncome) {
      const pct = Math.round(((thisIncome - lastIncome) / lastIncome) * 100);
      result.push({ text: `Income up ${pct}% this month`, type: "good" });
    }

    if (lastSpend > 0 && thisSpend > lastSpend * 1.1) {
      const pct = Math.round(((thisSpend - lastSpend) / lastSpend) * 100);
      result.push({ text: `Spending up ${pct}% vs last month`, type: "up" });
    } else if (lastSpend > 0 && thisSpend < lastSpend * 0.9) {
      const pct = Math.round(((lastSpend - thisSpend) / lastSpend) * 100);
      result.push({ text: `Spending down ${pct}% — great job!`, type: "good" });
    }

    if (thisIncome > 0) {
      const rate = Math.round(((thisIncome - thisSpend) / thisIncome) * 100);
      if (rate > 0) {
        result.push({ text: `Savings rate: ${rate}%`, type: "good" });
      } else {
        result.push({ text: `You're spending more than you earn this month`, type: "down" });
      }
    }

    if (result.length === 0) {
      result.push({ text: "Keep transacting to unlock insights", type: "neutral" });
    }

    setInsights(result);
  };

  const iconMap = {
    up: <TrendingUp className="h-4 w-4 text-yellow-600" />,
    down: <TrendingDown className="h-4 w-4 text-destructive" />,
    good: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    neutral: <Lightbulb className="h-4 w-4 text-muted-foreground" />,
  };

  if (insights.length === 0) return null;

  return (
    <Card className="card-banking">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-accent" />
          Smart Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {insights.map((insight, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm"
            >
              {iconMap[insight.type]}
              <span>{insight.text}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
