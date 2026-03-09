import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Gift, Plus, Loader2 } from "lucide-react";

interface CashbackRule {
  id: string;
  transaction_type: string;
  cashback_percentage: number;
  min_transaction_amount: number;
  max_cashback: number | null;
  is_active: boolean;
  description: string | null;
}

interface CashbackReward {
  id: string;
  cashback_amount: number;
  status: string;
  created_at: string;
  profiles?: { full_name: string; email: string };
}

export default function CashbackManager() {
  const [rules, setRules] = useState<CashbackRule[]>([]);
  const [rewards, setRewards] = useState<CashbackReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    transaction_type: "",
    cashback_percentage: 1,
    min_transaction_amount: 10,
    max_cashback: 50,
    description: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [rulesRes, rewardsRes] = await Promise.all([
      supabase.from("cashback_rules").select("*").order("transaction_type"),
      supabase.from("cashback_rewards").select("*").order("created_at", { ascending: false }).limit(100),
    ]);

    if (rulesRes.data) setRules(rulesRes.data);
    
    // Enrich rewards with profile data
    if (rewardsRes.data) {
      const userIds = [...new Set(rewardsRes.data.map(r => r.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      setRewards(rewardsRes.data.map(r => ({
        ...r,
        profiles: profileMap.get(r.user_id) || { full_name: "Unknown", email: "" }
      })));
    }
    setLoading(false);
  };

  const toggleRule = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("cashback_rules")
      .update({ is_active: !isActive })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update rule");
    } else {
      toast.success("Rule updated");
      loadData();
    }
  };

  const createRule = async () => {
    if (!newRule.transaction_type) {
      toast.error("Transaction type is required");
      return;
    }

    const { error } = await supabase.from("cashback_rules").insert({
      ...newRule,
      max_cashback: newRule.max_cashback || null,
    });

    if (error) {
      toast.error("Failed to create rule");
    } else {
      toast.success("Rule created");
      setDialogOpen(false);
      setNewRule({ transaction_type: "", cashback_percentage: 1, min_transaction_amount: 10, max_cashback: 50, description: "" });
      loadData();
    }
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase.from("cashback_rules").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete rule");
    } else {
      toast.success("Rule deleted");
      loadData();
    }
  };

  const totalPending = rewards.filter(r => r.status === "pending").reduce((s, r) => s + r.cashback_amount, 0);
  const totalCredited = rewards.filter(r => r.status === "credited").reduce((s, r) => s + r.cashback_amount, 0);

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
          <Gift className="h-5 w-5" />
          Cashback Management
        </CardTitle>
        <CardDescription>
          Pending: ${totalPending.toLocaleString()} | Credited: ${totalCredited.toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules">Cashback Rules</TabsTrigger>
            <TabsTrigger value="rewards">Rewards History</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Rule</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Cashback Rule</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Transaction Type</Label>
                    <Input
                      placeholder="e.g., transfer, bill_payment"
                      value={newRule.transaction_type}
                      onChange={(e) => setNewRule(r => ({ ...r, transaction_type: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Cashback %</Label>
                      <Input
                        type="number"
                        value={newRule.cashback_percentage}
                        onChange={(e) => setNewRule(r => ({ ...r, cashback_percentage: parseFloat(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label>Min Transaction</Label>
                      <Input
                        type="number"
                        value={newRule.min_transaction_amount}
                        onChange={(e) => setNewRule(r => ({ ...r, min_transaction_amount: parseFloat(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Max Cashback</Label>
                    <Input
                      type="number"
                      value={newRule.max_cashback}
                      onChange={(e) => setNewRule(r => ({ ...r, max_cashback: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={newRule.description}
                      onChange={(e) => setNewRule(r => ({ ...r, description: e.target.value }))}
                    />
                  </div>
                  <Button className="w-full" onClick={createRule}>Create Rule</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction Type</TableHead>
                  <TableHead>Cashback %</TableHead>
                  <TableHead>Min Amount</TableHead>
                  <TableHead>Max Cashback</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.transaction_type}</TableCell>
                    <TableCell>{rule.cashback_percentage}%</TableCell>
                    <TableCell>${rule.min_transaction_amount}</TableCell>
                    <TableCell>{rule.max_cashback ? `$${rule.max_cashback}` : "None"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={rule.is_active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleRule(rule.id, rule.is_active)}
                      >
                        {rule.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="destructive" onClick={() => deleteRule(rule.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="rewards">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rewards.map((reward) => (
                  <TableRow key={reward.id}>
                    <TableCell>{new Date(reward.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <div>
                        <p>{reward.profiles?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{reward.profiles?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>${reward.cashback_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={reward.status === "credited" ? "default" : "secondary"}>
                        {reward.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
