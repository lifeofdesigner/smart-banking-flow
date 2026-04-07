import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import FinancialHealthWidget from "@/components/FinancialHealthWidget";
import SmartInsightsWidget from "@/components/SmartInsightsWidget";
import AccountCard from "@/components/AccountCard";
import {
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Globe,
  Shield,
  Banknote,
  PiggyBank,
  BarChart3,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";

interface Account {
  id: string;
  account_number: string;
  account_type: string;
  balance: number;
  computed_balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

interface Profile {
  full_name: string;
  email: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast: uiToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileError) { toast.error(profileError.message); return; }
      if (profileData) setProfile(profileData);

      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id);
      if (accountsError) { toast.error(accountsError.message); return; }

      if (accountsData) {
        setAccounts(accountsData.map((a) => ({
          ...a,
          computed_balance: a.available_balance ?? a.balance ?? 0,
        })));

        if (accountsData.length > 0) {
          const { data: txData, error: txError } = await supabase
            .from("transactions")
            .select("*")
            .eq("account_id", accountsData[0].id)
            .order("created_at", { ascending: false })
            .limit(5);
          if (txError) { toast.error(txError.message); return; }
          if (txData) setTransactions(txData);
        }
      }
    } catch (error: any) {
      uiToast({ title: "Error loading data", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Welcome back, {profile?.full_name}!</h2>
          <p className="text-muted-foreground">Here's your financial overview</p>
        </div>

        {/* Financial Health */}
        <FinancialHealthWidget />

        {/* Smart Insights */}
        <SmartInsightsWidget />

        {/* Account Cards */}
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible">
          {accounts.map((account) => (
            <div key={account.id} className="snap-center flex-shrink-0 w-[85vw] md:w-auto">
              <AccountCard
                accountType={account.account_type}
                accountNumber={account.account_number}
                balance={account.computed_balance}
                currency={account.currency || "USD"}
                status="active"
                onClick={() => navigate("/accounts")}
              />
            </div>
          ))}
          {accounts.length === 0 && (
            <Card className="card-banking p-6 flex items-center justify-center text-muted-foreground col-span-full">
              <p>No accounts found. Contact support to get started.</p>
            </Card>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="card-banking p-6 lg:col-span-1">
            <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: "Transfer Funds", icon: Send, path: "/transfer" },
                { label: "Wire Transfer", icon: Globe, path: "/wire-transfer" },
                { label: "Savings Goals", icon: PiggyBank, path: "/savings-goals" },
                { label: "Loans", icon: Banknote, path: "/loans" },
                { label: "Analytics", icon: BarChart3, path: "/analytics" },
                { label: "Statements", icon: FileText, path: "/statements" },
                { label: "KYC Verification", icon: Shield, path: "/kyc" },
              ].map(({ label, icon: Icon, path }) => (
                <Button
                  key={path}
                  variant="outline"
                  className="w-full justify-start h-11 rounded-xl"
                  onClick={() => navigate(path)}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {label}
                </Button>
              ))}
            </div>
          </Card>

          {/* Recent Transactions */}
          <Card className="card-banking p-6 lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Recent Transactions</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate("/transactions")}>
                View All
              </Button>
            </div>

            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No recent transactions</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        transaction.transaction_type.includes("deposit")
                          ? "bg-green-500/10"
                          : "bg-destructive/10"
                      }`}>
                        {transaction.transaction_type.includes("deposit") ? (
                          <ArrowDownRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {transaction.transaction_type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${
                        transaction.transaction_type.includes("deposit")
                          ? "text-green-600"
                          : "text-destructive"
                      }`}>
                        {transaction.transaction_type.includes("deposit") ? "+" : "-"}
                        ${transaction.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        transaction.status === "completed"
                          ? "bg-green-500/10 text-green-600"
                          : "bg-yellow-500/10 text-yellow-600"
                      }`}>
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
