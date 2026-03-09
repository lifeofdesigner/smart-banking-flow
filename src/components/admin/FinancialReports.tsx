import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function FinancialReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    const { data } = await supabase
      .from("daily_financial_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(60);
    if (data) setReports(data);
    setLoading(false);
  };

  const generateToday = async () => {
    try {
      const { error } = await supabase.rpc("run_ledger_reconciliation", { p_date: new Date().toISOString().split("T")[0] });
      if (error) throw error;
      toast.success("Today's report generated");
      loadReports();
    } catch (e: any) { toast.error(e.message); }
  };

  const exportCSV = () => {
    if (reports.length === 0) return;
    const headers = ["Date", "Deposits", "Withdrawals", "Transfers", "Loan Disbursements", "Repayments", "Investment Inflows", "Savings Inflows"];
    const rows = reports.map(r => [r.report_date, r.total_deposits, r.total_withdrawals, r.total_transfers, r.total_loan_disbursements, r.total_repayments, r.total_investment_inflows, r.total_savings_inflows]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "financial_reports.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (v: any) => "$" + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Financial Reports</CardTitle>
            <CardDescription>Daily transaction summaries</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} disabled={reports.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
            <Button onClick={generateToday}>
              <RefreshCw className="h-4 w-4 mr-2" /> Generate Today
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground animate-pulse">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No reports yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Deposits</TableHead>
                  <TableHead>Withdrawals</TableHead>
                  <TableHead>Transfers</TableHead>
                  <TableHead>Loan Disb.</TableHead>
                  <TableHead>Repayments</TableHead>
                  <TableHead>Investments</TableHead>
                  <TableHead>Savings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.report_date}</TableCell>
                    <TableCell>{fmt(r.total_deposits)}</TableCell>
                    <TableCell>{fmt(r.total_withdrawals)}</TableCell>
                    <TableCell>{fmt(r.total_transfers)}</TableCell>
                    <TableCell>{fmt(r.total_loan_disbursements)}</TableCell>
                    <TableCell>{fmt(r.total_repayments)}</TableCell>
                    <TableCell>{fmt(r.total_investment_inflows)}</TableCell>
                    <TableCell>{fmt(r.total_savings_inflows)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
