import { CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AdminNotificationsTabProps {
  allNotifications: unknown[];
}

export default function AdminNotificationsTab({ allNotifications }: AdminNotificationsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Notifications</CardTitle>
        <CardDescription>System-wide notification log</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Read</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allNotifications.map((n: unknown) => (
              <TableRow key={n.id}>
                <TableCell>{n.user_name}</TableCell>
                <TableCell>
                  <Badge variant={n.type === "credit_alert" ? "default" : n.type === "debit_alert" ? "secondary" : "destructive"}>
                    {n.type}
                  </Badge>
                </TableCell>
                <TableCell>{n.title}</TableCell>
                <TableCell className="max-w-xs truncate">{n.message}</TableCell>
                <TableCell>{n.read ? <CheckCircle className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}</TableCell>
                <TableCell>{new Date(n.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
