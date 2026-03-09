import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Users, CreditCard, AlertTriangle, CheckCircle } from "lucide-react";

export default function SystemHealth() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAccounts: 0,
    todayTransactions: 0,
    failedTransactions: 0,
    openFraudAlerts: 0,
    pendingKYC: 0,
    pendingLoans: 0,
    openTickets: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const today = new Date().toISOString().split("T")[0];
    const [users, accounts, txToday, txFailed, fraud, kyc, loans, tickets] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("accounts").select("id", { count: "exact", head: true }).not("user_id", "is", null),
      supabase.from("transactions").select("id", { count: "exact", head: true }).gte("created_at", today),
      supabase.from("transactions").select("id", { count: "exact", head: true }).eq("status", "failed"),
      supabase.from("fraud_alerts").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("kyc_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("loans").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]);
    setStats({
      totalUsers: users.count || 0,
      totalAccounts: accounts.count || 0,
      todayTransactions: txToday.count || 0,
      failedTransactions: txFailed.count || 0,
      openFraudAlerts: fraud.count || 0,
      pendingKYC: kyc.count || 0,
      pendingLoans: loans.count || 0,
      openTickets: tickets.count || 0,
    });
    setLoading(false);
  };

  const items = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-primary" },
    { label: "Active Accounts", value: stats.totalAccounts, icon: CreditCard, color: "text-primary" },
    { label: "Today's Transactions", value: stats.todayTransactions, icon: Activity, color: "text-primary" },
    { label: "Failed Transactions", value: stats.failedTransactions, icon: AlertTriangle, color: stats.failedTransactions > 0 ? "text-destructive" : "text-muted-foreground" },
    { label: "Open Fraud Alerts", value: stats.openFraudAlerts, icon: AlertTriangle, color: stats.openFraudAlerts > 0 ? "text-destructive" : "text-muted-foreground" },
    { label: "Pending KYC", value: stats.pendingKYC, icon: CheckCircle, color: stats.pendingKYC > 0 ? "text-accent-foreground" : "text-muted-foreground" },
    { label: "Pending Loans", value: stats.pendingLoans, icon: CheckCircle, color: stats.pendingLoans > 0 ? "text-accent-foreground" : "text-muted-foreground" },
    { label: "Open Tickets", value: stats.openTickets, icon: CheckCircle, color: stats.openTickets > 0 ? "text-accent-foreground" : "text-muted-foreground" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> System Health</CardTitle>
        <CardDescription>Real-time platform metrics</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground animate-pulse">Loading metrics...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {items.map(item => (
              <Card key={item.label}>
                <CardContent className="p-4 text-center">
                  <item.icon className={`h-6 w-6 mx-auto mb-2 ${item.color}`} />
                  <div className="text-2xl font-bold">{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
