import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Download, FileText, Printer } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface Account {
  id: string;
  account_number: string;
  account_type: string;
  available_balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
  reference_number: string;
}

interface Profile {
  full_name: string;
  email: string;
  address: string;
}

export default function Statements() {
  const { toast } = useToast();
  const siteSettings = useSiteSettings();
  const printRef = useRef<HTMLDivElement>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statementGenerated, setStatementGenerated] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [accountsRes, profileRes] = await Promise.all([
      supabase.from("accounts").select("*").eq("user_id", user.id),
      supabase.from("profiles").select("full_name, email, address").eq("id", user.id).single()
    ]);

    if (accountsRes.data) {
      setAccounts(accountsRes.data);
      if (accountsRes.data.length > 0) {
        setSelectedAccount(accountsRes.data[0].id);
      }
    }
    if (profileRes.data) setProfile(profileRes.data);
    setLoading(false);
  };

  const generateStatement = async () => {
    if (!selectedAccount || !startDate || !endDate) {
      toast({ title: "Error", description: "Please select account and date range", variant: "destructive" });
      return;
    }

    setGenerating(true);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("account_id", selectedAccount)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setTransactions(data || []);
      setStatementGenerated(true);
      toast({ title: "Success", description: "Statement generated successfully" });
    }
    setGenerating(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const exportCSV = () => {
    const account = accounts.find(a => a.id === selectedAccount);
    const headers = ["Date", "Type", "Description", "Reference", "Debit", "Credit", "Status"];
    const rows = transactions.map(t => {
      const isCredit = t.transaction_type.includes("deposit") || t.transaction_type === "loan_disbursement";
      return [
        format(new Date(t.created_at), "yyyy-MM-dd HH:mm"),
        t.transaction_type,
        t.description || "",
        t.reference_number || "",
        isCredit ? "" : t.amount.toString(),
        isCredit ? t.amount.toString() : "",
        t.status
      ];
    });

    const csvContent = [
      `Account Statement - ${account?.account_number}`,
      `Period: ${format(startDate, "PP")} to ${format(endDate, "PP")}`,
      "",
      headers.join(","),
      ...rows.map(r => r.map(c => `"${c}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statement_${account?.account_number}_${format(startDate, "yyyyMMdd")}_${format(endDate, "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedAccountData = accounts.find(a => a.id === selectedAccount);

  // Calculate totals
  const totalDebit = transactions
    .filter(t => !t.transaction_type.includes("deposit") && t.transaction_type !== "loan_disbursement")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCredit = transactions
    .filter(t => t.transaction_type.includes("deposit") || t.transaction_type === "loan_disbursement")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Bank Statements</h1>
          <p className="text-muted-foreground">Generate and download your account statements</p>
        </div>

        {/* Generator Form */}
        <Card className="mb-6 print:hidden">
          <CardHeader>
            <CardTitle>Generate Statement</CardTitle>
            <CardDescription>Select account and date range for your statement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Account</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_type} - {acc.account_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(endDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-end">
                <Button onClick={generateStatement} disabled={generating || !selectedAccount} className="w-full">
                  {generating ? "Generating..." : "Generate Statement"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statement Preview */}
        {statementGenerated && (
          <>
            <div className="flex gap-2 mb-4 print:hidden">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print / PDF
              </Button>
              <Button variant="outline" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <Card ref={printRef} className="print:shadow-none print:border-0">
              <CardContent className="p-8">
                {/* Statement Header */}
                <div className="flex justify-between items-start border-b pb-6 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {siteSettings["site_logo_url"] ? (
                        <img
                          src={siteSettings["site_logo_url"]}
                          alt={siteSettings["site_name"] || "Your Bank"}
                          style={{ height: "40px", width: "auto", objectFit: "contain" }}
                          className="flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-foreground font-bold">M</span>
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl font-bold">{siteSettings["site_name"] || "Your Bank"}</h2>
                        <p className="text-sm text-muted-foreground">Account Statement</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">Statement Period</p>
                    <p className="text-muted-foreground">
                      {format(startDate, "MMMM dd, yyyy")} - {format(endDate, "MMMM dd, yyyy")}
                    </p>
                    <p className="text-muted-foreground mt-2">
                      Generated: {format(new Date(), "MMMM dd, yyyy HH:mm")}
                    </p>
                  </div>
                </div>

                {/* Account Info */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-semibold mb-2">Account Holder</h3>
                    <p className="text-sm">{profile?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                    {profile?.address && <p className="text-sm text-muted-foreground">{profile.address}</p>}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Account Details</h3>
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Account Number:</span> {selectedAccountData?.account_number}</p>
                      <p><span className="text-muted-foreground">Account Type:</span> <span className="capitalize">{selectedAccountData?.account_type}</span></p>
                      <p><span className="text-muted-foreground">Currency:</span> {selectedAccountData?.currency}</p>
                      <p><span className="text-muted-foreground">Current Balance:</span> <span className="font-semibold">${selectedAccountData?.available_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></p>
                    </div>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No transactions found for this period
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {transactions.map((tx) => {
                            const isCredit = tx.transaction_type.includes("deposit") || tx.transaction_type === "loan_disbursement";
                            return (
                              <TableRow key={tx.id}>
                                <TableCell className="whitespace-nowrap">
                                  {format(new Date(tx.created_at), "MMM dd, yyyy")}
                                </TableCell>
                                <TableCell>
                                  <p className="capitalize">{tx.transaction_type.replace(/_/g, " ")}</p>
                                  {tx.description && <p className="text-xs text-muted-foreground">{tx.description}</p>}
                                </TableCell>
                                <TableCell className="font-mono text-xs">{tx.reference_number || "-"}</TableCell>
                                <TableCell className="text-right text-red-600">
                                  {!isCredit && `$${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                                </TableCell>
                                <TableCell className="text-right text-green-600">
                                  {isCredit && `$${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          <TableRow className="bg-muted/50 font-semibold">
                            <TableCell colSpan={3}>Total</TableCell>
                            <TableCell className="text-right text-red-600">
                              ${totalDebit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              ${totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-6 border-t text-center text-xs text-muted-foreground">
                  <p>This is a computer-generated statement and does not require a signature.</p>
                  <p className="mt-1">For any queries, please contact customer support.</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!statementGenerated && !loading && (
          <Card className="p-12 text-center print:hidden">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Statement Generated</h3>
            <p className="text-muted-foreground">Select an account and date range to generate your statement.</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
