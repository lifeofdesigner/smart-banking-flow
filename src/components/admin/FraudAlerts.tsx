import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, Eye } from "lucide-react";
import { toast } from "sonner";

interface FraudAlert {
  id: string;
  user_id: string;
  transaction_id: string | null;
  alert_type: string;
  risk_score: number;
  details: any;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  user_name?: string;
}

export default function FraudAlerts() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => { loadAlerts(); }, []);

  const loadAlerts = async () => {
    const { data } = await supabase
      .from("fraud_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (data) {
      // Enrich with user names
      const userIds = [...new Set(data.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      setAlerts(data.map(a => ({ ...a, user_name: profileMap.get(a.user_id) || "Unknown" })));
    }
    setLoading(false);
  };

  const updateStatus = async (alertId: string, status: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("fraud_alerts")
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
      .eq("id", alertId);

    if (error) { toast.error(error.message); return; }

    // Audit log
    await supabase.from("audit_logs").insert({
      action: "fraud_alert.review",
      user_id: user?.id,
      metadata: { alert_id: alertId, new_status: status },
    } as any);

    toast.success(`Alert marked as ${status}`);
    loadAlerts();
  };

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.status === filter);
  const openCount = alerts.filter(a => a.status === "open").length;

  const riskColor = (score: number) => {
    if (score >= 80) return "destructive";
    if (score >= 50) return "secondary";
    return "default";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Fraud Alerts
            </CardTitle>
            <CardDescription>{openCount} open alerts requiring review</CardDescription>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground animate-pulse">Loading alerts...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No fraud alerts found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(alert => (
                <TableRow key={alert.id}>
                  <TableCell>{alert.user_name}</TableCell>
                  <TableCell className="capitalize">{alert.alert_type.replace(/_/g, " ")}</TableCell>
                  <TableCell>
                    <Badge variant={riskColor(alert.risk_score) as any}>{alert.risk_score}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <pre className="text-xs text-muted-foreground truncate">
                      {JSON.stringify(alert.details, null, 0).slice(0, 80)}
                    </pre>
                  </TableCell>
                  <TableCell>
                    <Badge variant={alert.status === "open" ? "destructive" : "default"}>{alert.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(alert.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {alert.status === "open" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => updateStatus(alert.id, "reviewed")}>
                          <Eye className="h-3 w-3 mr-1" />Review
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(alert.id, "dismissed")}>
                          Dismiss
                        </Button>
                      </div>
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
