/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Users,
  Shield,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import DashboardLayout from "@/components/DashboardLayout";

const transferSchema = z.object({
  fromAccountId: z.string().uuid("Please select a source account"),
  toAccountNumber: z
    .string()
    .min(1, "Account number is required")
    .max(20, "Account number too long")
    .regex(/^\d+$/, "Account number must contain only digits"),
  amount: z
    .number({ invalid_type_error: "Enter a valid amount" })
    .positive("Amount must be greater than zero")
    .max(1_000_000, "Maximum transfer amount is $1,000,000"),
  description: z.string().max(200, "Description too long").optional(),
});

interface Account {
  id: string;
  account_number: string;
  account_type: string;
  currency: string;
  computed_balance: number;
}

interface TransferLimitInfo {
  daily_limit: number;
  per_transaction_limit: number;
  daily_usage: number;
  remaining_daily: number;
}

interface RecipientInfo {
  id: string;
  account_number: string;
  account_type: string;
  status: string | null;
  holder_name: string;
}

interface RecentTransfer {
  id: string;
  amount: number;
  description: string | null;
  status: string | null;
  reference_number: string | null;
  created_at: string;
}

interface SavedBeneficiary {
  id: string;
  nickname: string;
  account_number: string;
  account_id: string | null;
  holder_name?: string;
}

type Step = "form" | "confirm" | "success";
type EntryMode = "manual" | "beneficiary";

const TransferFunds = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTransfers, setRecentTransfers] = useState<RecentTransfer[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<SavedBeneficiary[]>([]);
  const [transferLimits, setTransferLimits] = useState<TransferLimitInfo | null>(null);

  // Form state
  const [entryMode, setEntryMode] = useState<EntryMode>("manual");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountNumber, setToAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Recipient lookup
  const [lookupLoading, setLookupLoading] = useState(false);
  const [recipient, setRecipient] = useState<RecipientInfo | null>(null);
  const [lookupError, setLookupError] = useState("");

  // Transfer execution
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    reference: string;
    amount: number;
    recipientName: string;
  } | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  // Fetch transfer limits when source account changes
  useEffect(() => {
    if (!fromAccountId) {
      setTransferLimits(null);
      return;
    }
    const fetchLimits = async () => {
      try {
        const [limitRes, usageRes] = await Promise.all([
          supabase
            .from("transfer_limits")
            .select("daily_limit, per_transaction_limit")
            .eq("account_id", fromAccountId)
            .maybeSingle(),
          supabase.rpc("get_daily_transfer_usage", { p_account_id: fromAccountId }),
        ]);
        if (limitRes.data) {
          const usage = (usageRes.data as number) ?? 0;
          setTransferLimits({
            daily_limit: limitRes.data.daily_limit,
            per_transaction_limit: limitRes.data.per_transaction_limit,
            daily_usage: usage,
            remaining_daily: Math.max(0, limitRes.data.daily_limit - usage),
          });
        } else {
          setTransferLimits(null);
        }
      } catch {
        setTransferLimits(null);
      }
    };
    fetchLimits();
  }, [fromAccountId]);

  const checkAuth = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      navigate("/auth");
      return;
    }
    setUserId(user.id);
    await loadData(user.id);
  };

  const loadData = async (uid: string) => {
    try {
      const [acctRes, benRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, account_number, account_type, currency")
          .eq("user_id", uid)
          .eq("status", "active"),
        supabase
          .from("beneficiaries")
          .select("id, nickname, account_number, account_id")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
      ]);

      const accts = acctRes.data;
      if (accts) {
        const withBalances = accts.map((a) => ({
          ...a,
          computed_balance: (a as unknown).available_balance ?? 0,
        }));
        setAccounts(withBalances);
      }

      if (benRes.data) {
        // Enrich beneficiaries with holder names
        const enriched = await Promise.all(
          benRes.data.map(async (b) => {
            if (!b.account_id) return { ...b, holder_name: "Unknown" };
            const { data: acc } = await supabase
              .from("accounts")
              .select("user_id")
              .eq("id", b.account_id)
              .single();
            if (!acc?.user_id) return { ...b, holder_name: "System Account" };
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", acc.user_id)
              .single();
            return { ...b, holder_name: profile?.full_name || "Unknown" };
          })
        );
        setBeneficiaries(enriched);
      }

      // Load recent transfers
      if (accts && accts.length > 0) {
        const accountIds = accts.map((a) => a.id);
        const { data: txns } = await supabase
          .from("transactions")
          .select("*")
          .in("account_id", accountIds)
          .eq("transaction_type", "transfer")
          .order("created_at", { ascending: false })
          .limit(10);

        if (txns) setRecentTransfers(txns);
      }
    } catch (err: unknown) {
      toast({
        title: "Error loading data",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Debounced account lookup for manual mode
  useEffect(() => {
    if (entryMode !== "manual") return;
    if (toAccountNumber.length < 5) {
      setRecipient(null);
      setLookupError("");
      return;
    }
    const timer = setTimeout(() => lookupAccount(toAccountNumber), 500);
    return () => clearTimeout(timer);
  }, [toAccountNumber, entryMode]);

  const lookupAccount = async (accNum: string) => {
    setLookupLoading(true);
    setLookupError("");
    setRecipient(null);
    try {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, account_number, account_type, status")
        .eq("account_number", accNum)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setLookupError("Invalid account number");
        return;
      }

      const { data: accFull } = await supabase
        .from("accounts")
        .select("user_id")
        .eq("id", data.id)
        .single();

      let holderName = "System Account";
      if (accFull?.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", accFull.user_id)
          .single();
        holderName = profile?.full_name || "Unknown";
      }

      setRecipient({ ...data, holder_name: holderName });
    } catch {
      setLookupError("Error looking up account");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSelectBeneficiary = async (benId: string) => {
    const ben = beneficiaries.find((b) => b.id === benId);
    if (!ben) return;

    setToAccountNumber(ben.account_number);

    if (ben.account_id) {
      const { data } = await supabase
        .from("accounts")
        .select("id, account_number, account_type, status")
        .eq("id", ben.account_id)
        .single();

      if (data) {
        setRecipient({
          ...data,
          holder_name: ben.holder_name || "Unknown",
        });
        setLookupError("");
      }
    }
  };

  const validateForm = (): boolean => {
    const result = transferSchema.safeParse({
      fromAccountId,
      toAccountNumber,
      amount: parseFloat(amount),
      description: description || undefined,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        const field = e.path[0] as string;
        fieldErrors[field] = e.message;
      });
      setErrors(fieldErrors);
      return false;
    }

    if (!recipient) {
      setErrors({ toAccountNumber: "Please enter a valid account number" });
      return false;
    }
    if (recipient.status !== "active") {
      setErrors({ toAccountNumber: "Recipient account is not active" });
      return false;
    }
    if (recipient.id === fromAccountId) {
      setErrors({ toAccountNumber: "Cannot transfer to the same account" });
      return false;
    }

    const selectedAccount = accounts.find((a) => a.id === fromAccountId);
    if (selectedAccount && parseFloat(amount) > selectedAccount.computed_balance) {
      setErrors({ amount: "Insufficient funds" });
      return false;
    }

    // Check transfer limits client-side
    const parsedAmount = parseFloat(amount);
    if (transferLimits) {
      if (parsedAmount > transferLimits.per_transaction_limit) {
        setErrors({ amount: `Exceeds per-transaction limit of $${transferLimits.per_transaction_limit.toLocaleString("en-US", { minimumFractionDigits: 2 })}` });
        return false;
      }
      if (parsedAmount > transferLimits.remaining_daily) {
        setErrors({ amount: `Exceeds remaining daily limit of $${transferLimits.remaining_daily.toLocaleString("en-US", { minimumFractionDigits: 2 })}` });
        return false;
      }
    }

    setErrors({});
    return true;
  };

  const handleReview = () => {
    if (validateForm()) setStep("confirm");
  };

  const handleConfirmTransfer = async () => {
    if (!userId || !recipient) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("transfer_between_accounts", {
        p_from_account: fromAccountId,
        p_to_account: recipient.id,
        p_amount: parseFloat(amount),
        p_user_id: userId,
      });

      if (error) {
        let msg = error.message;
        if (msg.includes("Insufficient balance")) msg = "Insufficient funds for this transfer.";
        else if (msg.includes("not active")) msg = "One of the accounts is frozen or closed.";
        else if (msg.includes("do not own")) msg = "You do not own the source account.";
        else if (msg.includes("per-transaction limit")) msg = "Transfer exceeds your per-transaction limit.";
        else if (msg.includes("daily limit") || msg.includes("exceed daily")) msg = "Transfer would exceed your daily limit.";
        toast({ title: "Transfer failed", description: msg, variant: "destructive" });
        setStep("form");
        return;
      }

      const ref = data as string;
      const { data: txn } = await supabase
        .from("transactions")
        .select("reference_number")
        .eq("id", ref)
        .single();

      setSuccessData({
        reference: txn?.reference_number || ref,
        amount: parseFloat(amount),
        recipientName: recipient.holder_name,
      });
      setStep("success");
    } catch (err: unknown) {
      toast({ title: "Transfer error", description: err.message, variant: "destructive" });
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewTransfer = () => {
    setStep("form");
    setFromAccountId("");
    setToAccountNumber("");
    setAmount("");
    setDescription("");
    setRecipient(null);
    setSuccessData(null);
    setErrors({});
    setEntryMode("manual");
    if (userId) loadData(userId);
  };

  const selectedFromAccount = accounts.find((a) => a.id === fromAccountId);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-[#F4F5F7] px-4 py-4 md:p-6">
      <header className="hidden rounded-xl border-0 bg-white shadow-sm md:block">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-lg bg-[var(--bank-navy)] flex items-center justify-center">
              <Send className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#0A1628] border-l-4 border-[#C9A84C] pl-3">Transfer Funds</h1>
              <p className="text-sm text-muted-foreground">Send money between accounts</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-2xl px-0 py-4 md:px-4 md:py-8">
        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-2 rounded-2xl border-0 bg-white p-4 shadow-sm md:mb-8 md:rounded-xl">
          {([
            { key: "form", label: "Details" },
            { key: "confirm", label: "Confirm" },
            { key: "success", label: "Success" },
          ] as { key: Step; label: string }[]).map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium md:h-9 md:w-9 ${
                  step === s.key
                    ? "bg-[var(--bank-navy)] text-white"
                    : i < ["form", "confirm", "success"].indexOf(step)
                    ? "bg-[var(--bank-gold)] text-[#0A1628]"
                    : "bg-[#E5E7EB] text-[#9CA3AF]"
                }`}
              >
                {i < ["form", "confirm", "success"].indexOf(step) ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className="text-xs font-medium text-muted-foreground hidden sm:inline">{s.label}</span>
              {i < 2 && <div className="h-0.5 w-12 bg-border md:w-10" />}
            </div>
          ))}
        </div>

        {/* FORM STEP */}
        {step === "form" && (
          <Card className="rounded-2xl border-0 bg-white shadow-sm md:rounded-xl">
            <CardHeader>
              <CardTitle>Transfer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* From Account */}
              <div className="space-y-2">
                <Label>From Account</Label>
                <Select value={fromAccountId} onValueChange={setFromAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.account_type.toUpperCase()} — {a.account_number} — {a.currency}{" "}
                        {a.computed_balance.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.fromAccountId && (
                  <p className="text-sm text-destructive">{errors.fromAccountId}</p>
                )}
              </div>

              {/* Entry mode toggle */}
              <div className="space-y-2">
                <Label>Recipient</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={entryMode === "manual" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setEntryMode("manual");
                      setToAccountNumber("");
                      setRecipient(null);
                      setLookupError("");
                    }}
                  >
                    Manual Entry
                  </Button>
                  <Button
                    type="button"
                    variant={entryMode === "beneficiary" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setEntryMode("beneficiary");
                      setToAccountNumber("");
                      setRecipient(null);
                      setLookupError("");
                    }}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Saved Beneficiary
                  </Button>
                </div>
              </div>

              {/* Manual entry */}
              {entryMode === "manual" && (
                <div className="space-y-2">
                  <Label>Recipient Account Number</Label>
                  <div className="relative">
                    <Input
                      placeholder="Enter account number"
                      value={toAccountNumber}
                      onChange={(e) => setToAccountNumber(e.target.value.replace(/\D/g, ""))}
                      maxLength={20}
                      className="h-12 rounded-xl text-base"
                    />
                    {lookupLoading && (
                      <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-muted-foreground" />
                    )}
                    {!lookupLoading && recipient && (
                      <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-600" />
                    )}
                  </div>
                  {lookupError && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {lookupError}
                    </div>
                  )}
                </div>
              )}

              {/* Beneficiary selection */}
              {entryMode === "beneficiary" && (
                <div className="space-y-2">
                  <Label>Select Beneficiary</Label>
                  {beneficiaries.length === 0 ? (
                    <div className="rounded-lg border border-border p-4 text-center text-muted-foreground">
                      <p className="mb-2">No saved beneficiaries</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/beneficiaries")}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Beneficiary
                      </Button>
                    </div>
                  ) : (
                    <Select onValueChange={handleSelectBeneficiary}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a beneficiary" />
                      </SelectTrigger>
                      <SelectContent>
                        {beneficiaries.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.nickname} — {b.account_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Recipient info display */}
              {recipient && (
                <div className="space-y-1 rounded-2xl border-0 bg-white p-4 shadow-sm md:rounded-lg">
                  <p className="font-semibold text-[#0A1628]">{recipient.holder_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Account: {recipient.account_number}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    Status:{" "}
                    <span
                      className={
                        recipient.status === "active"
                          ? "text-green-600"
                          : "text-destructive"
                      }
                    >
                      {recipient.status}
                    </span>
                  </p>
                </div>
              )}

              {errors.toAccountNumber && (
                <p className="text-sm text-destructive">{errors.toAccountNumber}</p>
              )}

              {/* Amount */}
              <div className="space-y-2">
                <Label>Amount (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-12 rounded-xl pl-8 text-center text-[32px] font-semibold leading-none"
                  />
                </div>
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount}</p>
                )}
                {selectedFromAccount && (
                  <p className="text-xs text-muted-foreground">
                    Available: {selectedFromAccount.currency}{" "}
                    {selectedFromAccount.computed_balance.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                )}
              </div>

              {/* Transfer Limits Display */}
              {transferLimits && (
                <div className="rounded-lg border-l-4 border-amber-400 border border-amber-200 bg-amber-50/40 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Shield className="h-4 w-4 text-amber-700" />
                    Transfer Limits
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Per Transaction</p>
                      <p className="font-medium">${transferLimits.per_transaction_limit.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Daily Limit</p>
                      <p className="font-medium">${transferLimits.daily_limit.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Today's usage</span>
                      <span className="font-medium">${transferLimits.daily_usage.toLocaleString("en-US", { minimumFractionDigits: 2 })} / ${transferLimits.daily_limit.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <Progress value={Math.min((transferLimits.daily_usage / transferLimits.daily_limit) * 100, 100)} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Remaining today: <span className="font-medium text-foreground">${transferLimits.remaining_daily.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="What's this transfer for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={200}
                  rows={2}
                />
              </div>

              <Button
                className="hidden w-full md:inline-flex"
                size="lg"
                onClick={handleReview}
                disabled={!fromAccountId || !recipient || !amount}
              >
                Review Transfer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="h-20 md:hidden" />
            </CardContent>
          </Card>
        )}

        {/* CONFIRM STEP */}
        {step === "confirm" && recipient && selectedFromAccount && (
          <Card className="rounded-2xl border-0 bg-white shadow-sm md:rounded-xl">
            <CardHeader>
              <CardTitle>Confirm Transfer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 rounded-2xl border border-dashed border-[#C9A84C] bg-white p-4 md:rounded-lg md:border-solid md:border-[#E6EAF0]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From</span>
                  <span className="font-medium">
                    {selectedFromAccount.account_type.toUpperCase()} —{" "}
                    {selectedFromAccount.account_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-medium">{recipient.holder_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account</span>
                  <span className="font-medium">{recipient.account_number}</span>
                </div>
                <div className="border-t border-border pt-4 flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="text-2xl font-bold text-[var(--bank-navy)]">
                    USD {parseFloat(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee</span>
                  <span className="font-medium">USD 0.00</span>
                </div>
                {description && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Description</span>
                    <span className="font-medium text-right max-w-[60%]">{description}</span>
                  </div>
                )}
              </div>

                <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("form")}
                  disabled={submitting}
                >
                  Go Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleConfirmTransfer}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Confirm & Send
                    </>
                  )}
                </Button>
              </div>

              <div className="h-20 md:hidden" />
            </CardContent>
          </Card>
        )}

        {/* SUCCESS STEP */}
        {step === "success" && successData && (
          <Card className="rounded-2xl border-0 bg-white shadow-sm md:rounded-xl">
            <CardContent className="pt-8 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Transfer Successful!</h2>
                <p className="text-muted-foreground">Your funds have been sent</p>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold">
                    USD {successData.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recipient</span>
                  <span className="font-medium">{successData.recipientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono text-sm tracking-wide">{successData.reference}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/dashboard")}>
                  Back to Dashboard
                </Button>
                <Button className="flex-1" onClick={handleNewTransfer}>
                  New Transfer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Transfers */}
        {step === "form" && (
          <Card className="mt-8 hidden rounded-2xl border-0 bg-white shadow-sm md:block md:rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg">Recent Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTransfers.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No recent transfers</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransfers.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm">
                          {new Date(t.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {t.description || "Transfer"}
                        </TableCell>
                        <TableCell className="font-medium">
                          ${t.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              t.status === "completed"
                                ? "bg-green-500/10 text-green-600"
                                : "bg-yellow-500/10 text-yellow-600"
                            }`}
                          >
                            {t.status}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {t.reference_number || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {step === "form" && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E7EB] bg-white p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] md:hidden">
          <Button
            className="h-[52px] w-full rounded-xl bg-[#0A1628] text-white hover:bg-[#1E3A5F]"
            onClick={handleReview}
            disabled={!fromAccountId || !recipient || !amount}
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
};

// Need this for the beneficiary "no results" Plus icon reference
const Plus = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);

export default TransferFunds;
