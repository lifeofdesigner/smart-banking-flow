import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Shield, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TransferLimit {
  id: string;
  account_id: string;
  daily_limit: number;
  per_transaction_limit: number;
  currency: string;
  created_at: string;
  account_number?: string;
  owner_name?: string;
  daily_usage?: number;
}

export default function TransferLimitsManager() {
  const [limits, setLimits] = useState<TransferLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLimit, setEditingLimit] = useState<TransferLimit | null>(null);
  const [editDaily, setEditDaily] = useState("");
  const [editPerTx, setEditPerTx] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLimits();
  }, []);

  const fetchLimits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("transfer_limits")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        setLimits([]);
        setLoading(false);
        return;
      }

      const accountIds = data.map((l: any) => l.account_id);
      const { data: accounts } = await supabase
        .from("accounts")
        .select("id, account_number, user_id")
        .in("id", accountIds);

      const accMap = new Map((accounts ?? []).map((a: any) => [a.id, a]));
      const userIds = [...new Set((accounts ?? []).map((a: any) => a.user_id).filter(Boolean))];

      let profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      }

      // Fetch daily usage for each account
      const enriched = await Promise.all(
        data.map(async (limit: any) => {
          const acc = accMap.get(limit.account_id);
          const profile = acc?.user_id ? profileMap.get(acc.user_id) : null;
          const { data: usage } = await supabase.rpc("get_daily_transfer_usage", {
            p_account_id: limit.account_id,
          });
          return {
            ...limit,
            account_number: acc?.account_number ?? "Unknown",
            owner_name: profile?.full_name ?? "System",
            daily_usage: usage ?? 0,
          };
        })
      );

      setLimits(enriched);
    } catch (err) {
      console.error("Error fetching limits:", err);
      toast.error("Failed to load transfer limits");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (limit: TransferLimit) => {
    setEditingLimit(limit);
    setEditDaily(limit.daily_limit.toString());
    setEditPerTx(limit.per_transaction_limit.toString());
  };

  const handleSave = async () => {
    if (!editingLimit) return;
    const daily = parseFloat(editDaily);
    const perTx = parseFloat(editPerTx);
    if (isNaN(daily) || isNaN(perTx) || daily <= 0 || perTx <= 0) {
      toast.error("Limits must be positive numbers");
      return;
    }
    if (perTx > daily) {
      toast.error("Per-transaction limit cannot exceed daily limit");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("transfer_limits")
        .update({ daily_limit: daily, per_transaction_limit: perTx })
        .eq("id", editingLimit.id);

      if (error) throw error;
      toast.success("Transfer limits updated");
      setEditingLimit(null);
      fetchLimits();
    } catch (err) {
      console.error("Error updating limits:", err);
      toast.error("Failed to update limits");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Transfer Limits
          </CardTitle>
          <CardDescription>
            View and manage per-account transfer limits and today's usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : limits.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No transfer limits configured</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Per-Tx Limit</TableHead>
                  <TableHead className="text-right">Daily Limit</TableHead>
                  <TableHead>Today's Usage</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {limits.map((limit) => {
                  const usagePct = limit.daily_limit > 0
                    ? Math.min(((limit.daily_usage ?? 0) / limit.daily_limit) * 100, 100)
                    : 0;
                  return (
                    <TableRow key={limit.id}>
                      <TableCell className="font-mono">{limit.account_number}</TableCell>
                      <TableCell>{limit.owner_name}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${limit.per_transaction_limit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${limit.daily_limit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[140px]">
                          <Progress value={usagePct} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            ${(limit.daily_usage ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} / ${limit.daily_limit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{limit.currency}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(limit)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingLimit} onOpenChange={(open) => !open && setEditingLimit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transfer Limits</DialogTitle>
          </DialogHeader>
          {editingLimit && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Account: <span className="font-mono">{editingLimit.account_number}</span> — {editingLimit.owner_name}
              </p>
              <div className="space-y-2">
                <Label>Per-Transaction Limit ($)</Label>
                <Input
                  type="number"
                  value={editPerTx}
                  onChange={(e) => setEditPerTx(e.target.value)}
                  min="0"
                  step="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Daily Limit ($)</Label>
                <Input
                  type="number"
                  value={editDaily}
                  onChange={(e) => setEditDaily(e.target.value)}
                  min="0"
                  step="100"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLimit(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
