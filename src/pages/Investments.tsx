import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Loader2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Investment {
  id: string;
  product_name: string;
  investment_type: string;
  principal: number;
  current_value: number;
  interest_rate: number;
  maturity_date: string | null;
  status: string;
  created_at: string;
}

interface Account {
  id: string;
  account_number: string;
  available_balance: number;
}

const TYPES = [
  { value: "fixed_deposit", label: "Fixed Deposit" },
  { value: "money_market", label: "Money Market" },
  { value: "treasury_bills", label: "Treasury Bills" },
];

export default function InvestmentsPage() {
  const { toast } = useToast();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "fixed_deposit", amount: "", account: "", months: "12" });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [invRes, acctRes] = await Promise.all([
      supabase.from("investments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("accounts").select("id, account_number, available_balance").eq("user_id", user.id).eq("status", "active"),
    ]);
    if (invRes.data) setInvestments(invRes.data);
    if (acctRes.data) setAccounts(acctRes.data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name || !form.amount || !form.account) {
      toast({ title: "Fill all fields", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const rate = form.type === "fixed_deposit" ? 8.5 : form.type === "money_market" ? 6.0 : 4.5;
      const principal = parseFloat(form.amount);
      const maturity = new Date();
      maturity.setMonth(maturity.getMonth() + parseInt(form.months));

      const { error } = await supabase.from("investments").insert({
        user_id: user.id,
        account_id: form.account,
        product_name: form.name,
        investment_type: form.type,
        principal,
        current_value: principal,
        interest_rate: rate,
        maturity_date: maturity.toISOString().split("T")[0],
      });
      if (error) throw error;
      toast({ title: "Investment created!" });
      setOpen(false);
      setForm({ name: "", type: "fixed_deposit", amount: "", account: "", months: "12" });
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const totalInvested = investments.reduce((s, i) => s + i.principal, 0);
  const totalValue = investments.reduce((s, i) => s + i.current_value, 0);

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
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Investments</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Investment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Investment</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <Input placeholder="Investment name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={form.account} onValueChange={v => setForm(f => ({ ...f, account: v }))}>
                  <SelectTrigger><SelectValue placeholder="Fund from account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>•••{a.account_number.slice(-4)} — ${a.available_balance.toLocaleString()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                <Select value={form.months} onValueChange={v => setForm(f => ({ ...f, months: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                    <SelectItem value="24">24 months</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="w-full" onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create Investment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total Invested</p>
            <p className="text-xl font-bold">${totalInvested.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Current Value</p>
            <p className="text-xl font-bold text-green-600">${totalValue.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-xl font-bold">{investments.filter(i => i.status === "active").length}</p>
          </Card>
        </div>

        {/* List */}
        {investments.length === 0 ? (
          <Card className="p-8 text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No investments yet. Start growing your wealth!</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {investments.map(inv => (
              <Card key={inv.id} className="p-5 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{inv.product_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{inv.investment_type.replace(/_/g, " ")}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === "active" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>{inv.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Principal:</span> ${inv.principal.toLocaleString()}</div>
                  <div><span className="text-muted-foreground">Value:</span> ${inv.current_value.toLocaleString()}</div>
                  <div><span className="text-muted-foreground">Rate:</span> {inv.interest_rate}%</div>
                  <div><span className="text-muted-foreground">Maturity:</span> {inv.maturity_date ? new Date(inv.maturity_date).toLocaleDateString() : "—"}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
