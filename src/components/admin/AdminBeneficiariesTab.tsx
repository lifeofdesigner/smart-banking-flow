import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AdminBeneficiariesTabProps {
  allBeneficiaries: any[];
}

export default function AdminBeneficiariesTab({ allBeneficiaries }: AdminBeneficiariesTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Beneficiaries</CardTitle>
        <CardDescription>Overview of saved beneficiaries across all users</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Nickname</TableHead>
              <TableHead>Account Number</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allBeneficiaries.map((b: any) => (
              <TableRow key={b.id}>
                <TableCell>{b.user_name}</TableCell>
                <TableCell>{b.nickname}</TableCell>
                <TableCell className="font-mono">{b.account_number}</TableCell>
                <TableCell>{b.bank_name}</TableCell>
                <TableCell>{new Date(b.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
