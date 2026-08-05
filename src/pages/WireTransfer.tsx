/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, Globe, Check } from "lucide-react";
import { z } from "zod";
import DashboardLayout from "@/components/DashboardLayout";
import { isMissingWireTransferAccessColumnError } from "@/lib/supabaseErrors";
import { TransactionGate } from "@/components/TransactionGate";
import { useUserAccounts } from "@/hooks/useUserAccounts";
import { isAccountUsable, getAccountStatusLabel } from "@/lib/accountStatus";
import {
  DEFAULT_BUTTON_TEXT,
  DEFAULT_CODE_LABEL,
  normalizeVerificationSteps,
  visibleVerificationSteps,
  type WireTransferVerificationStep,
} from "@/lib/wireTransferVerification";

const wireTransferSchema = z.object({
  beneficiaryName: z.string().min(2, "Name must be at least 2 characters"),
  beneficiaryAccount: z.string().min(5, "Account number is required"),
  beneficiaryBank: z.string().min(2, "Bank name is required"),
  beneficiaryCountry: z.string().min(2, "Country is required"),
  swiftCode: z.string().min(8, "Valid SWIFT code required"),
  amount: z.number().min(1, "Amount must be greater than 0"),
  purpose: z.string().optional(),
});

const WireTransfer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const siteSettings = useSiteSettings();
  const verificationDisplayMode = siteSettings.wire_transfer_verification_display_mode === "show_all" ? "show_all" : "sequential";
  const showAllVerificationSteps = verificationDisplayMode === "show_all";
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [verificationSteps, setVerificationSteps] = useState<WireTransferVerificationStep[]>([]);
  const [wireTransferId, setWireTransferId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [securityCodeInput, setSecurityCodeInput] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const { accounts, restrictedAccounts, hasUsableAccount, loading: accountsLoading } = useUserAccounts(userId);
  const [transferData, setTransferData] = useState({
    beneficiaryName: "",
    beneficiaryAccount: "",
    beneficiaryBank: "",
    beneficiaryCountry: "",
    swiftCode: "",
    amount: "",
    purpose: "",
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    void loadVerificationSteps();
  }, []);

  const loadVerificationSteps = async () => {
    const { data, error } = await supabase
      .from("wire_transfer_verification_steps")
      .select("*")
      .order("display_order", { ascending: true });

    if (!error && data) {
      setVerificationSteps(data as WireTransferVerificationStep[]);
    }
  };

  const loadInitialData = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      navigate("/auth");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("can_initiate_wire_transfer")
      .eq("id", user.id)
      .single();

    if (profileError && !isMissingWireTransferAccessColumnError(profileError)) {
      throw profileError;
    }

    if (profile && !profile.can_initiate_wire_transfer) {
        setIsBlocked(true);
        return;
    }

    setUserId(user.id);

    // Check for pending wire transfer
    const { data: pendingTransfer } = await supabase
      .from("wire_transfers")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["verification_pending", "pending", "awaiting_cot", "awaiting_imf", "awaiting_tax", "awaiting_levy", "awaiting_fin"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (pendingTransfer) {
      setWireTransferId(pendingTransfer.id);
      setAccountId(pendingTransfer.account_id);
      setTransferData({
        beneficiaryName: pendingTransfer.beneficiary_name,
        beneficiaryAccount: pendingTransfer.beneficiary_account,
        beneficiaryBank: pendingTransfer.beneficiary_bank,
        beneficiaryCountry: pendingTransfer.beneficiary_country,
        swiftCode: pendingTransfer.swift_code || "",
        amount: String(pendingTransfer.amount),
        purpose: pendingTransfer.purpose || "",
      });

      setCurrentStep(pendingTransfer.current_stage || 0);
      
      toast({
        title: "Pending Transfer Found",
        description: "Continuing with your pending wire transfer.",
      });
    }
  };

  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = wireTransferSchema.parse({
        ...transferData,
        amount: parseFloat(transferData.amount),
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Not authenticated");
      if (!accountId) throw new Error("Please select a source account");

      const { data: wireId, error } = await (supabase as unknown).rpc("initiate_wire_transfer", {
        p_account_id: accountId,
        p_beneficiary_name: validated.beneficiaryName,
        p_beneficiary_account: validated.beneficiaryAccount,
        p_beneficiary_bank: validated.beneficiaryBank,
        p_beneficiary_country: validated.beneficiaryCountry,
        p_swift_code: validated.swiftCode,
        p_amount: validated.amount,
        p_currency: "USD",
        p_purpose: validated.purpose || null,
      });

      if (error) throw error;

      if (wireId) {
        setWireTransferId(wireId);

        setCurrentStep(1);
        toast({
          title: "Wire transfer initiated",
          description: "Please enter the security codes to proceed.",
        });
      }
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Unable to initiate wire transfer.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!wireTransferId) return;
    setLoading(true);

    try {
      const orderedSteps = normalizeVerificationSteps(verificationSteps);
      const currentStageCode = orderedSteps[currentStep - 1];
      if (!currentStageCode) {
        throw new Error("Verification workflow is not configured.");
      }

      const { data: verified, error: verifyError } = await supabase.rpc(
        "verify_wire_transfer_code",
        {
          p_wire_transfer_id: wireTransferId,
          p_code_type: currentStageCode.step_code,
          p_code: securityCodeInput.trim(),
        }
      );

      if (verifyError) throw verifyError;

      if (!verified) {
        toast({
          title: "Invalid code",
          description: "The security code you entered is incorrect.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if this is the last stage
      if (currentStep === orderedSteps.length) {
        toast({
          title: "Transfer completed!",
          description: "Your wire transfer has been successfully processed.",
        });

        setTimeout(() => navigate("/dashboard"), 2000);
      } else {
        const nextStage = currentStep + 1;
        setCurrentStep(nextStage);
        setSecurityCodeInput("");

        toast({
          title: "Code verified",
          description: `Please enter the ${orderedSteps[nextStage - 1].title}.`,
        });
      }
    } catch (error: unknown) {
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Unable to verify code.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const orderedVerificationSteps = visibleVerificationSteps(verificationSteps);
  const currentVerificationStep = orderedVerificationSteps[currentStep - 1] || null;

  if (isBlocked) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold">Wire Transfers Blocked</h1>
          <p>Your ability to initiate wire transfers has been suspended. Please contact support for assistance.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-[#F4F5F7] px-4 py-4 md:p-6">
      <header className="hidden rounded-xl border-0 bg-white shadow-sm md:block">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-[#0A1628] border-l-4 border-[#C9A84C] pl-3">Wire Transfer</h1>
              <p className="text-sm text-muted-foreground">International Money Transfer</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl px-0 py-4 md:px-4 md:py-8">
      <TransactionGate loading={accountsLoading} hasUsableAccount={hasUsableAccount} restrictedAccounts={restrictedAccounts}>
        {/* Progress Indicator */}
        {currentStep > 0 && orderedVerificationSteps.length > 0 && (
          <Card className="bg-white rounded-xl shadow-sm border-0 p-6 mb-8">
            <h3 className="font-bold mb-4">Security Verification Progress</h3>
            <div className="space-y-3">
              {orderedVerificationSteps.map((stage, index) => {
                const stageIndex = index + 1;
                const isCompleted = stageIndex < currentStep;
                const isActive = stageIndex === currentStep;
                return (
                  <div key={stage.id} className="flex items-center space-x-3">
                    {isCompleted ? (
                      <span className="w-7 h-7 rounded-full bg-[var(--bank-gold)] text-[#0A1628] inline-flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4" />
                      </span>
                    ) : isActive ? (
                      <span className="w-7 h-7 rounded-full bg-[var(--bank-navy)] text-white inline-flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {stageIndex}
                      </span>
                    ) : (
                      <span className="w-7 h-7 rounded-full border border-[#D1D5DB] text-[#9CA3AF] inline-flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {stageIndex}
                      </span>
                    )}
                    <div>
                      <p className={`font-medium text-sm ${isActive ? "text-[var(--bank-navy)]" : "text-foreground"}`}>
                        {stage.title}
                      </p>
                      <p className="text-sm text-muted-foreground">{stage.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

          {currentStep === 0 ? (
          <Card className="p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Initiate Wire Transfer</h2>
                <p className="text-muted-foreground">Enter beneficiary details</p>
              </div>
            </div>

            <form onSubmit={handleInitiateTransfer} className="space-y-6">
              <div className="space-y-2">
                <Label>From Account</Label>
                <Select value={accountId || ""} onValueChange={setAccountId}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select source account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id} disabled={!isAccountUsable(a.status)}>
                        {a.account_type.toUpperCase()} — {a.account_number} — {a.currency}{" "}
                        {a.computed_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        {!isAccountUsable(a.status) ? ` — ${getAccountStatusLabel(a.status)}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Beneficiary Name</label>
                  <Input
                    value={transferData.beneficiaryName}
                    onChange={(e) => setTransferData({ ...transferData, beneficiaryName: e.target.value })}
                    placeholder="John Doe"
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Account Number</label>
                  <Input
                    value={transferData.beneficiaryAccount}
                    onChange={(e) => setTransferData({ ...transferData, beneficiaryAccount: e.target.value })}
                    placeholder="1234567890"
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Bank Name</label>
                  <Input
                    value={transferData.beneficiaryBank}
                    onChange={(e) => setTransferData({ ...transferData, beneficiaryBank: e.target.value })}
                    placeholder="International Bank"
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Country</label>
                  <Input
                    value={transferData.beneficiaryCountry}
                    onChange={(e) => setTransferData({ ...transferData, beneficiaryCountry: e.target.value })}
                    placeholder="United States"
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">SWIFT Code</label>
                  <Input
                    value={transferData.swiftCode}
                    onChange={(e) => setTransferData({ ...transferData, swiftCode: e.target.value })}
                    placeholder="ABCDUS33XXX"
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount (USD)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={transferData.amount}
                    onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                    placeholder="1000.00"
                    required
                    className="h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Purpose (Optional)</label>
                <Textarea
                  value={transferData.purpose}
                  onChange={(e) => setTransferData({ ...transferData, purpose: e.target.value })}
                  placeholder="Payment for services"
                  className="min-h-[100px]"
                />
              </div>

              <Button type="submit" size="lg" className="w-full h-12" disabled={loading || !accountId}>
                {loading ? "Processing..." : "Initiate Transfer"}
              </Button>
            </form>
          </Card>
        ) : (
          <div className="space-y-4">
            {orderedVerificationSteps.length === 0 ? (
              <div className="text-sm text-muted-foreground">Verification workflow not available.</div>
            ) : (
              orderedVerificationSteps.map((stage, index) => {
                const stageIndex = index + 1;
                const isCompleted = stageIndex < currentStep;
                const isActive = stageIndex === currentStep;
                const statusLabel = isCompleted ? "Completed" : isActive ? "Active" : "Pending";

                if (!showAllVerificationSteps && !isActive) {
                  return null;
                }

                return (
                  <Card key={stage.id} className="bg-white rounded-xl shadow-sm border-0 p-8">
                    <div className="mb-8 text-center">
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-700"
                              : isActive
                              ? "bg-[var(--bank-navy)] text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Globe className="w-8 h-8 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">{stage.title}</h2>
                      <p className="text-muted-foreground">{stage.description}</p>
                    </div>

                    {isActive ? (
                      <div className="max-w-md mx-auto space-y-6">
                        <div
                          className="rounded-lg border-l-4 p-4"
                          style={{
                            backgroundColor: stage.message_background_color || "#FFFBEB",
                            borderColor: stage.message_border_color || "#F59E0B",
                          }}
                        >
                          <p className="mb-2 text-sm font-medium">
                            {stage.message_title || "Important"}
                          </p>
                          <p className="text-sm">
                            {stage.message_body || "This verification step is configured in the Admin CMS."}
                          </p>
                        </div>

                        {stage.requires_code !== false ? (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              {stage.code_label || DEFAULT_CODE_LABEL}
                            </label>
                            <Input
                              value={securityCodeInput}
                              onChange={(e) => setSecurityCodeInput(e.target.value)}
                              placeholder={stage.placeholder || `${stage.step_code}-XXXXXXXX`}
                              className="h-14 text-center text-lg font-mono"
                            />
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No verification code is required for this step.
                          </p>
                        )}

                        <Button
                          onClick={handleVerifyCode}
                          size="lg"
                          className="w-full h-12 bg-[var(--bank-navy)] hover:bg-[var(--bank-slate)]"
                          disabled={loading || (stage.requires_code !== false && !securityCodeInput.trim())}
                        >
                          {loading ? "Verifying..." : stage.button_text || DEFAULT_BUTTON_TEXT}
                        </Button>
                      </div>
                    ) : isCompleted ? (
                      <div className="max-w-md mx-auto rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
                        <p className="font-semibold">This step has already been verified.</p>
                      </div>
                    ) : (
                      <div className="max-w-md mx-auto rounded-xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
                        <p className="font-semibold">This step will unlock once prior verification steps are complete.</p>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        )}
      </TransactionGate>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default WireTransfer;
