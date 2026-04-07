import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AdminTransactionsTabProps {
  transactions: any[];
}

export default function AdminTransactionsTab({ transactions }: AdminTransactionsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>View all system transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
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
              <TableRow key={tx.id}>
                <TableCell className="font-mono text-xs">{tx.reference_number}</TableCell>
                <TableCell className="font-mono">{tx.accounts?.account_number}</TableCell>
                <TableCell className="capitalize">{tx.transaction_type}</TableCell>
                <TableCell>${tx.amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={tx.status === "completed" ? "default" : "secondary"}>
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
