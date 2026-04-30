import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Loan {
  id: string;
  user_id: string;
  principal: number;
  interest_rate: number;
  total_payable: number;
  monthly_payment: number;
  term_months: number;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  approved_at: string | null;
  profiles?: { full_name: string; email: string; kyc_status: string };
  loan_products?: { name: string };
}

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

export default function LoanManagement() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectLoanId, setRejectLoanId] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState("");

  useEffect(() => { fetchLoans(); }, []);

  const fetchLoans = async () => {
    const { data } = await supabase
      .from("loans")
      .select("*, profiles(full_name, email, kyc_status), loan_products(name)")
      .order("created_at", { ascending: false });
    if (data) setLoans(data as Loan[]);
    setLoading(false);
  };

  const handleApprove = async (loanId: string) => {
    setProcessing(loanId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Authentication required");
        return;
      }
      const { data, error } = await supabase.rpc("approve_loan", {
        p_loan_id: loanId, p_admin_id: user.id,
      });
      if (error) throw error;
      toast.success(data as string);
      fetchLoans();
    } catch (e: unknown) {
      toast.error(e.message);
    } finally {
      setProcessing("");
    }
  };

  const openReject = (loanId: string) => {
    setRejectLoanId(loanId);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error("Please provide a reason"); return; }
    setProcessing(rejectLoanId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Authentication required");
        return;
      }
      const { data, error } = await supabase.rpc("reject_loan", {
        p_loan_id: rejectLoanId, p_admin_id: user.id, p_reason: rejectReason,
      });
      if (error) throw error;
      toast.success(data as string);
      setRejectDialogOpen(false);
      fetchLoans();
    } catch (e: unknown) {
      toast.error(e.message);
    } finally {
      setProcessing("");
    }
  };

  const statusColor = (s: string): BadgeVariant => {
    switch (s) {
      case "active": case "completed": return "default";
      case "pending": return "secondary";
      case "rejected": case "defaulted": return "destructive";
      default: return "secondary";
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading loans...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loan Management</CardTitle>
        <CardDescription>Review, approve, or reject loan applications</CardDescription>
      </CardHeader>
      <CardContent>
        {loans.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No loan applications yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map(loan => (
                <TableRow key={loan.id}>
                  <TableCell>
                    <div className="font-medium">{loan.profiles?.full_name}</div>
                    <div className="text-xs text-muted-foreground">{loan.profiles?.email}</div>
                  </TableCell>
                  <TableCell>{loan.loan_products?.name}</TableCell>
                  <TableCell>${loan.principal.toLocaleString()}</TableCell>
                  <TableCell>{loan.interest_rate}%</TableCell>
                  <TableCell>{loan.term_months}mo</TableCell>
                  <TableCell>${loan.monthly_payment.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={loan.profiles?.kyc_status === "approved" ? "default" : "secondary"}>
                      {loan.profiles?.kyc_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColor(loan.status)}>{loan.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(loan.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {loan.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" disabled={processing === loan.id} onClick={() => handleApprove(loan.id)}>
                          <CheckCircle className="h-4 w-4 mr-1" />Approve
                        </Button>
                        <Button size="sm" variant="destructive" disabled={processing === loan.id} onClick={() => openReject(loan.id)}>
                          <XCircle className="h-4 w-4 mr-1" />Reject
                        </Button>
                      </div>
                    )}
                    {loan.status === "rejected" && loan.rejection_reason && (
                      <span className="text-xs text-destructive">{loan.rejection_reason}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Loan Application</DialogTitle>
            <DialogDescription>Provide a reason that will be shown to the applicant.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g. Insufficient income documentation..."
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!!processing}>Confirm Reject</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
