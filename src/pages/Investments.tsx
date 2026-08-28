import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  DollarSign,
  PieChart as PieIcon,
  Filter,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useUserAccounts } from "@/hooks/useUserAccounts";
import { isAccountUsable, getAccountStatusLabel } from "@/lib/accountStatus";
import { format, parseISO } from "date-fns";

export interface Investment {
  id: string;
  user_id?: string;
  account_id?: string | null;
  product_name: string;
  investment_type: string;
  principal: number;
  current_value: number;
  interest_rate: number;
  maturity_date: string | null;
  status: string;
  created_at: string;
}

const HISTORICAL_INVESTMENTS: Omit<Investment, "id">[] = [
  // 2020 - Good Investments
  {
    product_name: "S&P 500 Global Index Fund",
    investment_type: "money_market",
    principal: 35000,
    current_value: 58450,
    interest_rate: 11.8,
    maturity_date: "2026-04-15",
    status: "active",
    created_at: "2020-04-15T09:00:00Z",
  },
  {
    product_name: "U.S. Treasury 5-Year High-Yield Note",
    investment_type: "treasury_bills",
    principal: 25000,
    current_value: 31875,
    interest_rate: 5.5,
    maturity_date: "2025-06-10",
    status: "matured",
    created_at: "2020-06-10T10:30:00Z",
  },
  {
    product_name: "Apple & Microsoft Blue-Chip Strategy",
    investment_type: "money_market",
    principal: 20000,
    current_value: 34200,
    interest_rate: 14.2,
    maturity_date: "2025-11-20",
    status: "matured",
    created_at: "2020-11-20T14:15:00Z",
  },

  // 2021 - Mixed (Good & Bad)
  {
    product_name: "Clean Energy & Sustainability ETF",
    investment_type: "money_market",
    principal: 15000,
    current_value: 21450,
    interest_rate: 8.6,
    maturity_date: "2026-02-18",
    status: "active",
    created_at: "2021-02-18T11:00:00Z",
  },
  {
    product_name: "Commercial Real Estate REIT Fund",
    investment_type: "money_market",
    principal: 22000,
    current_value: 14300,
    interest_rate: 3.0,
    maturity_date: "2026-08-14",
    status: "active",
    created_at: "2021-08-14T13:45:00Z",
  },
  {
    product_name: "Emerging Markets Small-Cap Index",
    investment_type: "money_market",
    principal: 16000,
    current_value: 10880,
    interest_rate: 2.5,
    maturity_date: "2024-10-25",
    status: "matured",
    created_at: "2021-10-25T16:20:00Z",
  },

  // 2022 - Mixed (Bad market conditions)
  {
    product_name: "Speculative BioTech Growth Fund",
    investment_type: "money_market",
    principal: 14000,
    current_value: 7700,
    interest_rate: 1.8,
    maturity_date: "2025-03-08",
    status: "matured",
    created_at: "2022-03-08T09:30:00Z",
  },
  {
    product_name: "FinTech Disruptors Venture Basket",
    investment_type: "money_market",
    principal: 12000,
    current_value: 7440,
    interest_rate: 2.0,
    maturity_date: "2027-07-19",
    status: "active",
    created_at: "2022-07-19T15:10:00Z",
  },
  {
    product_name: "Global Macro Hedge Note (2022 Series)",
    investment_type: "fixed_deposit",
    principal: 10000,
    current_value: 7200,
    interest_rate: 2.2,
    maturity_date: "2025-11-04",
    status: "matured",
    created_at: "2022-11-04T12:00:00Z",
  },

  // 2023 - Good Recovery & Infrastructure
  {
    product_name: "Canadian Infrastructure Growth Note",
    investment_type: "fixed_deposit",
    principal: 18000,
    current_value: 20700,
    interest_rate: 6.0,
    maturity_date: "2027-01-10",
    status: "active",
    created_at: "2023-01-10T10:00:00Z",
  },
  {
    product_name: "Global Semiconductor & AI Growth Fund",
    investment_type: "money_market",
    principal: 12500,
    current_value: 19375,
    interest_rate: 15.4,
    maturity_date: "2028-05-12",
    status: "active",
    created_at: "2023-05-12T14:40:00Z",
  },

  // 2024 - 2025 - Recent Investments
  {
    product_name: "Consumer Discretionary Retail ETF",
    investment_type: "money_market",
    principal: 8500,
    current_value: 6970,
    interest_rate: 2.8,
    maturity_date: "2026-02-15",
    status: "active",
    created_at: "2024-02-15T09:15:00Z",
  },
  {
    product_name: "Berkshire Core Equity Strategy",
    investment_type: "money_market",
    principal: 22000,
    current_value: 25740,
    interest_rate: 8.5,
    maturity_date: "2027-03-20",
    status: "active",
    created_at: "2024-03-20T11:30:00Z",
  },
  {
    product_name: "North American 2-Year Guaranteed Certificate",
    investment_type: "fixed_deposit",
    principal: 15000,
    current_value: 16050,
    interest_rate: 5.2,
    maturity_date: "2027-01-15",
    status: "active",
    created_at: "2025-01-15T08:45:00Z",
  },
];

const TYPES = [
  { value: "fixed_deposit", label: "Fixed Deposit" },
  { value: "money_market", label: "Money Market / ETF" },
  { value: "treasury_bills", label: "Treasury Bills & Bonds" },
];

export default function InvestmentsPage() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const { accounts, hasUsableAccount } = useUserAccounts(userId);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date_desc");
  const [form, setForm] = useState({
    name: "",
    type: "fixed_deposit",
    amount: "",
    account: "",
    months: "12",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const invRes = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (invRes.data && invRes.data.length > 0) {
        setInvestments(invRes.data as Investment[]);
      } else {
        // Automatically populate with curated 2020-2025 investments for user
        const primaryAccount = (
          await supabase.from("accounts").select("id").eq("user_id", user.id).limit(1).maybeSingle()
        )?.data?.id || null;

        const itemsToInsert = HISTORICAL_INVESTMENTS.map((item) => ({
          ...item,
          user_id: user.id,
          account_id: primaryAccount,
        }));

        const { data: seeded, error: seedError } = await supabase
          .from("investments")
          .insert(itemsToInsert)
          .select("*");

        if (!seedError && seeded && seeded.length > 0) {
          setInvestments(seeded as Investment[]);
        } else {
          // Fallback to local historical investments if DB insert is restricted
          setInvestments(
            HISTORICAL_INVESTMENTS.map((item, i) => ({
              ...item,
              id: `seed-${i + 1}`,
              user_id: user.id,
              account_id: primaryAccount,
            }))
          );
        }
      }
    } catch (e) {
      console.error("Error loading investments", e);
    } finally {
      setLoading(false);
    }
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

      const { error } = await (supabase.rpc as unknown)("invest_funds", {
        p_account_id: form.account,
        p_product_name: form.name,
        p_investment_type: form.type,
        p_amount: principal,
        p_months: months,
      });

      if (error) throw error;
      toast({
        title: "Investment created!",
        description: `$${principal.toLocaleString()} has been invested in ${form.name}.`,
      });
      setOpen(false);
      setForm({ name: "", type: "fixed_deposit", amount: "", account: "", months: "12" });
      loadData();
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to create investment",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const totalInvested = useMemo(() => investments.reduce((s, i) => s + (i.principal || 0), 0), [investments]);
  const totalValue = useMemo(() => investments.reduce((s, i) => s + (i.current_value || 0), 0), [investments]);
  const totalReturns = totalValue - totalInvested;
  const overallROI = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  const gainers = useMemo(() => investments.filter((i) => i.current_value >= i.principal), [investments]);
  const losers = useMemo(() => investments.filter((i) => i.current_value < i.principal), [investments]);

  // Filtered and sorted investments
  const displayedInvestments = useMemo(() => {
    let list = [...investments];

    if (filterType === "good") {
      list = list.filter((i) => i.current_value > i.principal);
    } else if (filterType === "bad") {
      list = list.filter((i) => i.current_value < i.principal);
    } else if (filterType === "active") {
      list = list.filter((i) => i.status === "active");
    } else if (filterType === "matured") {
      list = list.filter((i) => i.status === "matured");
    }

    if (sortBy === "date_desc") {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "date_asc") {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "return_desc") {
      list.sort((a, b) => (b.current_value - b.principal) - (a.current_value - a.principal));
    } else if (sortBy === "return_asc") {
      list.sort((a, b) => (a.current_value - a.principal) - (b.current_value - b.principal));
    } else if (sortBy === "value_desc") {
      list.sort((a, b) => b.current_value - a.current_value);
    }

    return list;
  }, [investments, filterType, sortBy]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-[#F4F5F7] p-6 space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx} className="bg-white rounded-xl shadow-sm border-0 p-5 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </Card>
            ))}
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F4F5F7] px-4 py-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0A1628] border-l-4 border-[#C9A84C] pl-3">
              Investment Portfolio
            </h1>
            <p className="text-sm text-muted-foreground">
              Historical performance, active assets (2020–2025), and wealth management.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-[var(--bank-gold)] text-[#0A1628] hover:bg-[#b9963d] font-semibold h-11"
                disabled={!hasUsableAccount}
                title={!hasUsableAccount ? "Requires at least one active account" : undefined}
              >
                <Plus className="h-4 w-4 mr-2" /> New Investment
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white rounded-xl shadow-sm border-0 sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Initiate New Investment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Product / Asset Name</label>
                  <Input
                    placeholder="e.g. High Yield Treasury Note"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Asset Class</label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Funding Account</label>
                  <Select value={form.account} onValueChange={(v) => setForm((f) => ({ ...f, account: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select funding account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id} disabled={!isAccountUsable(a.status)}>
                          •••{a.account_number.slice(-4)} — ${a.computed_balance.toLocaleString()}
                          {!isAccountUsable(a.status) ? ` — ${getAccountStatusLabel(a.status)}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Investment Amount (USD)</label>
                  <Input
                    type="number"
                    placeholder="5000.00"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Duration / Lock-in Term</label>
                  <Select value={form.months} onValueChange={(v) => setForm((f) => ({ ...f, months: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Months</SelectItem>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">12 Months (1 Year)</SelectItem>
                      <SelectItem value="24">24 Months (2 Years)</SelectItem>
                      <SelectItem value="36">36 Months (3 Years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full h-11 bg-[var(--bank-navy)] text-white hover:bg-[var(--bank-slate)] mt-2" onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Confirm Investment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Portfolio Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white rounded-xl shadow-sm border-0 p-5 border-l-4 border-l-[var(--bank-navy)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Portfolio Value</span>
              <div className="p-2 rounded-lg bg-slate-100 text-[#0A1628]">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#0A1628] mt-2">
              ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Across {investments.length} total holdings
            </p>
          </Card>

          <Card className="bg-white rounded-xl shadow-sm border-0 p-5 border-l-4 border-l-[var(--bank-gold)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Invested</span>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-800">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#0A1628] mt-2">
              ${totalInvested.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Cumulative principal capital</p>
          </Card>

          <Card className="bg-white rounded-xl shadow-sm border-0 p-5 border-l-4 border-l-emerald-600">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Net Profit / Returns</span>
              <div className={`p-2 rounded-lg ${totalReturns >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                {totalReturns >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <p className={`text-2xl font-bold ${totalReturns >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {totalReturns >= 0 ? "+" : "-"}${Math.abs(totalReturns).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <Badge className={totalReturns >= 0 ? "bg-emerald-100 text-emerald-800 border-0" : "bg-red-100 text-red-800 border-0"}>
                {overallROI >= 0 ? "+" : ""}{overallROI.toFixed(1)}% ROI
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total lifetime gain / loss</p>
          </Card>

          <Card className="bg-white rounded-xl shadow-sm border-0 p-5 border-l-4 border-l-blue-600">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Holdings Health</span>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <PieIcon className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm font-bold text-emerald-600 flex items-center">
                <ArrowUpRight className="w-4 h-4 mr-0.5" /> {gainers.length} Gainers
              </span>
              <span className="text-sm font-bold text-red-600 flex items-center">
                <ArrowDownRight className="w-4 h-4 mr-0.5" /> {losers.length} Losers
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {investments.filter((i) => i.status === "active").length} active &bull; {investments.filter((i) => i.status === "matured").length} matured
            </p>
          </Card>
        </div>

        {/* Filter and Sorting Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={filterType === "all" ? "default" : "outline"}
              className={filterType === "all" ? "bg-[var(--bank-navy)] text-white" : ""}
              onClick={() => setFilterType("all")}
            >
              All ({investments.length})
            </Button>
            <Button
              size="sm"
              variant={filterType === "good" ? "default" : "outline"}
              className={filterType === "good" ? "bg-emerald-700 text-white" : "text-emerald-700 border-emerald-200"}
              onClick={() => setFilterType("good")}
            >
              <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Profitable ({gainers.length})
            </Button>
            <Button
              size="sm"
              variant={filterType === "bad" ? "default" : "outline"}
              className={filterType === "bad" ? "bg-red-700 text-white" : "text-red-700 border-red-200"}
              onClick={() => setFilterType("bad")}
            >
              <ArrowDownRight className="w-3.5 h-3.5 mr-1" /> Underperforming ({losers.length})
            </Button>
            <Button
              size="sm"
              variant={filterType === "active" ? "default" : "outline"}
              className={filterType === "active" ? "bg-slate-800 text-white" : ""}
              onClick={() => setFilterType("active")}
            >
              Active ({investments.filter((i) => i.status === "active").length})
            </Button>
            <Button
              size="sm"
              variant={filterType === "matured" ? "default" : "outline"}
              className={filterType === "matured" ? "bg-slate-800 text-white" : ""}
              onClick={() => setFilterType("matured")}
            >
              Matured ({investments.filter((i) => i.status === "matured").length})
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Sort by:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-[170px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Date: Newest First</SelectItem>
                <SelectItem value="date_asc">Date: Oldest First (2020)</SelectItem>
                <SelectItem value="return_desc">Highest Return ($)</SelectItem>
                <SelectItem value="return_asc">Lowest Return ($)</SelectItem>
                <SelectItem value="value_desc">Highest Value</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Investment List */}
        {displayedInvestments.length === 0 ? (
          <Card className="bg-white rounded-xl shadow-sm border-0 p-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-[var(--bank-slate)]" />
            <p className="text-lg font-semibold text-[#0A1628]">No matching investments</p>
            <p className="text-sm text-muted-foreground mt-1">Try switching your filter selection.</p>
            <Button onClick={() => setFilterType("all")} variant="outline" className="mt-4">
              Clear Filters
            </Button>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-xl border-0 bg-white p-0 shadow-sm">
            {/* Mobile Card View */}
            <div className="space-y-3 p-4 md:hidden">
              {displayedInvestments.map((investment) => {
                const returns = investment.current_value - investment.principal;
                const roi = investment.principal > 0 ? (returns / investment.principal) * 100 : 0;
                const isGood = returns >= 0;

                return (
                  <div
                    key={`mobile-${investment.id}`}
                    className={`rounded-2xl border p-4 ${
                      isGood ? "bg-[#F8FCF9] border-emerald-100" : "bg-[#FFF9F9] border-red-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-[#0A1628]">{investment.product_name}</p>
                        </div>
                        <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
                          {investment.investment_type.replace(/_/g, " ")} &bull; Started {format(parseISO(investment.created_at), "MMM yyyy")}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          investment.status === "active"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]"
                            : "bg-slate-100 text-slate-700 border-slate-200 text-[10px]"
                        }
                      >
                        {investment.status}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Principal</p>
                        <p className="font-semibold text-[#0A1628]">
                          ${investment.principal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Current Value</p>
                        <p className="font-bold text-[#0A1628]">
                          ${investment.current_value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Rate: {investment.interest_rate}% p.a.</span>
                      <span className={`text-sm font-bold flex items-center ${isGood ? "text-emerald-600" : "text-red-600"}`}>
                        {isGood ? <ArrowUpRight className="w-4 h-4 mr-0.5" /> : <ArrowDownRight className="w-4 h-4 mr-0.5" />}
                        {isGood ? "+" : "-"}${Math.abs(returns).toLocaleString("en-US", { minimumFractionDigits: 2 })} ({roi >= 0 ? "+" : ""}{roi.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow className="bg-[#0A1628] hover:bg-[#0A1628]">
                  <TableHead className="text-white">Product / Holding</TableHead>
                  <TableHead className="text-white">Asset Class</TableHead>
                  <TableHead className="text-white">Start Date</TableHead>
                  <TableHead className="text-white text-right">Principal</TableHead>
                  <TableHead className="text-white text-right">Current Value</TableHead>
                  <TableHead className="text-white text-right">Net Return (ROI)</TableHead>
                  <TableHead className="text-white text-center">Interest Rate</TableHead>
                  <TableHead className="text-white">Maturity</TableHead>
                  <TableHead className="text-white text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedInvestments.map((inv) => {
                  const returns = inv.current_value - inv.principal;
                  const roi = inv.principal > 0 ? (returns / inv.principal) * 100 : 0;
                  const isGood = returns >= 0;

                  return (
                    <TableRow key={inv.id} className="border-b border-[#E6EAF0] hover:bg-[#F0F4FA]">
                      <TableCell className="font-semibold text-[#0A1628]">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${isGood ? "bg-emerald-500" : "bg-red-500"}`}
                          />
                          <span>{inv.product_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-slate-600 text-xs">
                        {inv.investment_type.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {format(parseISO(inv.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${inv.principal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-[#0A1628]">
                        ${inv.current_value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex items-center font-bold text-sm ${
                            isGood ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {isGood ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                          {isGood ? "+" : "-"}${Math.abs(returns).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          <span className="text-xs ml-1 font-semibold">
                            ({roi >= 0 ? "+" : ""}{roi.toFixed(1)}%)
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-xs text-slate-700">
                        {inv.interest_rate}%
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {inv.maturity_date ? format(parseISO(inv.maturity_date), "MMM d, yyyy") : "Open-ended"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            inv.status === "active"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 text-xs"
                              : "bg-slate-100 text-slate-700 border-slate-200 text-xs"
                          }
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
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
