import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Landmark, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const SYSTEM_ACCOUNTS = [
  { number: "9990000001", label: "Loan Disbursement" },
  { number: "9990000002", label: "Loan Collection" },
  { number: "9990000003", label: "Revenue / Fees" },
  { number: "9990000004", label: "Rewards Pool" },
  { number: "9990000005", label: "Investment Pool" },
  { number: "9990000006", label: "Savings Vault" },
];

export default function LiquidityMonitor() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("accounts")
      .select("id, account_number, account_type, available_balance, ledger_balance, status")
      .in("account_number", SYSTEM_ACCOUNTS.map(a => a.number));

    if (data) {
      const enriched = data.map(acc => ({
        ...acc,
        label: SYSTEM_ACCOUNTS.find(s => s.number === acc.account_number)?.label || acc.account_type,
      }));
      setAccounts(enriched);
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5" /> Liquidity Monitor</CardTitle>
            <CardDescription>System account balances</CardDescription>
          </div>
          <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground animate-pulse">Loading...</div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No system accounts found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Available Balance</TableHead>
                <TableHead>Ledger Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.label}</TableCell>
                  <TableCell className="font-mono">{a.account_number}</TableCell>
                  <TableCell>${Number(a.available_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>${Number(a.ledger_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <Badge variant={a.status === "active" ? "default" : "destructive"}>{a.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
