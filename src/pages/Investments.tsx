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
      const principal = parseFloat(form.amount);
      const months = parseInt(form.months);

      // Use the invest_funds RPC that properly debits the account
      const { data, error } = await (supabase.rpc as any)("invest_funds", {
        p_account_id: form.account,
        p_product_name: form.name,
        p_investment_type: form.type,
        p_amount: principal,
        p_months: months
      });

      if (error) throw error;
      toast({ title: "Investment created!", description: `$${principal.toLocaleString()} has been invested.` });
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
  const totalReturns = totalValue - totalInvested;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-[#F4F5F7] p-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-40" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <Card key={idx} className="bg-white rounded-xl shadow-sm border-0 p-4 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                </Card>
              ))}
            </div>
            <Skeleton className="h-56 w-full" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F4F5F7] p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[#0A1628] border-l-4 border-[#C9A84C] pl-3">Investments</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[var(--bank-gold)] text-[#0A1628] hover:bg-[#b9963d]"><Plus className="h-4 w-4 mr-2" />New Investment</Button>
            </DialogTrigger>
            <DialogContent className="bg-white rounded-xl shadow-sm border-0">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white rounded-xl shadow-sm border-0 p-4 border-l-4 border-l-[var(--bank-gold)]">
            <p className="text-xs text-muted-foreground">Total Invested</p>
            <p className="text-2xl font-bold text-[var(--bank-navy)]">${totalInvested.toLocaleString()}</p>
          </Card>
          <Card className="bg-white rounded-xl shadow-sm border-0 p-4 border-l-4 border-l-[var(--bank-gold)]">
            <p className="text-xs text-muted-foreground">Current Value</p>
            <p className="text-2xl font-bold text-[var(--bank-navy)]">${totalValue.toLocaleString()}</p>
          </Card>
          <Card className="bg-white rounded-xl shadow-sm border-0 p-4 border-l-4 border-l-[var(--bank-gold)]">
            <p className="text-xs text-muted-foreground">Returns</p>
            <p className={`text-2xl font-bold ${totalReturns >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {totalReturns >= 0 ? "+" : "-"}${Math.abs(totalReturns).toLocaleString()}
            </p>
          </Card>
        </div>

        {/* List */}
        {investments.length === 0 ? (
          <Card className="bg-white rounded-xl shadow-sm border-0 p-10 text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-[var(--bank-slate)]" />
            <p className="text-lg font-semibold text-[#0A1628]">No investments yet</p>
            <p className="text-muted-foreground">Start growing your wealth with your first investment.</p>
          </Card>
        ) : (
          <Card className="bg-white rounded-xl shadow-sm border-0 p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#0A1628] hover:bg-[#0A1628]">
                  <TableHead className="text-white">Product</TableHead>
                  <TableHead className="text-white">Type</TableHead>
                  <TableHead className="text-white text-right">Principal</TableHead>
                  <TableHead className="text-white text-right">Current Value</TableHead>
                  <TableHead className="text-white text-right">Returns</TableHead>
                  <TableHead className="text-white">Rate</TableHead>
                  <TableHead className="text-white">Maturity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investments.map((inv) => {
                  const returns = inv.current_value - inv.principal;
                  return (
                    <TableRow key={inv.id} className="border-b border-[#E6EAF0] hover:bg-[#F0F4FA]">
                      <TableCell className="font-semibold">{inv.product_name}</TableCell>
                      <TableCell className="capitalize">{inv.investment_type.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-right">${inv.principal.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${inv.current_value.toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-semibold ${returns >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {returns >= 0 ? "+" : "-"}${Math.abs(returns).toLocaleString()}
                      </TableCell>
                      <TableCell>{inv.interest_rate}%</TableCell>
                      <TableCell>{inv.maturity_date ? new Date(inv.maturity_date).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
