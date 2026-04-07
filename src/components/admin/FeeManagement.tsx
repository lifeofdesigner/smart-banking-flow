import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, DollarSign, Percent, AlertCircle, TrendingUp, Activity } from "lucide-react";
import { toast } from "sonner";
import type { TablesUpdate } from "@/integrations/supabase/types";

interface FeeRule {
  id: string;
  transaction_type: string;
  fee_type: "fixed" | "percentage";
  amount: number;
  currency: string;
  is_active: boolean;
  description: string | null;
  min_fee: number | null;
  max_fee: number | null;
  created_at: string;
  updated_at: string;
}

const TRANSACTION_TYPES = [
  { value: "transfer", label: "Internal Transfer", description: "Applied on account-to-account transfers" },
  { value: "wire_transfer", label: "Wire Transfer", description: "Applied on international wire transfers" },
  { value: "loan_repayment", label: "Loan Repayment", description: "Applied on each loan repayment installment" },
  { value: "maintenance", label: "Monthly Maintenance", description: "Recurring monthly account fee (manual process)" },
];

const defaultForm = {
  transaction_type: "transfer",
  fee_type: "fixed" as "fixed" | "percentage",
  amount: "",
  currency: "USD",
  description: "",
  min_fee: "",
  max_fee: "",
  is_active: true,
};

export default function FeeManagement() {
  const [feeRules, setFeeRules] = useState<FeeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FeeRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const fetchFeeRules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("fee_rules")
        .select("*")
        .order("transaction_type", { ascending: true });
      if (error) throw error;
      setFeeRules(data || []);
    } catch (error) {
      console.error("Error fetching fee rules:", error);
      toast.error("Failed to load fee rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeeRules();
  }, [fetchFeeRules]);

  const openCreate = () => {
    setEditingRule(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (rule: FeeRule) => {
    setEditingRule(rule);
    setForm({
      transaction_type: rule.transaction_type,
      fee_type: rule.fee_type,
      amount: rule.amount.toString(),
      currency: rule.currency,
      description: rule.description || "",
      min_fee: rule.min_fee?.toString() || "",
      max_fee: rule.max_fee?.toString() || "",
      is_active: rule.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) < 0) {
      toast.error("Please enter a valid fee amount");
      return;
    }
    setSaving(true);
    try {
      const payload: TablesUpdate<"fee_rules"> = {
        transaction_type: form.transaction_type,
        fee_type: form.fee_type,
        amount: Number(form.amount),
        currency: form.currency,
        description: form.description || null,
        is_active: form.is_active,
        min_fee: form.fee_type === "percentage" && form.min_fee ? Number(form.min_fee) : null,
        max_fee: form.fee_type === "percentage" && form.max_fee ? Number(form.max_fee) : null,
      };

      if (editingRule) {
        const { error } = await supabase.from("fee_rules").update(payload).eq("id", editingRule.id);
        if (error) throw error;
        toast.success("Fee rule updated");
      } else {
        const { error } = await supabase.from("fee_rules").insert(payload);
        if (error) throw error;
        toast.success("Fee rule created");
      }
      setDialogOpen(false);
      fetchFeeRules();
    } catch (error: any) {
      console.error("Error saving fee rule:", error);
      toast.error(error.message || "Failed to save fee rule");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (rule: FeeRule) => {
    try {
      const { error } = await supabase
        .from("fee_rules")
        .update({ is_active: !rule.is_active })
        .eq("id", rule.id);
      if (error) throw error;
      toast.success(`Fee rule ${rule.is_active ? "deactivated" : "activated"}`);
      fetchFeeRules();
    } catch {
      toast.error("Failed to update fee rule");
    }
  };

  const formatFeeDisplay = (rule: FeeRule) => {
    if (rule.fee_type === "fixed") return `$${rule.amount.toFixed(2)}`;
    let str = `${rule.amount}%`;
    if (rule.min_fee != null) str += ` · min $${rule.min_fee}`;
    if (rule.max_fee != null) str += ` · max $${rule.max_fee}`;
    return str;
  };

  const getTypeLabel = (type: string) =>
    TRANSACTION_TYPES.find((t) => t.value === type)?.label || type;

  const activeRules = feeRules.filter((r) => r.is_active);
  const fixedRules = feeRules.filter((r) => r.fee_type === "fixed");
  const pctRules = feeRules.filter((r) => r.fee_type === "percentage");

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">Loading fee rules...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{feeRules.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total Rules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{activeRules.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active Rules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{fixedRules.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Fixed Fee Rules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{pctRules.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Percentage Rules</p>
          </CardContent>
        </Card>
      </div>

      {/* Rules table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Fee Rules</CardTitle>
            <CardDescription>
              Fees are automatically collected on matching transactions and transferred to the bank revenue account
            </CardDescription>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </CardHeader>
        <CardContent>
          {feeRules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto opacity-40" />
              <p className="font-medium">No fee rules configured</p>
              <p className="text-sm">Add a rule to start collecting transaction fees automatically.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction Type</TableHead>
                  <TableHead>Fee Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeRules.map((rule) => (
                  <TableRow key={rule.id} className={!rule.is_active ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{getTypeLabel(rule.transaction_type)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1 font-mono text-xs">
                        {rule.fee_type === "fixed" ? (
                          <DollarSign className="h-3 w-3" />
                        ) : (
                          <Percent className="h-3 w-3" />
                        )}
                        {rule.fee_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{formatFeeDisplay(rule)}</TableCell>
                    <TableCell>{rule.currency}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {rule.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Switch checked={rule.is_active} onCheckedChange={() => toggleActive(rule)} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info note */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4">
          <div className="flex gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground">Automatic enforcement:</strong> Transfer and loan repayment fees
              are deducted in real-time via the transaction engine. Wire transfer and maintenance fees are
              shown here for configuration but require a separate application or scheduled job.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Fee Rule" : "Create Fee Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select
                value={form.transaction_type}
                onValueChange={(v) => setForm((f) => ({ ...f, transaction_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {TRANSACTION_TYPES.find((t) => t.value === form.transaction_type)?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Fee Type</Label>
              <Select
                value={form.fee_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, fee_type: v as "fixed" | "percentage", min_fee: "", max_fee: "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount — flat fee per transaction</SelectItem>
                  <SelectItem value="percentage">Percentage — % of transaction amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{form.fee_type === "fixed" ? "Fee Amount (USD)" : "Fee Percentage (%)"}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder={form.fee_type === "fixed" ? "e.g. 2.50" : "e.g. 1.5"}
              />
            </div>

            {form.fee_type === "percentage" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Min Fee (USD)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.min_fee}
                    onChange={(e) => setForm((f) => ({ ...f, min_fee: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Fee (USD)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.max_fee}
                    onChange={(e) => setForm((f) => ({ ...f, max_fee: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this fee rule"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="fee-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <Label htmlFor="fee-active" className="cursor-pointer">
                Active — fee will be collected automatically
              </Label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editingRule ? "Update Rule" : "Create Rule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
