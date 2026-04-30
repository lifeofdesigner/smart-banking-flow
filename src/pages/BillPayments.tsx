import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Zap, Wifi, GraduationCap, Shield, Smartphone, Receipt, Loader2 } from "lucide-react";

const CATEGORIES = [
  { value: "utilities", label: "Utilities", icon: Zap },
  { value: "internet", label: "Internet", icon: Wifi },
  { value: "school_fees", label: "School Fees", icon: GraduationCap },
  { value: "insurance", label: "Insurance", icon: Shield },
  { value: "mobile_recharge", label: "Mobile Recharge", icon: Smartphone },
  { value: "general", label: "General", icon: Receipt },
];

interface BillPayment {
  id: string;
  category: string;
  provider: string;
  amount: number;
  status: string;
  reference_number: string | null;
  created_at: string;
}

interface Account {
  id: string;
  account_number: string;
  account_type: string;
  available_balance: number;
}

export default function BillPayments() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [category, setCategory] = useState("");
  const [provider, setProvider] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [acctRes, billRes] = await Promise.all([
      supabase.from("accounts").select("id, account_number, account_type, available_balance").eq("user_id", user.id).eq("status", "active"),
      supabase.from("bill_payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);

    if (acctRes.data) setAccounts(acctRes.data);
    if (billRes.data) setPayments(billRes.data);
    setLoading(false);
  };

  const handlePay = async () => {
    if (!selectedAccount || !category || !provider || !amount) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    setPaying(true);
    try {
      const { error } = await supabase.rpc("pay_bill", {
        p_account_id: selectedAccount,
        p_category: category,
        p_provider: provider,
        p_amount: parseFloat(amount),
        p_reference: reference || null,
      });
      if (error) throw error;
      toast({ title: "Bill paid successfully!" });
      setProvider(""); setAmount(""); setReference("");
      loadData();
    } catch (e: unknown) {
      toast({ title: "Payment failed", description: e.message, variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-[#F4F5F7] p-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-44" />
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const statusPill = (status: string) => {
    if (status === "completed") return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    if (status === "failed") return "bg-red-100 text-red-700 border border-red-200";
    return "bg-amber-100 text-amber-700 border border-amber-200";
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F4F5F7] px-4 py-4 md:p-6 md:space-y-6">
        <h2 className="text-2xl font-semibold text-[#0A1628] border-l-4 border-[#C9A84C] pl-3">Bill Payments</h2>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pay Form */}
          <Card className="bg-white rounded-xl shadow-sm border-0 p-6 lg:col-span-1 space-y-4">
            <h3 className="font-semibold text-lg">New Payment</h3>

            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.account_type} •••{a.account_number.slice(-4)} — ${a.available_balance.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input placeholder="Provider name" value={provider} onChange={e => setProvider(e.target.value)} />
            <Input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} min="1" step="0.01" />
            <Input placeholder="Reference (optional)" value={reference} onChange={e => setReference(e.target.value)} />

            <Button className="w-full bg-[var(--bank-navy)] hover:bg-[var(--bank-slate)]" onClick={handlePay} disabled={paying}>
              {paying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Pay Bill
            </Button>
          </Card>

          {/* Category cards */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map(c => {
                const Icon = c.icon;
                return (
                  <button key={c.value} onClick={() => setCategory(c.value)}
                    className={`rounded-xl border bg-white p-3 text-center transition-all shadow-sm ${category === c.value ? "border-2 border-[#C9A84C]" : "border-[#E6EAF0] hover:border-2 hover:border-[#C9A84C]"}`}>
                    <span className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bank-navy)]/10">
                      <Icon className="h-4 w-4 text-[var(--bank-navy)]" />
                    </span>
                    <p className="text-[11px] font-medium text-[#0A1628]">{c.label}</p>
                  </button>
                );
              })}
            </div>

            {/* Recent payments */}
            <Card className="bg-white rounded-xl shadow-sm border-0 p-6">
              <h3 className="font-semibold mb-4">Recent Payments</h3>
              {payments.length === 0 ? (
                <div className="text-center py-10">
                  <Receipt className="h-12 w-12 mx-auto text-[var(--bank-slate)] mb-3" />
                  <p className="text-lg font-semibold text-[#0A1628]">No payments yet</p>
                  <p className="text-muted-foreground text-sm">Your recent bill payments will appear here.</p>
                </div>
              ) : (
                <>
                <div className="space-y-3 md:hidden">
                  {payments.map((payment) => (
                    <div key={payment.id} className="rounded-2xl bg-[#F8FAFC] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#0A1628]">{payment.provider}</p>
                          <p className="mt-1 text-xs text-muted-foreground capitalize">
                            {payment.category.replace(/_/g, " ")} • {new Date(payment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusPill(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-red-600">
                        -${payment.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
                <Table className="hidden md:table">
                  <TableHeader>
                    <TableRow className="bg-[#0A1628] hover:bg-[#0A1628]">
                      <TableHead className="text-white">Date</TableHead>
                      <TableHead className="text-white">Provider</TableHead>
                      <TableHead className="text-white">Category</TableHead>
                      <TableHead className="text-right text-white">Amount</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id} className="border-b border-[#E6EAF0] hover:bg-[#F0F4FA]">
                        <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{p.provider}</TableCell>
                        <TableCell className="capitalize">{p.category.replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">-${p.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusPill(p.status)}`}>
                            {p.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
