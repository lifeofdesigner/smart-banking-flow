import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, ArrowUpRight, ArrowDownRight, Eye } from "lucide-react";
import { format } from "date-fns";

interface Account {
  id: string;
  account_number: string;
  account_type: string;
  available_balance: number;
  ledger_balance: number;
  currency: string;
  status: string;
  created_at: string;
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setAccounts(data);
    setLoading(false);
  };

  const loadAccountTransactions = async (accountId: string) => {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) setTransactions(data);
  };

  const handleViewAccount = async (account: Account) => {
    setSelectedAccount(account);
    await loadAccountTransactions(account.id);
    setSheetOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "suspended": return "destructive";
      case "closed": return "secondary";
      default: return "outline";
    }
  };

  const getAccountTypeIcon = (type: string) => {
    return <CreditCard className="h-8 w-8 text-primary" />;
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Accounts</h1>
          <p className="text-muted-foreground">Manage and view your bank accounts</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : accounts.length === 0 ? (
          <Card className="p-12 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No accounts found</h3>
            <p className="text-muted-foreground">Contact support to open a new account.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <Card
                key={account.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => handleViewAccount(account)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    {getAccountTypeIcon(account.account_type)}
                    <div>
                      <CardTitle className="text-lg capitalize">
                        {account.account_type} Account
                      </CardTitle>
                      <p className="text-sm text-muted-foreground font-mono">
                        {account.account_number}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(account.status)}>{account.status}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Available Balance</p>
                      <p className="text-3xl font-bold">
                        {account.currency} {account.available_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="text-muted-foreground">Ledger Balance</p>
                        <p className="font-medium">
                          {account.currency} {account.ledger_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Currency</p>
                        <p className="font-medium">{account.currency}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="capitalize">
                {selectedAccount?.account_type} Account Details
              </SheetTitle>
              <SheetDescription>
                Account #{selectedAccount?.account_number}
              </SheetDescription>
            </SheetHeader>

            {selectedAccount && (
              <div className="mt-6 space-y-6">
                <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                  <CardContent className="pt-6">
                    <p className="text-sm opacity-80">Available Balance</p>
                    <p className="text-4xl font-bold mt-1">
                      {selectedAccount.currency} {selectedAccount.available_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    <div className="mt-4 flex justify-between text-sm opacity-80">
                      <span>Ledger: {selectedAccount.currency} {selectedAccount.ledger_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      <Badge variant="secondary">{selectedAccount.status}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <div>
                  <h4 className="font-semibold mb-3">Account Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Account Number</span>
                      <span className="font-mono">{selectedAccount.account_number}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Account Type</span>
                      <span className="capitalize">{selectedAccount.account_type}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Currency</span>
                      <span>{selectedAccount.currency}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Opened On</span>
                      <span>{format(new Date(selectedAccount.created_at), "MMM dd, yyyy")}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Recent Transactions</h4>
                  {transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent transactions
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${
                              tx.transaction_type.includes("deposit") ? "bg-green-500/10" : "bg-red-500/10"
                            }`}>
                              {tx.transaction_type.includes("deposit") ? (
                                <ArrowDownRight className="h-4 w-4 text-green-600" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium capitalize">
                                {tx.transaction_type.replace(/_/g, " ")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(tx.created_at), "MMM dd, HH:mm")}
                              </p>
                            </div>
                          </div>
                          <span className={`font-semibold ${
                            tx.transaction_type.includes("deposit") ? "text-green-600" : "text-red-600"
                          }`}>
                            {tx.transaction_type.includes("deposit") ? "+" : "-"}
                            ${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
}
