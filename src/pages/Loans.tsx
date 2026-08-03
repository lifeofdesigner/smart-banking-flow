import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { BadgeProps } from "@/components/ui/badge";
import { ArrowLeft, Banknote, Calculator, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { useIsMobile } from "@/hooks/use-mobile";
import DashboardLayout from "@/components/DashboardLayout";
import { useUserAccounts } from "@/hooks/useUserAccounts";
import { isAccountUsable, getAccountStatusLabel } from "@/lib/accountStatus";

interface LoanProduct {
  id: string;
  name: string;
  description: string;
  interest_rate: number;
  min_amount: number;
  max_amount: number;
  term_months: number;
}

interface Loan {
  id: string;
  principal: number;
  interest_rate: number;
  total_payable: number;
  monthly_payment: number;
  term_months: number;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  approved_at: string | null;
  loan_products?: { name: string };
}

interface Repayment {
  id: string;
  installment_number: number;
  amount_due: number;
  principal_portion: number;
  interest_portion: number;
  amount_paid: number;
  due_date: string;
  paid_at: string | null;
  status: string;
}

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

export default function Loans() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const { accounts, hasUsableAccount } = useUserAccounts(userId || null);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [applying, setApplying] = useState(false);
  const [selectedLoanRepayments, setSelectedLoanRepayments] = useState<Repayment[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [repaymentDialogOpen, setRepaymentDialogOpen] = useState(false);
  const [payingId, setPayingId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("apply");

  const loadData = useCallback(async (uid: string) => {
    try {
      const [productsRes, loansRes] = await Promise.all([
        supabase.from("loan_products").select("*").eq("is_active", true),
        supabase.from("loans").select("*, loan_products(name)").eq("user_id", uid).order("created_at", { ascending: false }),
      ]);
      if (productsRes.data) setProducts(productsRes.data as Tables<"loan_products">[]);
      if (loansRes.data) setLoans(loansRes.data as Loan[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserId(user.id);
      await loadData(user.id);
    };
    init();
  }, [navigate, loadData]);

  const product = products.find(p => p.id === selectedProduct);
  const parsedAmount = parseFloat(amount) || 0;
  const monthlyRate = product ? product.interest_rate / 100 / 12 : 0;
  const monthlyPayment = product && parsedAmount > 0
    ? (parsedAmount * monthlyRate * Math.pow(1 + monthlyRate, product.term_months)) / (Math.pow(1 + monthlyRate, product.term_months) - 1)
    : 0;
  const totalPayable = product ? monthlyPayment * product.term_months : 0;

  const handleApply = async () => {
    if (!product || parsedAmount <= 0 || !selectedAccount) {
      toast.error("Please fill all fields"); return;
    }
    if (parsedAmount < product.min_amount || parsedAmount > product.max_amount) {
      toast.error(`Amount must be between $${product.min_amount} and $${product.max_amount.toLocaleString()}`); return;
    }
    setApplying(true);
    try {
      const { error } = await supabase.from("loans").insert({
        user_id: userId,
        product_id: product.id,
        principal: parsedAmount,
        interest_rate: product.interest_rate,
        total_payable: Math.round(totalPayable * 100) / 100,
        monthly_payment: Math.round(monthlyPayment * 100) / 100,
        term_months: product.term_months,
        disbursement_account_id: selectedAccount,
      });
      if (error) throw error;
      toast.success("Loan application submitted! Awaiting admin review.");
      setAmount(""); setSelectedProduct(""); setSelectedAccount("");
      await loadData(userId);
    } catch (e: unknown) {
      toast.error(e.message);
    } finally {
      setApplying(false);
    }
  };

  const viewRepayments = async (loanId: string) => {
    setSelectedLoanId(loanId);
    const { data } = await supabase.from("loan_repayments").select("*").eq("loan_id", loanId).order("installment_number");
    setSelectedLoanRepayments((data || []) as Repayment[]);
    setRepaymentDialogOpen(true);
  };

  const makePayment = async (repaymentId: string) => {
    setPayingId(repaymentId);
    try {
      const { data, error } = await supabase.rpc("make_loan_repayment", {
        p_repayment_id: repaymentId, p_user_id: userId,
      });
      if (error) throw error;
      toast.success(data as string);
      await viewRepayments(selectedLoanId);
      await loadData(userId);
    } catch (e: unknown) {
      toast.error(e.message);
    } finally {
      setPayingId("");
    }
  };

  const statusColor = (s: string): BadgeVariant => {
    switch (s) {
      case "active": return "default";
      case "completed": return "secondary";
      case "pending": return "outline";
      case "rejected":
      case "defaulted":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-700 border border-amber-200";
      case "active":
        return "bg-emerald-100 text-emerald-700 border border-emerald-200";
      case "completed":
        return "bg-slate-100 text-slate-700 border border-slate-200";
      case "rejected":
      case "defaulted":
        return "bg-red-100 text-red-700 border border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border border-slate-200";
    }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F4F5F7] px-4 py-4 md:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Card key={idx} className="space-y-3 rounded-xl border-0 bg-white p-5 shadow-sm">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-9 w-full" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-[#F4F5F7] px-4 py-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 hidden items-center gap-4 md:flex">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
          <h1 className="text-2xl font-semibold text-[#0A1628] border-l-4 border-[#C9A84C] pl-3">Loan Services</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="apply">Apply for Loan</TabsTrigger>
            <TabsTrigger value="my-loans">My Loans ({loans.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="apply">
            <div className="grid gap-4 md:grid-cols-2 md:gap-6">
              {/* Product selection */}
              <Card className="bg-white rounded-xl shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5" />Select a Loan Product
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="md:hidden overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex min-w-max gap-3">
                      {products.map(p => (
                        <Card
                          key={`mobile-${p.id}`}
                          className={`w-[85vw] max-w-[320px] cursor-pointer rounded-2xl border-0 bg-white p-4 shadow-sm ${selectedProduct === p.id ? "ring-2 ring-[var(--bank-gold)]" : ""}`}
                          onClick={() => setSelectedProduct(p.id)}
                        >
                          <CardContent className="p-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="font-semibold">{p.name}</h4>
                                <p className="text-xs text-muted-foreground">{p.description}</p>
                              </div>
                              <p className="text-xl font-bold text-[var(--bank-navy)]">{p.interest_rate}%</p>
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground">
                              ${p.min_amount.toLocaleString()} – ${p.max_amount.toLocaleString()} • {p.term_months} months
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="hidden space-y-3 md:block">
                    {products.map(p => (
                    <Card
                      key={p.id}
                      className={`cursor-pointer transition-all bg-white rounded-xl shadow-sm border-0 ${selectedProduct === p.id ? "ring-2 ring-[var(--bank-gold)]" : "hover:ring-1 hover:ring-[var(--bank-gold)]"}`}
                      onClick={() => setSelectedProduct(p.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{p.name}</h4>
                            <p className="text-sm text-muted-foreground">{p.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-[var(--bank-navy)]">{p.interest_rate}%</p>
                            <p className="text-xs text-muted-foreground">p.a.</p>
                          </div>
                        </div>
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                          <span>${p.min_amount.toLocaleString()} – ${p.max_amount.toLocaleString()}</span>
                          <span>{p.term_months} months</span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="mt-4 bg-[var(--bank-gold)] text-[var(--bank-navy)] hover:bg-[#b9963d]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(p.id);
                          }}
                        >
                          Apply
                        </Button>
                      </CardContent>
                    </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Application form + calculator */}
              <Card className="bg-white rounded-xl shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />Loan Calculator &amp; Application
                  </CardTitle>
                  <CardDescription>Enter amount to see your repayment breakdown</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Loan Amount ($)</label>
                    <Input
                      type="number"
                      placeholder={product ? `${product.min_amount} – ${product.max_amount}` : "Select a product first"}
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      disabled={!selectedProduct}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Disbursement Account</label>
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                      <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                      <SelectContent>
                        {accounts.map(a => (
                          <SelectItem key={a.id} value={a.id} disabled={!isAccountUsable(a.status)}>
                            {a.account_type} — {a.account_number}
                            {!isAccountUsable(a.status) ? ` — ${getAccountStatusLabel(a.status)}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {product && parsedAmount > 0 && (
                    <Card className="bg-white rounded-xl shadow-sm border-0">
                      <CardContent className="p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Principal</span>
                          <span className="font-semibold">${parsedAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Interest Rate</span>
                          <span>{product.interest_rate}% p.a.</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Term</span>
                          <span>{product.term_months} months</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-muted-foreground">Monthly Payment</span>
                            <span className="font-bold text-[var(--bank-navy)] text-base">${monthlyPayment.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Payable</span>
                          <span className="font-bold">${totalPayable.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Interest</span>
                          <span className="text-destructive">${(totalPayable - parsedAmount).toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Button
                    className="hidden w-full md:inline-flex"
                    disabled={!product || parsedAmount <= 0 || !selectedAccount || applying}
                    onClick={handleApply}
                  >
                    {applying ? "Submitting..." : "Submit Loan Application"}
                  </Button>

                  <div className="h-16 md:hidden" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="my-loans">
            <Card className="bg-white rounded-xl shadow-sm border-0">
              <CardHeader>
                <CardTitle>My Loans</CardTitle>
                <CardDescription>Track your active and past loans</CardDescription>
              </CardHeader>
              <CardContent>
                {loans.length === 0 ? (
                  <div className="text-center py-12">
                    <Banknote className="h-12 w-12 mx-auto text-[var(--bank-slate)] mb-3" />
                    <p className="text-lg font-semibold text-[#0A1628]">No active loans</p>
                    <p className="text-muted-foreground">Apply for a loan product to get started.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 md:hidden">
                      {loans.map((loan) => (
                        <Card key={`mobile-loan-${loan.id}`} className="rounded-2xl border-0 bg-white p-4 shadow-sm">
                          <CardContent className="p-0 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-[#0A1628]">{loan.loan_products?.name}</p>
                              <Badge variant={statusColor(loan.status)} className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusBadgeClass(loan.status)}`}>{loan.status}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <p className="text-muted-foreground">Principal</p>
                              <p className="text-right font-semibold">${loan.principal.toFixed(2)}</p>
                              <p className="text-muted-foreground">Monthly</p>
                              <p className="text-right font-semibold">${loan.monthly_payment.toFixed(2)}</p>
                              <p className="text-muted-foreground">Total</p>
                              <p className="text-right font-semibold">${loan.total_payable.toFixed(2)}</p>
                            </div>
                            {(loan.status === "active" || loan.status === "completed") && (
                              <Button className="min-h-[44px] w-full rounded-xl" variant="outline" onClick={() => viewRepayments(loan.id)}>
                                Repayments
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Table className="hidden md:table">
                    <TableHeader>
                      <TableRow className="bg-[#0A1628] hover:bg-[#0A1628]">
                        <TableHead className="text-white">Product</TableHead>
                        <TableHead className="text-white">Principal</TableHead>
                        <TableHead className="text-white">Monthly</TableHead>
                        <TableHead className="text-white">Total</TableHead>
                        <TableHead className="text-white">Term</TableHead>
                        <TableHead className="text-white">Status</TableHead>
                        <TableHead className="text-white">Applied</TableHead>
                        <TableHead className="text-white">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loans.map(loan => (
                        <TableRow key={loan.id} className="border-b border-[#E6EAF0] hover:bg-[#F0F4FA]">
                          <TableCell>{loan.loan_products?.name}</TableCell>
                          <TableCell>${loan.principal.toFixed(2)}</TableCell>
                          <TableCell>${loan.monthly_payment.toFixed(2)}</TableCell>
                          <TableCell>${loan.total_payable.toFixed(2)}</TableCell>
                          <TableCell>{loan.term_months}mo</TableCell>
                          <TableCell>
                            <Badge variant={statusColor(loan.status)} className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusBadgeClass(loan.status)}`}>{loan.status}</Badge>
                          </TableCell>
                          <TableCell>{new Date(loan.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {(loan.status === "active" || loan.status === "completed") && (
                              <Button size="sm" variant="outline" onClick={() => viewRepayments(loan.id)}>
                                Repayments
                              </Button>
                            )}
                            {loan.status === "rejected" && loan.rejection_reason && (
                              <span className="text-sm text-destructive">{loan.rejection_reason}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {isMobile && activeTab === "apply" && selectedProduct && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E7EB] bg-white p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] md:hidden">
            <Button
              className="h-[52px] w-full rounded-xl bg-[#0A1628] text-white hover:bg-[#1E3A5F]"
              disabled={!product || parsedAmount <= 0 || !selectedAccount || applying}
              onClick={handleApply}
            >
              {applying ? "Submitting..." : "Submit Loan Application"}
            </Button>
          </div>
        )}

        {/* Repayment Schedule Dialog */}
        <Dialog open={repaymentDialogOpen} onOpenChange={setRepaymentDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-white rounded-xl shadow-sm border-0">
            <DialogHeader>
              <DialogTitle>Repayment Schedule</DialogTitle>
              <DialogDescription>Your amortized monthly repayment plan</DialogDescription>
            </DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Total Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedLoanRepayments.map(r => (
                  <TableRow key={r.id} className={r.status === "paid" ? "opacity-60" : ""}>
                    <TableCell>{r.installment_number}</TableCell>
                    <TableCell>{new Date(r.due_date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium text-[var(--bank-slate)]">${r.principal_portion.toFixed(2)}</TableCell>
                    <TableCell className="font-medium text-[var(--bank-slate)]">${r.interest_portion.toFixed(2)}</TableCell>
                    <TableCell className="font-semibold text-[var(--bank-navy)]">${r.amount_due.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "paid" ? "default" : "secondary"}>
                        {r.status === "paid"
                          ? <><CheckCircle className="h-3 w-3 mr-1 inline" />Paid</>
                          : <><Clock className="h-3 w-3 mr-1 inline" />Pending</>
                        }
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.status === "pending" && (
                        <Button size="sm" disabled={payingId === r.id} onClick={() => makePayment(r.id)}>
                          {payingId === r.id ? "Paying..." : "Pay Now"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </DashboardLayout>
  );
}
