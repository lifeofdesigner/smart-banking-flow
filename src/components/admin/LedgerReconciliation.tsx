import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Scale, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function LedgerReconciliation() {
  const [reports, setReports] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    const { data } = await supabase
      .from("daily_financial_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(90);
    if (data) setReports(data);
    setLoading(false);
  };

  const runReconciliation = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.rpc("run_ledger_reconciliation", { p_date: new Date().toISOString().split("T")[0] });
      if (error) throw error;
      toast.success(`Reconciliation complete: ${(data as unknown)?.status || "done"}`);
      loadReports();
    } catch (e: unknown) {
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5" /> Ledger Reconciliation</CardTitle>
            <CardDescription>Daily debit/credit balance verification</CardDescription>
          </div>
          <Button onClick={runReconciliation} disabled={running}>
            <RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} />
            Run Now
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground animate-pulse">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No reconciliation reports yet. Click "Run Now" to generate.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Total Debits</TableHead>
                <TableHead>Total Credits</TableHead>
                <TableHead>Difference</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.report_date}</TableCell>
                  <TableCell>${Number(r.total_debits).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>${Number(r.total_credits).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className={Number(r.ledger_difference) !== 0 ? "text-destructive font-bold" : ""}>
                    ${Number(r.ledger_difference).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {Number(r.ledger_difference) === 0 ? (
                      <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Balanced</Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Mismatch</Badge>
                    )}
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
