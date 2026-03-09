import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Send,
  Globe,
  Shield,
  Banknote,
  PiggyBank,
  BarChart3,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
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
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileData) setProfile(profileData);

      const { data: accountsData } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id);

      if (accountsData) {
        setAccounts(accountsData.map((a) => ({
          ...a,
          computed_balance: a.available_balance ?? a.balance ?? 0,
        })));

        if (accountsData.length > 0) {
          const { data: txData } = await supabase
            .from("transactions")
            .select("*")
            .eq("account_id", accountsData[0].id)
            .order("created_at", { ascending: false })
            .limit(5);
          if (txData) setTransactions(txData);
        }
      }
    } catch (error: any) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Welcome back, {profile?.full_name}!</h2>
          <p className="text-muted-foreground">Here's your financial overview</p>
        </div>

        {/* Account Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {accounts.map((account) => (
            <Card
              key={account.id}
              className="p-6 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate("/accounts")}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm opacity-90 mb-1">{account.account_type.toUpperCase()} ACCOUNT</p>
                  <p className="text-xs opacity-75 font-mono">{account.account_number}</p>
                </div>
                <CreditCard className="w-8 h-8 opacity-80" />
              </div>
              <div className="mt-8">
                <p className="text-sm opacity-90 mb-1">Available Balance</p>
                <p className="text-4xl font-bold">
                  {account.currency} {account.computed_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </Card>
          ))}
          {accounts.length === 0 && (
            <Card className="p-6 flex items-center justify-center text-muted-foreground col-span-full">
              <p>No accounts found. Contact support to get started.</p>
            </Card>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="p-6 lg:col-span-1">
            <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
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
                  className="w-full justify-start h-12"
                  onClick={() => navigate(path)}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {label}
                </Button>
              ))}
            </div>
          </Card>

          {/* Recent Transactions */}
          <Card className="p-6 lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Recent Transactions</h3>
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
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.transaction_type.includes("deposit")
                          ? "bg-green-500/10"
                          : "bg-red-500/10"
                      }`}>
                        {transaction.transaction_type.includes("deposit") ? (
                          <ArrowDownRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium capitalize">
                          {transaction.transaction_type.replace(/_/g, " ")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        transaction.transaction_type.includes("deposit")
                          ? "text-green-600"
                          : "text-red-600"
                      }`}>
                        {transaction.transaction_type.includes("deposit") ? "+" : "-"}
                        ${transaction.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
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
