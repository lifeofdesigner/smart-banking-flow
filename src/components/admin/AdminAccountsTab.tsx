import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface AdminAccountsTabProps {
  accounts: unknown[];
  adminId: string;
  onDepositSuccess: () => void;
  updateAccountStatus: (accountId: string, status: string) => Promise<void>;
}

export default function AdminAccountsTab({
  accounts,
  adminId,
  onDepositSuccess,
  updateAccountStatus,
}: AdminAccountsTabProps) {
  const [depositOpen, setDepositOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<unknown | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("Admin manual deposit");
  const [submitting, setSubmitting] = useState(false);

  const openDepositDialog = (account: unknown) => {
    setSelectedAccount(account);
    setAmount("");
    setDescription("Admin manual deposit");
    setDepositOpen(true);
  };

  const handleDeposit = async () => {
    if (!selectedAccount) return;

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await (supabase as unknown).rpc("admin_manual_deposit", {
        p_admin_id: adminId,
        p_account_id: selectedAccount.id,
        p_amount: parsedAmount,
        p_description: description,
      });

      if (error) throw error;

      const resultMessage = typeof data === "string" ? data : "Deposit completed successfully";
      toast.success(resultMessage);
      setDepositOpen(false);
      onDepositSuccess();
    } catch (error: unknown) {
      toast.error(error.message || "Failed to process deposit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card className="admin-premium-card rounded-lg border-0">
        <CardHeader>
          <CardTitle className="admin-premium-heading text-[var(--bank-navy)]">Account Management</CardTitle>
          <CardDescription className="text-[var(--bank-muted)]">View and manage user bank accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="admin-premium-table-head">
              <TableRow>
                <TableHead>Account Number</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id} className="admin-premium-row h-11">
                  <TableCell className="font-mono text-[var(--bank-navy)]">{account.account_number}</TableCell>
                  <TableCell>{account.profiles?.full_name}</TableCell>
                  <TableCell className="capitalize">{account.account_type}</TableCell>
                  <TableCell>${account.computed_balance?.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge
                      className={`admin-premium-badge ${
                        account.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : account.status === "frozen"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {account.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={account.status}
                        onValueChange={(value) => updateAccountStatus(account.id, value)}
                      >
                        <SelectTrigger className="h-8 w-32 border-[#d7dde6] bg-white text-[var(--bank-navy)] shadow-none focus:ring-1 focus:ring-[var(--bank-slate)]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="frozen">Frozen</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        className="h-8 rounded-md bg-[var(--bank-gold)] px-3 text-xs font-medium text-[#27200d] hover:bg-[#b9973f]"
                        onClick={() => openDepositDialog(account)}
                      >
                        Deposit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Deposit</DialogTitle>
            <DialogDescription>
              Account #{selectedAccount?.account_number} • {selectedAccount?.profiles?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="manual-deposit-amount">Amount</Label>
              <Input
                id="manual-deposit-amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-deposit-description">Description (optional)</Label>
              <Input
                id="manual-deposit-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleDeposit} disabled={submitting || !amount}>
              {submitting ? "Depositing..." : "Deposit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
