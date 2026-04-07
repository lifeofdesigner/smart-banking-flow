import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
      if (count !== null) setTotalCount(count);
    }
    setLoading(false);
  }, [currentPage, searchTerm, selectedType, selectedAccount, startDate, endDate, minAmount, maxAmount]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "pending": return "secondary";
      case "failed": return "destructive";
      default: return "outline";
    }
  };

  const hasFilters = searchTerm || selectedType !== "all" || selectedAccount !== "all" || 
    startDate || endDate || minAmount || maxAmount;

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Transaction History</h1>
            <p className="text-muted-foreground">View and export your transactions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" onClick={exportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Print/PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
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
        <Card className="print:shadow-none">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
                <p className="text-muted-foreground">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(tx.created_at), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="capitalize whitespace-nowrap">
                          {tx.transaction_type.replace(/_/g, " ")}
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
                          <Badge variant={getStatusColor(tx.status)}>{tx.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t print:hidden">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} transactions
                    </p>
                    <Pagination>
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
                                className="cursor-pointer"
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
