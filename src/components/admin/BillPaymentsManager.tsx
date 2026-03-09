import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Receipt, Search, Loader2 } from "lucide-react";

interface BillPayment {
  id: string;
  category: string;
  provider: string;
  amount: number;
  status: string;
  reference_number: string | null;
  created_at: string;
  user_id: string;
  profiles?: { full_name: string; email: string };
}

export default function BillPaymentsManager() {
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    const { data, error } = await supabase
      .from("bill_payments")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      toast.error("Failed to load bill payments");
    } else {
      setPayments(data || []);
    }
    setLoading(false);
  };

  const filtered = payments.filter(p =>
    p.provider.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    p.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.reference_number?.includes(search)
  );

  const totalPaid = payments.filter(p => p.status === "completed").reduce((s, p) => s + p.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Bill Payments
        </CardTitle>
        <CardDescription>
          View all bill payments. Total Completed: ${totalPaid.toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by provider, category, user, or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{new Date(payment.created_at).toLocaleString()}</TableCell>
                <TableCell>
                  <div>
                    <p>{payment.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{payment.profiles?.email}</p>
                  </div>
                </TableCell>
                <TableCell>{payment.provider}</TableCell>
                <TableCell className="capitalize">{payment.category}</TableCell>
                <TableCell>${payment.amount.toLocaleString()}</TableCell>
                <TableCell className="font-mono text-xs">{payment.reference_number || "—"}</TableCell>
                <TableCell>
                  <Badge variant={payment.status === "completed" ? "default" : "secondary"}>
                    {payment.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No bill payments found</p>
        )}
      </CardContent>
    </Card>
  );
}
