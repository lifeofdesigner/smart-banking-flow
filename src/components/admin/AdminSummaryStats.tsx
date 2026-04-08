import { Users, CreditCard, Send, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AdminSummaryStatsProps {
  usersCount: number;
  accountsCount: number;
  wireTransfersCount: number;
  transactionsCount: number;
}

export default function AdminSummaryStats({
  usersCount,
  accountsCount,
  wireTransfersCount,
  transactionsCount,
}: AdminSummaryStatsProps) {
  const metrics = [
    { label: "Total Users", value: usersCount, icon: Users, trend: "↑ 3.2%", trendUp: true },
    { label: "Total Accounts", value: accountsCount, icon: CreditCard, trend: "↑ 2.1%", trendUp: true },
    { label: "Wire Transfers", value: wireTransfersCount, icon: Send, trend: "↓ 0.8%", trendUp: false },
    { label: "Transactions", value: transactionsCount, icon: DollarSign, trend: "↑ 4.6%", trendUp: true },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <Card
            key={metric.label}
            className="admin-premium-card border-l-4 rounded-lg border-l-[var(--bank-gold)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium tracking-wide uppercase text-[var(--bank-muted)]">{metric.label}</p>
                  <div className="mt-2 flex items-end gap-2">
                    <span
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "2rem",
                        fontWeight: "700",
                        color: "var(--bank-navy)",
                        lineHeight: 1,
                      }}
                    >
                      {metric.value}
                    </span>
                    <span
                      className={`text-xs font-medium mb-0.5 ${
                        metric.trendUp ? "text-emerald-700" : "text-amber-700"
                      }`}
                    >
                      {metric.trend}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    background: "var(--bank-navy)",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={18} color="var(--bank-gold)" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
