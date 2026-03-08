import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard, 
  Send, 
  Globe,
  LogOut,
  User,
  Settings
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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    await loadDashboardData(session.user.id);
  };

  const loadDashboardData = async (userId: string) => {
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Check admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      setIsAdmin(roles?.some(r => r.role === "admin") || false);

      // Load accounts with computed balances
      const { data: accountsData } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", userId);

      if (accountsData) {
        // Fetch computed balance for each account via RPC
        const accountsWithBalances = await Promise.all(
          accountsData.map(async (account) => {
            const { data: balance } = await supabase.rpc("get_account_balance", {
              p_account_id: account.id,
            });
            return { ...account, computed_balance: balance ?? account.balance ?? 0 };
          })
        );
        setAccounts(accountsWithBalances);
      }

      // Load recent transactions
      if (accountsData && accountsData.length > 0) {
        const { data: transactionsData } = await supabase
          .from("transactions")
          .select("*")
          .eq("account_id", accountsData[0].id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (transactionsData) {
          setTransactions(transactionsData);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/20">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">M</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">MicroFinance Bank</h1>
                <p className="text-sm text-muted-foreground">Internet Banking</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="text-right hidden md:block mr-4">
                <p className="font-medium">{profile?.full_name}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
              {isAdmin && (
                <Button variant="outline" onClick={() => navigate("/admin")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={() => navigate("/profile")}>
                <User className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {profile?.full_name}!</h2>
          <p className="text-muted-foreground">Here's your account overview</p>
        </div>

        {/* Account Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {accounts.map((account) => (
            <Card key={account.id} className="p-6 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm opacity-90 mb-1">{account.account_type.toUpperCase()} ACCOUNT</p>
                  <p className="text-xs opacity-75">{account.account_number}</p>
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
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="p-6 lg:col-span-1">
            <h3 className="text-xl font-bold mb-6">Quick Actions</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start h-14" size="lg" onClick={() => navigate("/transfer")}>
                <Send className="w-5 h-5 mr-3" />
                Transfer Funds
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start h-14" 
                size="lg"
                onClick={() => navigate("/wire-transfer")}
              >
                <Globe className="w-5 h-5 mr-3" />
                Wire Transfer
              </Button>
              <Button variant="outline" className="w-full justify-start h-14" size="lg">
                <CreditCard className="w-5 h-5 mr-3" />
                Pay Bills
              </Button>
              <Button variant="outline" className="w-full justify-start h-14" size="lg">
                <User className="w-5 h-5 mr-3" />
                Manage Profile
              </Button>
            </div>
          </Card>

          {/* Recent Transactions */}
          <Card className="p-6 lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Recent Transactions</h3>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No recent transactions</p>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.transaction_type.includes("deposit") || transaction.transaction_type.includes("transfer")
                          ? "bg-green-500/10"
                          : "bg-red-500/10"
                      }`}>
                        {transaction.transaction_type.includes("deposit") || transaction.transaction_type.includes("transfer") ? (
                          <ArrowDownRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{transaction.transaction_type.replace("_", " ")}</p>
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
    </div>
  );
};

export default Dashboard;
