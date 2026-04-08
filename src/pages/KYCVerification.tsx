import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Upload,
  FileCheck,
  Camera,
  MapPin,
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type KycStatus = "pending" | "under_review" | "approved" | "rejected" | null;

interface KycSubmission {
  id: string;
  document_type: string;
  document_url: string | null;
  selfie_url: string | null;
  address_document_url: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const DOC_TYPES = [
  { value: "national_id", label: "National ID Card" },
  { value: "passport", label: "International Passport" },
  { value: "drivers_license", label: "Driver's License" },
];

export default function KYCVerification() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<KycSubmission | null>(null);
  const [kycStatus, setKycStatus] = useState<KycStatus>(null);

  // Form state
  const [documentType, setDocumentType] = useState("national_id");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [addressFile, setAddressFile] = useState<File | null>(null);

  const idRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      navigate("/auth");
      return;
    }
    setUserId(user.id);

    // Load existing submission
    const { data: sub } = await supabase
      .from("kyc_submissions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub) setSubmission(sub as KycSubmission);

    // Load profile KYC status
    const { data: profile } = await supabase
      .from("profiles")
      .select("kyc_status")
      .eq("id", user.id)
      .single();

    setKycStatus((profile?.kyc_status as KycStatus) || null);
    setLoading(false);
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${userId}/${folder}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("kyc-documents")
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data } = supabase.storage
      .from("kyc-documents")
      .getPublicUrl(path);

    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!userId || !idFile || !selfieFile || !addressFile) {
      toast({
        title: "Missing documents",
        description: "Please upload all three required documents.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const [docUrl, selfUrl, addrUrl] = await Promise.all([
        uploadFile(idFile, "id-document"),
        uploadFile(selfieFile, "selfie"),
        uploadFile(addressFile, "address-proof"),
      ]);

      const { data, error } = await supabase
        .from("kyc_submissions")
        .insert({
          user_id: userId,
          document_type: documentType,
          document_url: docUrl,
          selfie_url: selfUrl,
          address_document_url: addrUrl,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      setSubmission(data as KycSubmission);
      setKycStatus("pending");
      toast({
        title: "KYC submitted!",
        description: "Your documents are being reviewed. This usually takes 1-2 business days.",
      });
    } catch (err: any) {
      toast({
        title: "Submission failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const statusConfig: Record<string, { icon: React.ReactNode; iconClass: string; cardClass: string; label: string; note: string }> = {
    pending: {
      icon: <Clock className="h-5 w-5" />,
      iconClass: "text-amber-600",
      cardClass: "border-l-4 border-l-amber-500 bg-amber-50/60",
      label: "Pending Review",
      note: "Your documents are currently under review.",
    },
    under_review: {
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      iconClass: "text-amber-600",
      cardClass: "border-l-4 border-l-amber-500 bg-amber-50/60",
      label: "Under Review",
      note: "Your submission is being processed by our compliance team.",
    },
    approved: {
      icon: <CheckCircle2 className="h-5 w-5" />,
      iconClass: "text-emerald-600",
      cardClass: "border-l-4 border-l-emerald-500 bg-emerald-50/60",
      label: "Verified",
      note: "Your identity has been verified successfully.",
    },
    rejected: {
      icon: <XCircle className="h-5 w-5" />,
      iconClass: "text-destructive",
      cardClass: "border-l-4 border-l-destructive/60 bg-destructive/5",
      label: "Rejected",
      note: "Your submission needs corrections before approval.",
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const hasSubmission = submission && ["pending", "under_review", "approved"].includes(submission.status);

  return (
    <div className="min-h-screen bg-[#F4F5F7] p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="bg-white border border-[#E6EAF0] hover:bg-[#F0F4FA]">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-[#0A1628] border-l-4 border-[#C9A84C] pl-3">KYC Verification</h1>
            <p className="text-sm text-muted-foreground mt-1">Identity verification for your account</p>
          </div>
        </div>

        {/* Status Banner */}
        {kycStatus && statusConfig[kycStatus] ? (
          <Card className={`mb-6 bg-white rounded-xl shadow-sm border-0 ${statusConfig[kycStatus].cardClass}`}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className={statusConfig[kycStatus].iconClass}>{statusConfig[kycStatus].icon}</div>
              <div className="flex-1">
                <p className="font-medium text-[#0A1628]">Verification Status: {statusConfig[kycStatus].label}</p>
                {submission?.rejection_reason && kycStatus === "rejected" ? (
                  <p className="text-sm text-destructive mt-1">Reason: {submission.rejection_reason}</p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">{statusConfig[kycStatus].note}</p>
                )}
              </div>
              <Badge
                variant={
                  kycStatus === "approved" ? "default" :
                  kycStatus === "rejected" ? "destructive" : "secondary"
                }
              >
                {kycStatus}
              </Badge>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 bg-white rounded-xl shadow-sm border-0 border-l-4 border-l-[var(--bank-navy)] bg-[var(--bank-bg)]/40">
            <CardContent className="flex items-center gap-4 py-4">
              <Info className="h-5 w-5 text-[var(--bank-navy)]" />
              <div>
                <p className="font-medium text-[#0A1628]">Verification Status: Not Started</p>
                <p className="text-sm text-muted-foreground">Upload your documents to start account verification.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KYC requirement notice */}
        {(!kycStatus || kycStatus === "pending" || kycStatus === "rejected") && !hasSubmission && (
          <Card className="mb-6 bg-white rounded-xl shadow-sm border-0 border-l-4 border-l-amber-500 bg-amber-50/60">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-[#0A1628]">KYC Required</p>
                <p className="text-sm text-muted-foreground">
                  You must complete identity verification before you can make transfers or apply for loans.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Already submitted — show read-only */}
        {hasSubmission ? (
          <Card className="bg-white rounded-xl shadow-sm border-0">
            <CardHeader>
              <CardTitle className="text-[var(--bank-navy)]">Submitted Documents</CardTitle>
              <CardDescription>
                Submitted on {new Date(submission.created_at).toLocaleDateString()}
                {submission.reviewed_at &&
                  ` · Reviewed on ${new Date(submission.reviewed_at).toLocaleDateString()}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F8FAFC]">
                  <FileCheck className="h-5 w-5 text-[var(--bank-navy)]" />
                  <div>
                    <p className="font-medium text-sm">ID Document</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {submission.document_type.replace("_", " ")}
                    </p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F8FAFC]">
                  <Camera className="h-5 w-5 text-[var(--bank-navy)]" />
                  <div>
                    <p className="font-medium text-sm">Selfie Photo</p>
                    <p className="text-xs text-muted-foreground">Face verification</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F8FAFC]">
                  <MapPin className="h-5 w-5 text-[var(--bank-navy)]" />
                  <div>
                    <p className="font-medium text-sm">Proof of Address</p>
                    <p className="text-xs text-muted-foreground">Utility bill or bank statement</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Upload form — only shown if no active submission or rejected */
          <Card className="bg-white rounded-xl shadow-sm border-0">
            <CardHeader>
              <CardTitle className="text-[var(--bank-navy)]">Submit Verification Documents</CardTitle>
              <CardDescription>
                Upload clear, unedited copies of your documents. Accepted formats: JPG, PNG, PDF (max 5MB each).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Document Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Document Type</label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger className="h-11 border-[#E6EAF0] bg-white focus-visible:ring-[var(--bank-navy)]/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ID Document Upload */}
              <UploadField
                label="ID Document"
                description="Front page of your selected ID"
                icon={<FileCheck className="h-5 w-5" />}
                file={idFile}
                inputRef={idRef}
                onFileChange={setIdFile}
              />

              {/* Selfie Upload */}
              <UploadField
                label="Selfie Photo"
                description="Clear photo of your face (no glasses, no hat)"
                icon={<Camera className="h-5 w-5" />}
                file={selfieFile}
                inputRef={selfieRef}
                onFileChange={setSelfieFile}
              />

              {/* Address Proof Upload */}
              <UploadField
                label="Proof of Address"
                description="Utility bill or bank statement (less than 3 months old)"
                icon={<MapPin className="h-5 w-5" />}
                file={addressFile}
                inputRef={addressRef}
                onFileChange={setAddressFile}
              />

              <Button
                className="w-full h-12 bg-[var(--bank-navy)] hover:bg-[var(--bank-slate)]"
                onClick={handleSubmit}
                disabled={submitting || !idFile || !selfieFile || !addressFile}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading & Submitting...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Submit for Verification
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function UploadField({
  label,
  description,
  icon,
  file,
  inputRef,
  onFileChange,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (f: File | null) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-[#C9A84C] rounded-xl p-6 text-center cursor-pointer hover:bg-[#F8FAFC] transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && f.size > 5 * 1024 * 1024) {
              onFileChange(null);
              return;
            }
            onFileChange(f || null);
          }}
        />
        {file ? (
          <div className="flex items-center justify-center gap-2 text-[var(--bank-navy)]">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-medium">{file.name}</span>
          </div>
        ) : (
          <>
            <div className="mb-3 flex justify-center">
              <span className="h-10 w-10 rounded-full bg-[var(--bank-navy)] text-[var(--bank-gold)] flex items-center justify-center">
                {icon}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            <p className="text-xs text-muted-foreground mt-1">Click to upload</p>
          </>
        )}
      </div>
    </div>
  );
}
