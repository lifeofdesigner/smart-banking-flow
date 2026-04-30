import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Loader2, Play, Trash2 } from "lucide-react";

interface StressReport {
  simulated_users: number;
  accounts_created: number;
  transactions_executed: number;
  transactions_failed: number;
  fraud_alerts_triggered: number;
  loans_applied: number;
  loans_approved: number;
  loans_rejected: number;
  loan_repayments: number;
  referral_rewards_issued: number;
  cashback_rewards_issued: number;
  balance_mismatches: number;
  transfer_limit_rejections: number;
  suspended_account_rejections: number;
  concurrent_transfer_results: { success: number; failed: number };
  performance: { avg_transaction_ms: number; total_duration_ms: number };
  errors: string[];
  steps_completed: string[];
}

export default function StressTest() {
  const [running, setRunning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [report, setReport] = useState<StressReport | null>(null);

  const runTest = async () => {
    setRunning(true);
    setReport(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("stress-test", {
        body: { action: "run" },
      });

      if (res.error) throw new Error(res.error.message);
      setReport(res.data);
      toast.success("Stress test completed");
    } catch (err: unknown) {
      toast.error("Stress test failed: " + err.message);
    } finally {
      setRunning(false);
    }
  };

  const cleanup = async () => {
    setCleaning(true);
    try {
      const res = await supabase.functions.invoke("stress-test", {
        body: { action: "cleanup" },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success("Simulation data cleaned up");
      setReport(null);
    } catch (err: unknown) {
      toast.error("Cleanup failed: " + err.message);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Production Stress Test</CardTitle>
          <CardDescription>
            Simulate 50 users, 500+ transactions, concurrent transfers, fraud detection, loan flows, and balance integrity checks.
            All simulation data is tagged and can be cleaned up after testing.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button onClick={runTest} disabled={running || cleaning}>
            {running ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</>
            ) : (
              <><Play className="mr-2 h-4 w-4" />Run Stress Test</>
            )}
          </Button>
          <Button variant="outline" onClick={cleanup} disabled={running || cleaning}>
            {cleaning ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cleaning...</>
            ) : (
              <><Trash2 className="mr-2 h-4 w-4" />Cleanup Simulation Data</>
            )}
          </Button>
        </CardContent>
      </Card>

      {report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard label="Users Created" value={report.simulated_users} />
            <MetricCard label="Transactions OK" value={report.transactions_executed} />
            <MetricCard label="Transactions Failed" value={report.transactions_failed} variant={report.transactions_failed > 0 ? "warning" : "success"} />
            <MetricCard label="Fraud Alerts" value={report.fraud_alerts_triggered} />
            <MetricCard label="Loans Approved" value={report.loans_approved} />
            <MetricCard label="Loans Rejected" value={report.loans_rejected} />
            <MetricCard label="Cashback Rewards" value={report.cashback_rewards_issued} />
            <MetricCard label="Balance Mismatches" value={report.balance_mismatches} variant={report.balance_mismatches > 0 ? "error" : "success"} />
            <MetricCard label="Limit Rejections" value={report.transfer_limit_rejections} variant="success" />
            <MetricCard label="Suspended Rejections" value={report.suspended_account_rejections} variant="success" />
            <MetricCard label="Concurrent OK" value={report.concurrent_transfer_results.success} />
            <MetricCard label="Concurrent Failed" value={report.concurrent_transfer_results.failed} variant={report.concurrent_transfer_results.failed > 0 ? "warning" : "success"} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Average transaction time: <strong>{report.performance.avg_transaction_ms}ms</strong></p>
              <p>Total test duration: <strong>{(report.performance.total_duration_ms / 1000).toFixed(1)}s</strong></p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Steps Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {report.steps_completed.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {report.errors.length > 0 && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Errors ({report.errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-destructive">
                  {report.errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, variant = "default" }: { label: string; value: number; variant?: "default" | "success" | "warning" | "error" }) {
  const colorClass = variant === "error" ? "text-destructive" : variant === "warning" ? "text-yellow-600" : variant === "success" ? "text-primary" : "";
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
