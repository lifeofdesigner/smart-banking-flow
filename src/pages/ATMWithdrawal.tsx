import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banknote, Copy, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Account {
  id: string;
  account_number: string;
  account_type: string;
  available_balance: number;
  currency: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  withdrawal_code: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export default function ATMWithdrawal() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [acctRes, withdrawRes] = await Promise.all([
      supabase.from("accounts").select("id, account_number, account_type, available_balance, currency").eq("user_id", user.id).eq("status", "active"),
      supabase.from("atm_withdrawals" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);

    if (acctRes.data) setAccounts(acctRes.data);
    if (withdrawRes.data) setWithdrawals(withdrawRes.data as any);
    setLoading(false);
  };

  const handleWithdraw = async () => {
    if (!selectedAccount || !amount) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("request_atm_withdrawal", {
        p_account_id: selectedAccount,
        p_amount: parseFloat(amount),
      });
      if (error) throw error;
      const result = data as any;
      setGeneratedCode(result.code);
      toast({ title: "Withdrawal Code Generated", description: `Code: ${result.code} — Valid for ${result.expires_in_minutes} minutes` });
      setAmount("");
      loadData();
    } catch (err: any) {
      toast({ title: "Withdrawal Failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied", description: "Withdrawal code copied to clipboard" });
  };

  const selectedAcct = accounts.find(a => a.id === selectedAccount);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">ATM Withdrawal</h1>
          <p className="text-muted-foreground">Generate a code to withdraw cash at any ATM</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Request Withdrawal
              </CardTitle>
              <CardDescription>Generate a one-time ATM withdrawal code</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Account</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger><SelectValue placeholder="Choose account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.account_type} — ****{a.account_number.slice(-4)} (${a.available_balance.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Amount ($1 — $5,000)</Label>
                <Input
                  type="number"
                  min="1"
                  max="5000"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
                {selectedAcct && (
                  <p className="text-xs text-muted-foreground">Available: ${selectedAcct.available_balance.toFixed(2)}</p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={handleWithdraw}
                disabled={submitting || !selectedAccount || !amount || parseFloat(amount) <= 0}
              >
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : "Generate Withdrawal Code"}
              </Button>
            </CardContent>
          </Card>

          {generatedCode && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                  Your Withdrawal Code
                </CardTitle>
                <CardDescription>Use this code at any ATM within 30 minutes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-4xl font-mono font-bold tracking-[0.5em]">{generatedCode}</span>
                  <Button variant="ghost" size="icon" onClick={() => copyCode(generatedCode)}>
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-center text-sm text-muted-foreground mt-4">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Expires in 30 minutes
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground animate-pulse">Loading...</div>
            ) : withdrawals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No ATM withdrawals yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map(w => (
                    <TableRow key={w.id}>
                      <TableCell className="text-sm">{new Date(w.created_at).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">${w.amount.toFixed(2)}</TableCell>
                      <TableCell className="font-mono">{w.withdrawal_code}</TableCell>
                      <TableCell>
                        <Badge variant={w.status === "used" ? "default" : w.status === "expired" ? "secondary" : "outline"}>
                          {w.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(w.expires_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
