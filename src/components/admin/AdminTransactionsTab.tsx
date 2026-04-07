import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AdminTransactionsTabProps {
  transactions: any[];
}

export default function AdminTransactionsTab({ transactions }: AdminTransactionsTabProps) {
  return (
    <Card className="admin-premium-card rounded-lg border-0">
      <CardHeader>
        <CardTitle className="admin-premium-heading text-[var(--bank-navy)]">Transaction History</CardTitle>
        <CardDescription className="text-[var(--bank-muted)]">View all system transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader className="admin-premium-table-head">
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id} className="admin-premium-row h-11 hover:bg-[#F0F4FA]">
                <TableCell className="font-mono text-xs">{tx.reference_number}</TableCell>
                <TableCell className="font-mono">{tx.accounts?.account_number}</TableCell>
                <TableCell className="capitalize">{tx.transaction_type}</TableCell>
                <TableCell>${tx.amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge
                    className={`admin-premium-badge ${
                      tx.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {tx.status}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(tx.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
