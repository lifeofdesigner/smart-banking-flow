import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { CalendarIcon, Download, FileText, Search, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
  reference_number: string;
  account_id: string;
}

interface Account {
  id: string;
  account_number: string;
}

const PAGE_SIZE = 10;

export default function TransactionHistory() {
  const isMobile = useIsMobile();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [mobileTransactions, setMobileTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const transactionTypes = [
    "all", "transfer", "wire_transfer", "deposit", "withdrawal", 
    "fee", "loan_disbursement", "loan_repayment"
  ];

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Get user accounts first
    const { data: userAccountsData, error: accError } = await supabase
      .from("accounts")
      .select("id, account_number")
      .eq("user_id", user.id);

    if (accError) {
      toast.error(accError.message);
      setLoading(false);
      return;
    }

    if (userAccountsData) {
      setAccounts(userAccountsData);
      const accountIds = userAccountsData.map(a => a.id);

      if (accountIds.length === 0) {
        setTransactions([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("transactions")
        .select("*", { count: "exact" })
        .in("account_id", selectedAccount === "all" ? accountIds : [selectedAccount])
        .order("created_at", { ascending: false });

      // Apply filters
      if (selectedType !== "all") {
        query = query.eq("transaction_type", selectedType);
      }
      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }
      if (minAmount) {
        query = query.gte("amount", parseFloat(minAmount));
      }
      if (maxAmount) {
        query = query.lte("amount", parseFloat(maxAmount));
      }
      if (searchTerm) {
        query = query.or(`description.ilike.%${searchTerm}%,reference_number.ilike.%${searchTerm}%`);
      }

      // Pagination
      const from = (currentPage - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, count, error: txError } = await query;
      if (txError) {
        toast.error(txError.message);
        setLoading(false);
        return;
      }
      if (data) setTransactions(data);
      if (data) {
        if (isMobile && currentPage > 1) {
          setMobileTransactions((prev) => [...prev, ...data]);
        } else {
          setMobileTransactions(data);
        }
      }
      if (count !== null) setTotalCount(count);
    }
    setLoading(false);
  }, [currentPage, searchTerm, selectedType, selectedAccount, startDate, endDate, minAmount, maxAmount, isMobile]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedType("all");
    setSelectedAccount("all");
    setStartDate(undefined);
    setEndDate(undefined);
    setMinAmount("");
    setMaxAmount("");
    setCurrentPage(1);
    setMobileTransactions([]);
  };

  const exportCSV = () => {
    const headers = ["Date", "Type", "Amount", "Status", "Description", "Reference"];
    const rows = transactions.map(t => [
      format(new Date(t.created_at), "yyyy-MM-dd HH:mm"),
      t.transaction_type,
      t.amount.toString(),
      t.status,
      t.description || "",
      t.reference_number || ""
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    window.print();
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const displayedTransactions = isMobile ? mobileTransactions : transactions;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-100 text-emerald-700 border border-emerald-200";
      case "pending": return "bg-amber-100 text-amber-700 border border-amber-200";
      case "failed": return "bg-red-100 text-red-700 border border-red-200";
      default: return "bg-slate-100 text-slate-700 border border-slate-200";
    }
  };

  const getTypePill = (type: string) => {
    if (type.includes("deposit") || type === "loan_disbursement") {
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    }
    if (type.includes("fee")) {
      return "bg-amber-100 text-amber-700 border border-amber-200";
    }
    return "bg-slate-100 text-slate-700 border border-slate-200";
  };

  const hasFilters = searchTerm || selectedType !== "all" || selectedAccount !== "all" || 
    startDate || endDate || minAmount || maxAmount;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F4F5F7] px-4 py-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#0A1628] border-l-4 border-[#C9A84C] pl-3">Transaction History</h1>
            <p className="text-muted-foreground">View and export your transactions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="min-h-[44px] border-[var(--bank-navy)] text-[var(--bank-navy)] hover:bg-[var(--bank-navy)] hover:text-white" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" className="min-h-[44px] border-[var(--bank-navy)] text-[var(--bank-navy)] hover:bg-[var(--bank-navy)] hover:text-white" onClick={exportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Print/PDF
            </Button>
          </div>
        </div>

        {/* Mobile filter chips */}
        <div className="mb-4 overflow-x-auto pb-1 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-center gap-2">
            {[
              { label: "All", value: "all" },
              { label: "Deposits", value: "deposit" },
              { label: "Withdrawals", value: "withdrawal" },
              { label: "Transfers", value: "transfer" },
              { label: "Bills", value: "fee" },
            ].map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => {
                  setSelectedType(chip.value);
                  setCurrentPage(1);
                  setMobileTransactions([]);
                }}
                className={cn(
                  "min-h-[44px] rounded-full border px-4 text-sm font-medium",
                  selectedType === chip.value
                    ? "border-[#0A1628] bg-[#0A1628] text-white"
                    : "border-[#E5E7EB] bg-white text-[#6B7280]"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 hidden bg-white rounded-xl shadow-sm border-0 md:block">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search description or reference..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-10"
                />
              </div>

              <Select value={selectedType} onValueChange={(v) => { setSelectedType(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Transaction Type" />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypes.map(type => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type === "all" ? "All Types" : type.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedAccount} onValueChange={(v) => { setSelectedAccount(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PP") : "From Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={(d) => { setStartDate(d); setCurrentPage(1); }} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PP") : "To Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={(d) => { setEndDate(d); setCurrentPage(1); }} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>

              <Input
                type="number"
                placeholder="Min Amount"
                value={minAmount}
                onChange={(e) => { setMinAmount(e.target.value); setCurrentPage(1); }}
              />

              <Input
                type="number"
                placeholder="Max Amount"
                value={maxAmount}
                onChange={(e) => { setMaxAmount(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="bg-white rounded-xl shadow-sm border-0 print:shadow-none">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-12 w-full" />
                ))}
              </div>
            ) : displayedTransactions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-[var(--bank-slate)] mb-4" />
                <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or selecting a wider date range.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 p-3 md:hidden">
                  {displayedTransactions.map((tx) => {
                    const credit = tx.transaction_type.includes("deposit") || tx.transaction_type === "loan_disbursement";
                    return (
                      <div key={tx.id} className="rounded-2xl bg-white p-3 shadow-sm">
                        <div className="flex min-h-[56px] items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className={cn("inline-flex h-11 w-11 items-center justify-center rounded-full", credit ? "bg-emerald-100" : "bg-red-100")}>
                              {credit ? <ArrowDownRight className="h-4 w-4 text-emerald-700" /> : <ArrowUpRight className="h-4 w-4 text-red-700" />}
                            </span>
                            <div>
                              <p className="text-[13px] font-semibold text-[#0A1628]">{tx.description || tx.transaction_type.replace(/_/g, " ")}</p>
                              <p className="text-[11px] text-muted-foreground">{format(new Date(tx.created_at), "MMM dd, yyyy")}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn("text-sm font-semibold", credit ? "text-emerald-700" : "text-red-700")}>
                              {credit ? "+" : "-"}${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </p>
                            <Badge className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${getStatusColor(tx.status)}`}>
                              {tx.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Table className="hidden md:table">
                  <TableHeader>
                    <TableRow className="bg-[#0A1628] hover:bg-[#0A1628]">
                      <TableHead className="text-white">Date</TableHead>
                      <TableHead className="text-white">Type</TableHead>
                      <TableHead className="text-white">Description</TableHead>
                      <TableHead className="text-white">Reference</TableHead>
                      <TableHead className="text-right text-white">Amount</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id} className="border-b border-[#E6EAF0] hover:bg-[#F0F4FA]">
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(tx.created_at), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${getTypePill(tx.transaction_type)}`}>
                            {tx.transaction_type.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {tx.description || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {tx.reference_number || "-"}
                        </TableCell>
                        <TableCell className={cn("text-right font-semibold whitespace-nowrap",
                          tx.transaction_type.includes("deposit") || tx.transaction_type === "loan_disbursement"
                            ? "text-green-600"
                            : "text-red-600"
                        )}>
                          {tx.transaction_type.includes("deposit") || tx.transaction_type === "loan_disbursement" ? "+" : "-"}
                          ${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Badge className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${getStatusColor(tx.status)}`}>{tx.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t print:hidden">
                    <p className="hidden text-sm text-muted-foreground md:block">
                      Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} transactions
                    </p>
                    <Pagination className="hidden md:block">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className={cn(
                                  "cursor-pointer",
                                  currentPage === page && "bg-[var(--bank-navy)] text-white hover:bg-[var(--bank-slate)] hover:text-white"
                                )}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>

                    <div className="w-full md:hidden">
                      <Button
                        className="h-11 w-full rounded-xl bg-[#0A1628] text-white hover:bg-[#1E3A5F]"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                      >
                        Load More
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
