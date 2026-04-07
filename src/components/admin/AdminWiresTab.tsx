import { useEffect, useState } from "react";
import { CheckCircle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface AdminWiresTabProps {
  wireTransfers: any[];
  approveWireTransfer: (transferId: string) => Promise<void>;
  adminId: string;
  onViewCodes: (wireTransferId: string) => void;
}

export default function AdminWiresTab({ wireTransfers, approveWireTransfer, adminId, onViewCodes }: AdminWiresTabProps) {
  const [selectedWire, setSelectedWire] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [codes, setCodes] = useState<{ code_type: string; plain_code: string | null; is_verified: boolean }[]>([]);

  useEffect(() => {
    if (!dialogOpen || !selectedWire?.id) return;

    const fetchCodes = async () => {
      setLoadingCodes(true);
      try {
        const { data, error } = await (supabase as any).rpc("get_wire_transfer_codes_for_admin", {
          p_admin_id: adminId,
          p_wire_transfer_id: selectedWire.id,
        });

        if (error) throw error;
        setCodes(data || []);
      } catch (error: any) {
        toast.error(error.message || "Failed to load wire transfer codes");
        setCodes([]);
      } finally {
        setLoadingCodes(false);
      }
    };

    fetchCodes();
  }, [dialogOpen, selectedWire, adminId]);

  const openCodesDialog = (wire: any) => {
    setSelectedWire(wire);
    setDialogOpen(true);
    onViewCodes(wire.id);
  };

  const formatWireStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      awaiting_cot: "Awaiting COT",
      awaiting_imf: "Awaiting IMF",
      awaiting_tax: "Awaiting TAX",
      awaiting_levy: "Awaiting LEVY",
      awaiting_fin: "Awaiting FIN",
      completed: "Completed",
    };

    return statusMap[status] || status.replace(/_/g, " ");
  };

  return (
    <>
      <Card className="admin-premium-card rounded-lg border-0">
        <CardHeader>
          <CardTitle className="admin-premium-heading text-[var(--bank-navy)]">Wire Transfer Management</CardTitle>
          <CardDescription className="text-[var(--bank-muted)]">Monitor and approve wire transfers</CardDescription>
        </CardHeader>
        <CardContent>
          {wireTransfers.length === 0 ? (
            <div className="text-sm text-muted-foreground">No wire transfers yet</div>
          ) : (
            <Table>
              <TableHeader className="admin-premium-table-head">
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
                  <TableRow key={wire.id} className="admin-premium-row h-11">
                    <TableCell>{wire.profiles?.full_name}</TableCell>
                    <TableCell>{wire.beneficiary_name}</TableCell>
                    <TableCell>${Number(wire.amount).toFixed(2)}</TableCell>
                    <TableCell>{wire.beneficiary_country}</TableCell>
                    <TableCell>{wire.current_stage}/5</TableCell>
                    <TableCell>
                      <Badge
                        className={`admin-premium-badge ${
                          wire.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : wire.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {formatWireStatus(wire.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-md border-[var(--bank-navy)] text-[var(--bank-navy)] hover:bg-[var(--bank-navy)]/5"
                          onClick={() => openCodesDialog(wire)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Codes
                        </Button>
                        {wire.status === "pending" && (
                          <Button size="sm" onClick={() => approveWireTransfer(wire.id)}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedWire(null);
            setCodes([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Wire Transfer Codes</DialogTitle>
          </DialogHeader>

          {selectedWire && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <div>Beneficiary: {selectedWire.beneficiary_name}</div>
                <div>
                  Amount: ${Number(selectedWire.amount).toFixed(2)} {selectedWire.currency || "USD"}
                </div>
              </div>

              {loadingCodes ? (
                <div className="text-sm text-muted-foreground">Loading codes...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code Type</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-sm text-muted-foreground">
                          No codes found for this transfer
                        </TableCell>
                      </TableRow>
                    ) : (
                      codes.map((code) => (
                        <TableRow key={code.code_type}>
                          <TableCell>{code.code_type}</TableCell>
                          <TableCell className="font-mono">{code.plain_code || "-"}</TableCell>
                          <TableCell>{code.is_verified ? "✓ Verified" : "Pending"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
