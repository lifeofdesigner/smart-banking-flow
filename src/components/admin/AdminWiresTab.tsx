import { CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AdminWiresTabProps {
  wireTransfers: any[];
  approveWireTransfer: (transferId: string) => Promise<void>;
}

export default function AdminWiresTab({ wireTransfers, approveWireTransfer }: AdminWiresTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Wire Transfer Management</CardTitle>
        <CardDescription>Monitor and approve wire transfers</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Beneficiary</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wireTransfers.map((wire) => (
              <TableRow key={wire.id}>
                <TableCell>{wire.profiles?.full_name}</TableCell>
                <TableCell>{wire.beneficiary_name}</TableCell>
                <TableCell>${wire.amount.toFixed(2)}</TableCell>
                <TableCell>{wire.beneficiary_country}</TableCell>
                <TableCell>{wire.current_stage}/5</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      wire.status === "completed"
                        ? "default"
                        : wire.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {wire.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {wire.status === "pending" && (
                    <Button size="sm" onClick={() => approveWireTransfer(wire.id)}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
