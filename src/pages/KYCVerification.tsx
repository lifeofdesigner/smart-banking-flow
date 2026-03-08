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

  const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    pending: { icon: <Clock className="h-5 w-5" />, color: "text-yellow-600", label: "Pending Review" },
    under_review: { icon: <Loader2 className="h-5 w-5 animate-spin" />, color: "text-blue-600", label: "Under Review" },
    approved: { icon: <CheckCircle2 className="h-5 w-5" />, color: "text-green-600", label: "Approved" },
    rejected: { icon: <XCircle className="h-5 w-5" />, color: "text-destructive", label: "Rejected" },
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
    <div className="min-h-screen bg-secondary/20">
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">KYC Verification</h1>
              <p className="text-sm text-muted-foreground">Identity verification for your account</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Status Banner */}
        {kycStatus && statusConfig[kycStatus] && (
          <Card className="mb-6">
            <CardContent className="flex items-center gap-4 py-4">
              <div className={statusConfig[kycStatus].color}>
                {statusConfig[kycStatus].icon}
              </div>
              <div className="flex-1">
                <p className="font-medium">Verification Status: {statusConfig[kycStatus].label}</p>
                {submission?.rejection_reason && kycStatus === "rejected" && (
                  <p className="text-sm text-destructive mt-1">
                    Reason: {submission.rejection_reason}
                  </p>
                )}
                {kycStatus === "approved" && (
                  <p className="text-sm text-muted-foreground">Your identity has been verified.</p>
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
        )}

        {/* KYC requirement notice */}
        {(!kycStatus || kycStatus === "pending" || kycStatus === "rejected") && !hasSubmission && (
          <Card className="mb-6 border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">KYC Required</p>
                <p className="text-sm text-muted-foreground">
                  You must complete identity verification before you can make transfers or apply for loans.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Already submitted — show read-only */}
        {hasSubmission ? (
          <Card>
            <CardHeader>
              <CardTitle>Submitted Documents</CardTitle>
              <CardDescription>
                Submitted on {new Date(submission.created_at).toLocaleDateString()}
                {submission.reviewed_at &&
                  ` · Reviewed on ${new Date(submission.reviewed_at).toLocaleDateString()}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <FileCheck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">ID Document</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {submission.document_type.replace("_", " ")}
                    </p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Camera className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Selfie Photo</p>
                    <p className="text-xs text-muted-foreground">Face verification</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <MapPin className="h-5 w-5 text-primary" />
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
          <Card>
            <CardHeader>
              <CardTitle>Submit Verification Documents</CardTitle>
              <CardDescription>
                Upload clear, unedited copies of your documents. Accepted formats: JPG, PNG, PDF (max 5MB each).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Document Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Document Type</label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
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
                className="w-full h-12"
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
        className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
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
          <div className="flex items-center justify-center gap-2 text-primary">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">{file.name}</span>
          </div>
        ) : (
          <>
            <div className="text-muted-foreground mb-2 flex justify-center">{icon}</div>
            <p className="text-sm text-muted-foreground">{description}</p>
            <p className="text-xs text-muted-foreground mt-1">Click to upload</p>
          </>
        )}
      </div>
    </div>
  );
}
