import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Calendar, Search, Loader2 } from "lucide-react";

interface ScheduledTransfer {
  id: string;
  amount: number;
  frequency: string;
  description: string | null;
  status: string;
  next_run_date: string;
  last_run_date: string | null;
  created_at: string;
  profiles?: { full_name: string; email: string };
  from_account?: { account_number: string };
  to_account?: { account_number: string };
}

export default function ScheduledTransfersManager() {
  const [transfers, setTransfers] = useState<ScheduledTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    const { data, error } = await supabase
      .from("scheduled_transfers")
      .select(`
        *,
        profiles(full_name, email),
        from_account:accounts!scheduled_transfers_from_account_id_fkey(account_number),
        to_account:accounts!scheduled_transfers_to_account_id_fkey(account_number)
      `)
      .order("next_run_date", { ascending: true });

    if (error) {
      toast.error("Failed to load scheduled transfers");
    } else {
      setTransfers(data || []);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("scheduled_transfers")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated");
      loadTransfers();
    }
  };

  const filtered = transfers.filter(t =>
    t.description?.toLowerCase().includes(search.toLowerCase()) ||
    t.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.profiles?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = transfers.filter(t => t.status === "active").length;
  const totalScheduledAmount = transfers.filter(t => t.status === "active").reduce((s, t) => s + t.amount, 0);

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
          <Calendar className="h-5 w-5" />
          Scheduled Transfers
        </CardTitle>
        <CardDescription>
          Active: {activeCount} | Total Scheduled: ${totalScheduledAmount.toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by description or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>From → To</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Next Run</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div>
                    <p>{t.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{t.profiles?.email}</p>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  •••{t.from_account?.account_number?.slice(-4)} → •••{t.to_account?.account_number?.slice(-4)}
                </TableCell>
                <TableCell>${t.amount.toLocaleString()}</TableCell>
                <TableCell className="capitalize">{t.frequency}</TableCell>
                <TableCell>{new Date(t.next_run_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  {t.last_run_date ? new Date(t.last_run_date).toLocaleDateString() : "Never"}
                </TableCell>
                <TableCell>
                  <Badge variant={t.status === "active" ? "default" : "secondary"}>
                    {t.status}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-2">
                  {t.status === "active" ? (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(t.id, "paused")}>
                      Pause
                    </Button>
                  ) : t.status === "paused" ? (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(t.id, "active")}>
                      Resume
                    </Button>
                  ) : null}
                  {t.status !== "cancelled" && (
                    <Button size="sm" variant="destructive" onClick={() => updateStatus(t.id, "cancelled")}>
                      Cancel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No scheduled transfers found</p>
        )}
      </CardContent>
    </Card>
  );
}
