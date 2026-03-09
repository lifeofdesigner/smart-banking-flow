import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Zap, Wifi, GraduationCap, Shield, Smartphone, Receipt, Loader2 } from "lucide-react";

const CATEGORIES = [
  { value: "utilities", label: "Utilities", icon: Zap },
  { value: "internet", label: "Internet", icon: Wifi },
  { value: "school_fees", label: "School Fees", icon: GraduationCap },
  { value: "insurance", label: "Insurance", icon: Shield },
  { value: "mobile_recharge", label: "Mobile Recharge", icon: Smartphone },
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
    } catch (e: any) {
      toast({ title: "Payment failed", description: e.message, variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <h2 className="text-2xl font-bold">Pay Bills</h2>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pay Form */}
          <Card className="p-6 lg:col-span-1 space-y-4">
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

            <Button className="w-full" onClick={handlePay} disabled={paying}>
              {paying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Pay Bill
            </Button>
          </Card>

          {/* Category cards */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map(c => {
                const Icon = c.icon;
                return (
                  <button key={c.value} onClick={() => setCategory(c.value)}
                    className={`p-4 rounded-xl border text-left transition-colors ${category === c.value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"}`}>
                    <Icon className="h-6 w-6 mb-2 text-primary" />
                    <p className="text-sm font-medium">{c.label}</p>
                  </button>
                );
              })}
            </div>

            {/* Recent payments */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Recent Payments</h3>
              {payments.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">No payments yet</p>
              ) : (
                <div className="space-y-3">
                  {payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <Receipt className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{p.provider}</p>
                          <p className="text-xs text-muted-foreground capitalize">{p.category.replace(/_/g, " ")} • {new Date(p.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-destructive">-${p.amount.toLocaleString()}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.status === "completed" ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"}`}>{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
