import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AdminUsersTabProps {
  users: unknown[];
  updateKycStatus: (userId: string, status: string) => Promise<void>;
}

export default function AdminUsersTab({ users, updateKycStatus }: AdminUsersTabProps) {
  return (
    <Card className="admin-premium-card rounded-lg border-0">
      <CardHeader>
        <CardTitle className="admin-premium-heading text-[var(--bank-navy)]">User Management</CardTitle>
        <CardDescription className="text-[var(--bank-muted)]">Manage user profiles and KYC verification</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader className="admin-premium-table-head">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>KYC Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="admin-premium-row h-11 hover:bg-[#F0F4FA]">
                <TableCell>{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone || "N/A"}</TableCell>
                <TableCell>
                  <Badge
                    className={`admin-premium-badge ${
                      user.kyc_status === "verified"
                        ? "bg-emerald-100 text-emerald-700"
                        : user.kyc_status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {user.kyc_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={user.kyc_status}
                    onValueChange={(value) => updateKycStatus(user.id, value)}
                  >
                    <SelectTrigger className="h-8 w-32 border-[#d7dde6] bg-white text-[var(--bank-navy)] shadow-none focus:ring-1 focus:ring-[var(--bank-slate)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
