import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, Loader2, FileText, Camera, MapPin } from "lucide-react";
import { toast } from "sonner";

interface KycRecord {
  id: string;
  user_id: string;
  document_type: string;
  document_url: string | null;
  selfie_url: string | null;
  address_document_url: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  user_name?: string;
  user_email?: string;
}

export default function KYCReviews() {
  const [submissions, setSubmissions] = useState<KycRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<KycRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from("kyc_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with user names
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email");
      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      const enriched = (data || []).map((s) => {
        const p = profileMap.get(s.user_id);
        return {
          ...s,
          user_name: p?.full_name || "Unknown",
          user_email: p?.email || "",
        } as KycRecord;
      });

      setSubmissions(enriched);
    } catch (err: any) {
      toast.error("Failed to load KYC submissions");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (record: KycRecord) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("kyc_submissions")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq("id", record.id);

      if (error) throw error;
      toast.success(`KYC approved for ${record.user_name}`);
      setSelectedRecord(null);
      fetchSubmissions();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (record: KycRecord) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("kyc_submissions")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason.trim(),
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq("id", record.id);

      if (error) throw error;
      toast.success(`KYC rejected for ${record.user_name}`);
      setSelectedRecord(null);
      setRejectionReason("");
      fetchSubmissions();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      approved: "default",
      pending: "secondary",
      under_review: "outline",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>KYC Reviews</CardTitle>
          <CardDescription>
            Review and approve customer identity verification submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No KYC submissions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Reviewed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{s.user_name}</p>
                        <p className="text-xs text-muted-foreground">{s.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {s.document_type.replace("_", " ")}
                    </TableCell>
                    <TableCell>{statusBadge(s.status)}</TableCell>
                    <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {s.reviewed_at
                        ? new Date(s.reviewed_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRecord(s);
                          setRejectionReason("");
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review KYC — {selectedRecord?.user_name}</DialogTitle>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-6">
              {/* Documents */}
              <div className="space-y-4">
                <DocumentPreview
                  label="ID Document"
                  icon={<FileText className="h-4 w-4" />}
                  url={selectedRecord.document_url}
                  docType={selectedRecord.document_type}
                />
                <DocumentPreview
                  label="Selfie Photo"
                  icon={<Camera className="h-4 w-4" />}
                  url={selectedRecord.selfie_url}
                />
                <DocumentPreview
                  label="Proof of Address"
                  icon={<MapPin className="h-4 w-4" />}
                  url={selectedRecord.address_document_url}
                />
              </div>

              {/* Existing rejection reason */}
              {selectedRecord.rejection_reason && (
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <p className="text-sm font-medium text-destructive">Previous Rejection Reason:</p>
                  <p className="text-sm">{selectedRecord.rejection_reason}</p>
                </div>
              )}

              {/* Status is pending/under_review — show actions */}
              {["pending", "under_review"].includes(selectedRecord.status) && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rejection Reason (if rejecting)</label>
                    <Textarea
                      placeholder="Explain why the submission is being rejected..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedRecord && ["pending", "under_review"].includes(selectedRecord.status) && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedRecord)}
                  disabled={processing}
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(selectedRecord)}
                  disabled={processing}
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DocumentPreview({
  label,
  icon,
  url,
  docType,
}: {
  label: string;
  icon: React.ReactNode;
  url: string | null;
  docType?: string;
}) {
  if (!url) {
    return (
      <div className="p-3 border rounded-lg text-muted-foreground text-sm">
        {label}: Not uploaded
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-muted/50 border-b">
        {icon}
        <span className="text-sm font-medium">{label}</span>
        {docType && (
          <span className="text-xs text-muted-foreground capitalize ml-auto">
            {docType.replace("_", " ")}
          </span>
        )}
      </div>
      {url.endsWith(".pdf") ? (
        <div className="p-4 text-center">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm"
          >
            Open PDF Document →
          </a>
        </div>
      ) : (
        <img
          src={url}
          alt={label}
          className="w-full max-h-64 object-contain bg-muted/30"
        />
      )}
    </div>
  );
}
