import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Wallet, Search, Loader2 } from "lucide-react";

interface ATMWithdrawal {
  id: string;
  amount: number;
  withdrawal_code: string;
  status: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  user_id: string;
  profiles?: { full_name: string; email: string };
}

export default function ATMWithdrawalsManager() {
  const [withdrawals, setWithdrawals] = useState<ATMWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    const { data, error } = await supabase
      .from("atm_withdrawals")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      toast.error("Failed to load ATM withdrawals");
    } else {
      setWithdrawals(data || []);
    }
    setLoading(false);
  };

  const markUsed = async (id: string) => {
    const { error } = await supabase
      .from("atm_withdrawals")
      .update({ status: "used", used_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success("Marked as used");
      loadWithdrawals();
    }
  };

  const cancelWithdrawal = async (id: string) => {
    const { error } = await supabase
      .from("atm_withdrawals")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (error) {
      toast.error("Failed to cancel");
    } else {
      toast.success("Withdrawal cancelled");
      loadWithdrawals();
    }
  };

  const filtered = withdrawals.filter(w =>
    w.withdrawal_code.includes(search) ||
    w.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    w.profiles?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          ATM Withdrawals
        </CardTitle>
        <CardDescription>Monitor cardless ATM withdrawal requests</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, name, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((w) => (
              <TableRow key={w.id}>
                <TableCell>{new Date(w.created_at).toLocaleString()}</TableCell>
                <TableCell>
                  <div>
                    <p>{w.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{w.profiles?.email}</p>
                  </div>
                </TableCell>
                <TableCell>${w.amount.toLocaleString()}</TableCell>
                <TableCell className="font-mono font-bold">{w.withdrawal_code}</TableCell>
                <TableCell>
                  <span className={isExpired(w.expires_at) ? "text-destructive" : ""}>
                    {new Date(w.expires_at).toLocaleString()}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      w.status === "used" ? "default" :
                      w.status === "pending" && !isExpired(w.expires_at) ? "secondary" :
                      "destructive"
                    }
                  >
                    {w.status === "pending" && isExpired(w.expires_at) ? "expired" : w.status}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-2">
                  {w.status === "pending" && !isExpired(w.expires_at) && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => markUsed(w.id)}>
                        Mark Used
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => cancelWithdrawal(w.id)}>
                        Cancel
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No ATM withdrawals found</p>
        )}
      </CardContent>
    </Card>
  );
}
