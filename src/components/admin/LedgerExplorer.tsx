import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { ChevronLeft, ChevronRight, Search, X, BookOpen } from "lucide-react";
import { toast } from "sonner";

interface LedgerEntry {
  id: string;
  amount: number;
  currency: string;
  description: string | null;
  created_at: string;
  transaction_id: string;
  debit_account_id: string;
  credit_account_id: string;
}

interface LedgerFilters {
  dateFrom: string;
  dateTo: string;
  reference: string;
  accountNumber: string;
  amountMin: string;
  amountMax: string;
  transactionType: string;
}

const PAGE_SIZE = 50;

export default function LedgerExplorer() {
  const [entries, setEntries] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<unknown | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<LedgerFilters>({
    dateFrom: "",
    dateTo: "",
    reference: "",
    accountNumber: "",
    amountMin: "",
    amountMax: "",
    transactionType: "",
  });

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      // We need to query ledger_entries and join related data
      // Since Supabase doesn't support deep nested joins easily, we'll do it in steps
      let query = supabase
        .from("ledger_entries")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // Apply filters
      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("created_at", filters.dateTo + "T23:59:59");
      }
      if (filters.amountMin) {
        query = query.gte("amount", parseFloat(filters.amountMin));
      }
      if (filters.amountMax) {
        query = query.lte("amount", parseFloat(filters.amountMax));
      }

      const { data, count, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        setEntries([]);
        setTotalCount(count ?? 0);
        setLoading(false);
        return;
      }

      // Gather unique IDs for batch lookups
      const txIds = [...new Set(data.map((e) => e.transaction_id))];
      const accountIds = [
        ...new Set(data.flatMap((e) => [e.debit_account_id, e.credit_account_id])),
      ];

      // Batch fetch transactions and accounts
      const [txRes, accRes] = await Promise.all([
        supabase.from("transactions").select("id, reference_number, transaction_type, status, account_id").in("id", txIds),
        supabase.from("accounts").select("id, account_number, user_id").in("id", accountIds),
      ]);

      const txMap = new Map((txRes.data ?? []).map((t) => [t.id, t]));
      const accMap = new Map((accRes.data ?? []).map((a) => [a.id, a]));

      // Get user IDs from accounts to fetch profiles
      const userIds = [
        ...new Set(
          (accRes.data ?? [])
            .map((a) => a.user_id)
            .filter(Boolean)
        ),
      ];

      let profileMap = new Map<string, unknown>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      }

      // Enrich entries
      let enriched = data.map((entry) => {
        const tx = txMap.get(entry.transaction_id);
        const debitAcc = accMap.get(entry.debit_account_id);
        const creditAcc = accMap.get(entry.credit_account_id);
        const initiatorAccount = tx ? accMap.get(tx.account_id) : null;
        const initiator = initiatorAccount?.user_id
          ? profileMap.get(initiatorAccount.user_id)
          : null;

        return {
          ...entry,
          transaction: tx ?? null,
          debit_account: debitAcc ?? null,
          credit_account: creditAcc ?? null,
          initiator: initiator ?? null,
        };
      });

      // Client-side filters for reference and account number (require joined data)
      if (filters.reference) {
        const ref = filters.reference.toLowerCase();
        enriched = enriched.filter(
          (e) => e.transaction?.reference_number?.toLowerCase().includes(ref)
        );
      }
      if (filters.accountNumber) {
        const acc = filters.accountNumber.toLowerCase();
        enriched = enriched.filter(
          (e) =>
            e.debit_account?.account_number?.toLowerCase().includes(acc) ||
            e.credit_account?.account_number?.toLowerCase().includes(acc)
        );
      }
      if (filters.transactionType && filters.transactionType !== "all") {
        enriched = enriched.filter(
          (e) => e.transaction?.transaction_type === filters.transactionType
        );
      }

      setEntries(enriched);
      setTotalCount(count ?? 0);
    } catch (error) {
      console.error("Error fetching ledger entries:", error);
      toast.error("Failed to load ledger entries");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const clearFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      reference: "",
      accountNumber: "",
      amountMin: "",
      amountMax: "",
      transactionType: "",
    });
    setPage(0);
  };

  const handleRowClick = (entry: unknown) => {
    setSelectedEntry(entry);
    setDrawerOpen(true);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Ledger Explorer
              </CardTitle>
              <CardDescription>
                Inspect all double-entry ledger records ({totalCount} total entries)
              </CardDescription>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Input
              type="date"
              placeholder="From date"
              value={filters.dateFrom}
              onChange={(e) => {
                setFilters((f) => ({ ...f, dateFrom: e.target.value }));
                setPage(0);
              }}
            />
            <Input
              type="date"
              placeholder="To date"
              value={filters.dateTo}
              onChange={(e) => {
                setFilters((f) => ({ ...f, dateTo: e.target.value }));
                setPage(0);
              }}
            />
            <Input
              placeholder="Reference..."
              value={filters.reference}
              onChange={(e) => {
                setFilters((f) => ({ ...f, reference: e.target.value }));
                setPage(0);
              }}
            />
            <Input
              placeholder="Account #..."
              value={filters.accountNumber}
              onChange={(e) => {
                setFilters((f) => ({ ...f, accountNumber: e.target.value }));
                setPage(0);
              }}
            />
            <Input
              type="number"
              placeholder="Min amount"
              value={filters.amountMin}
              onChange={(e) => {
                setFilters((f) => ({ ...f, amountMin: e.target.value }));
                setPage(0);
              }}
            />
            <Input
              type="number"
              placeholder="Max amount"
              value={filters.amountMax}
              onChange={(e) => {
                setFilters((f) => ({ ...f, amountMax: e.target.value }));
                setPage(0);
              }}
            />
            <Select
              value={filters.transactionType}
              onValueChange={(value) => {
                setFilters((f) => ({ ...f, transactionType: value }));
                setPage(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="withdrawal">Withdrawal</SelectItem>
                <SelectItem value="wire">Wire</SelectItem>
                <SelectItem value="fee">Fee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Debit Account</TableHead>
                  <TableHead>Credit Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Initiated By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading ledger entries...
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No ledger entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(entry)}
                    >
                      <TableCell className="text-sm">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {entry.transaction?.reference_number ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {entry.debit_account?.account_number ?? "System"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {entry.credit_account?.account_number ?? "System"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${entry.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.currency}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {entry.description ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.initiator?.full_name ?? "System"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-2xl">
            <DrawerHeader>
              <DrawerTitle>Transaction Detail</DrawerTitle>
              <DrawerDescription>
                Ledger entry and transaction metadata
              </DrawerDescription>
            </DrawerHeader>
            {selectedEntry && (
              <div className="px-4 pb-8 space-y-6">
                {/* Transaction Info */}
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Transaction ID" value={selectedEntry.transaction_id} mono />
                  <DetailField
                    label="Reference"
                    value={selectedEntry.transaction?.reference_number ?? "—"}
                    mono
                  />
                  <DetailField
                    label="Type"
                    value={selectedEntry.transaction?.transaction_type ?? "—"}
                  />
                  <DetailField
                    label="Status"
                    value={selectedEntry.transaction?.status ?? "—"}
                    badge
                  />
                </div>

                {/* Ledger Entry */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    Ledger Entry
                  </h4>
                  <div className="rounded-lg border bg-muted/30 p-4 grid grid-cols-2 gap-4">
                    <DetailField
                      label="Debit (DR)"
                      value={selectedEntry.debit_account?.account_number ?? "System"}
                      mono
                    />
                    <DetailField
                      label="Credit (CR)"
                      value={selectedEntry.credit_account?.account_number ?? "System"}
                      mono
                    />
                    <DetailField
                      label="Amount"
                      value={`$${selectedEntry.amount.toFixed(2)} ${selectedEntry.currency}`}
                    />
                    <DetailField
                      label="Description"
                      value={selectedEntry.description ?? "—"}
                    />
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <DetailField
                    label="Initiated By"
                    value={selectedEntry.initiator?.full_name ?? "System"}
                  />
                  <DetailField
                    label="Email"
                    value={selectedEntry.initiator?.email ?? "—"}
                  />
                  <DetailField
                    label="Timestamp"
                    value={new Date(selectedEntry.created_at).toLocaleString()}
                  />
                  <DetailField label="Entry ID" value={selectedEntry.id} mono />
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function DetailField({
  label,
  value,
  mono,
  badge,
}: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {badge ? (
        <Badge variant={value === "completed" ? "default" : "secondary"}>
          {value}
        </Badge>
      ) : (
        <p className={`text-sm font-medium ${mono ? "font-mono text-xs" : ""} break-all`}>
          {value}
        </p>
      )}
    </div>
  );
}
