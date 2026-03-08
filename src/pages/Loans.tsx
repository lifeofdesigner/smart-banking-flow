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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Banknote, Calculator, CheckCircle, Clock, DollarSign } from "lucide-react";
import { toast } from "sonner";

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

export default function Loans() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [applying, setApplying] = useState(false);
  const [selectedLoanRepayments, setSelectedLoanRepayments] = useState<Repayment[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [repaymentDialogOpen, setRepaymentDialogOpen] = useState(false);
  const [payingId, setPayingId] = useState<string>("");

  const loadData = useCallback(async (uid: string) => {
    try {
      const [productsRes, loansRes, accountsRes] = await Promise.all([
        supabase.from("loan_products").select("*").eq("is_active", true),
        supabase.from("loans").select("*, loan_products(name)").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("accounts").select("*").eq("user_id", uid).eq("status", "active"),
      ]);
      if (productsRes.data) setProducts(productsRes.data);
      if (loansRes.data) setLoans(loansRes.data as any);
      if (accountsRes.data) setAccounts(accountsRes.data);
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
      toast.error(`Amount must be between $${product.min_amount} and $${product.max_amount}`); return;
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
      toast.success("Loan application submitted!");
      setAmount(""); setSelectedProduct(""); setSelectedAccount("");
      await loadData(userId);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setApplying(false);
    }
  };

  const viewRepayments = async (loanId: string) => {
    setSelectedLoanId(loanId);
    const { data } = await supabase.from("loan_repayments").select("*").eq("loan_id", loanId).order("installment_number");
    setSelectedLoanRepayments(data || []);
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
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPayingId("");
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "default";
      case "completed": return "default";
      case "pending": return "secondary";
      case "rejected": case "defaulted": return "destructive";
      default: return "secondary";
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          <h1 className="text-3xl font-bold">Loans</h1>
        </div>

        <Tabs defaultValue="apply" className="space-y-4">
          <TabsList>
            <TabsTrigger value="apply">Apply for Loan</TabsTrigger>
            <TabsTrigger value="my-loans">My Loans ({loans.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="apply">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Product selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" />Select a Loan Product</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {products.map(p => (
                    <Card key={p.id} className={`cursor-pointer transition-all ${selectedProduct === p.id ? "ring-2 ring-primary" : "hover:border-primary/50"}`} onClick={() => setSelectedProduct(p.id)}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{p.name}</h4>
                            <p className="text-sm text-muted-foreground">{p.description}</p>
                          </div>
                          <Badge variant="secondary">{p.interest_rate}% p.a.</Badge>
                        </div>
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                          <span>${p.min_amount} - ${p.max_amount.toLocaleString()}</span>
                          <span>{p.term_months} months</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>

              {/* Application form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Loan Calculator</CardTitle>
                  <CardDescription>Enter amount and see your repayment plan</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Loan Amount ($)</label>
                    <Input type="number" placeholder={product ? `${product.min_amount} - ${product.max_amount}` : "Select a product first"} value={amount} onChange={e => setAmount(e.target.value)} disabled={!selectedProduct} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Disbursement Account</label>
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                      <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                      <SelectContent>
                        {accounts.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.account_type} - {a.account_number}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {product && parsedAmount > 0 && (
                    <Card className="bg-secondary/50">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between"><span className="text-muted-foreground">Principal</span><span className="font-semibold">${parsedAmount.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Interest Rate</span><span>{product.interest_rate}% p.a.</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Term</span><span>{product.term_months} months</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Monthly Payment</span><span className="font-bold text-primary">${monthlyPayment.toFixed(2)}</span></div>
                        <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Total Payable</span><span className="font-bold">${totalPayable.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Total Interest</span><span>${(totalPayable - parsedAmount).toFixed(2)}</span></div>
                      </CardContent>
                    </Card>
                  )}

                  <Button className="w-full" disabled={!product || parsedAmount <= 0 || !selectedAccount || applying} onClick={handleApply}>
                    {applying ? "Submitting..." : "Apply for Loan"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="my-loans">
            <Card>
              <CardHeader>
                <CardTitle>My Loans</CardTitle>
              </CardHeader>
              <CardContent>
                {loans.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No loans yet. Apply for one!</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Principal</TableHead>
                        <TableHead>Monthly</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loans.map(loan => (
                        <TableRow key={loan.id}>
                          <TableCell>{loan.loan_products?.name}</TableCell>
                          <TableCell>${loan.principal.toFixed(2)}</TableCell>
                          <TableCell>${loan.monthly_payment.toFixed(2)}</TableCell>
                          <TableCell>${loan.total_payable.toFixed(2)}</TableCell>
                          <TableCell>{loan.term_months}mo</TableCell>
                          <TableCell><Badge variant={statusColor(loan.status) as any}>{loan.status}</Badge></TableCell>
                          <TableCell>
                            {(loan.status === "active" || loan.status === "completed") && (
                              <Button size="sm" variant="outline" onClick={() => viewRepayments(loan.id)}>Repayments</Button>
                            )}
                            {loan.status === "rejected" && loan.rejection_reason && (
                              <span className="text-sm text-destructive">{loan.rejection_reason}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Repayment Schedule Dialog */}
        <Dialog open={repaymentDialogOpen} onOpenChange={setRepaymentDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Repayment Schedule</DialogTitle>
              <DialogDescription>Your amortized repayment plan</DialogDescription>
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
                  <TableRow key={r.id}>
                    <TableCell>{r.installment_number}</TableCell>
                    <TableCell>{new Date(r.due_date).toLocaleDateString()}</TableCell>
                    <TableCell>${r.principal_portion.toFixed(2)}</TableCell>
                    <TableCell>${r.interest_portion.toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">${r.amount_due.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "paid" ? "default" : "secondary"}>
                        {r.status === "paid" ? <><CheckCircle className="h-3 w-3 mr-1" />Paid</> : <><Clock className="h-3 w-3 mr-1" />Pending</>}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.status === "pending" && (
                        <Button size="sm" disabled={payingId === r.id} onClick={() => makePayment(r.id)}>
                          {payingId === r.id ? "Paying..." : "Pay"}
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
  );
}
