import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PiggyBank, Plus, CalendarIcon, Target, TrendingUp, Trash2, ArrowDownToLine } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useUserAccounts } from "@/hooks/useUserAccounts";
import { isAccountUsable, getAccountStatusLabel } from "@/lib/accountStatus";

interface SavingsGoal {
  id: string;
  name: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  color: string;
  status: string;
  created_at: string;
}

export default function SavingsGoals() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const { accounts, hasUsableAccount } = useUserAccounts(userId);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);

  // Form state
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalDescription, setNewGoalDescription] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalDeadline, setNewGoalDeadline] = useState<Date | undefined>();
  const [contributionAmount, setContributionAmount] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const goalsRes = await supabase.from("savings_goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

    if (goalsRes.data) setGoals(goalsRes.data);
    setLoading(false);
  };

  const createGoal = async () => {
    if (!newGoalName || !newGoalTarget) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("savings_goals").insert({
      user_id: user.id,
      name: newGoalName,
      description: newGoalDescription || null,
      target_amount: parseFloat(newGoalTarget),
      deadline: newGoalDeadline ? newGoalDeadline.toISOString().split("T")[0] : null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Savings goal created!" });
      setCreateOpen(false);
      resetForm();
      loadData();
    }
    setSaving(false);
  };

  const contributeToGoal = async () => {
    if (!selectedGoal || !contributionAmount || !selectedAccount) {
      toast({ title: "Error", description: "Please select an account and enter an amount", variant: "destructive" });
      return;
    }
    setSaving(true);

    try {
      // Use the RPC that moves real funds
      const { data, error } = await (supabase.rpc as unknown)("contribute_to_savings_goal", {
        p_goal_id: selectedGoal.id,
        p_account_id: selectedAccount,
        p_amount: parseFloat(contributionAmount)
      });

      if (error) throw error;
      
      toast({ title: "Success", description: data || `Added $${contributionAmount} to your goal!` });
      setContributeOpen(false);
      setContributionAmount("");
      setSelectedAccount("");
      setSelectedGoal(null);
      loadData();
    } catch (e: unknown) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const withdrawFromGoal = async () => {
    if (!selectedGoal || !withdrawalAmount || !selectedAccount) {
      toast({ title: "Error", description: "Please select an account and enter an amount", variant: "destructive" });
      return;
    }
    setSaving(true);

    try {
      const { data, error } = await (supabase.rpc as unknown)("withdraw_from_savings_goal", {
        p_goal_id: selectedGoal.id,
        p_account_id: selectedAccount,
        p_amount: parseFloat(withdrawalAmount)
      });

      if (error) throw error;
      
      toast({ title: "Success", description: data || `Withdrew $${withdrawalAmount} from your goal!` });
      setWithdrawOpen(false);
      setWithdrawalAmount("");
      setSelectedAccount("");
      setSelectedGoal(null);
      loadData();
    } catch (e: unknown) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const deleteGoal = async (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal && goal.current_amount > 0) {
      toast({ 
        title: "Cannot delete", 
        description: "Please withdraw all funds from this goal first.", 
        variant: "destructive" 
      });
      return;
    }

    const { error } = await supabase.from("savings_goals").delete().eq("id", goalId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Goal deleted" });
      loadData();
    }
  };

  const resetForm = () => {
    setNewGoalName("");
    setNewGoalDescription("");
    setNewGoalTarget("");
    setNewGoalDeadline(undefined);
  };

  const getProgress = (current: number, target: number) => {
    return Math.min(100, Math.round((current / target) * 100));
  };

  const getDaysRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const days = differenceInDays(new Date(deadline), new Date());
    return days >= 0 ? days : 0;
  };

  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const activeGoals = goals.filter(g => g.status === "active").length;
  const completedGoals = goals.filter(g => g.status === "completed").length;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F4F5F7] px-4 py-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#0A1628] border-l-4 border-[#C9A84C] pl-3">Savings Goals</h1>
            <p className="text-muted-foreground">Track your savings progress with real fund movement</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="hidden bg-[var(--bank-navy)] hover:bg-[var(--bank-slate)] md:inline-flex">
                <Plus className="h-4 w-4 mr-2" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white rounded-xl shadow-sm border-0">
              <DialogHeader>
                <DialogTitle>Create Savings Goal</DialogTitle>
                <DialogDescription>Set a new savings target to work towards.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Goal Name</Label>
                  <Input placeholder="e.g., Emergency Fund" value={newGoalName} onChange={(e) => setNewGoalName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input placeholder="What's this goal for?" value={newGoalDescription} onChange={(e) => setNewGoalDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Target Amount ($)</Label>
                  <Input type="number" placeholder="5000" value={newGoalTarget} onChange={(e) => setNewGoalTarget(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Target Date (optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newGoalDeadline && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newGoalDeadline ? format(newGoalDeadline, "PPP") : "Pick a deadline"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={newGoalDeadline} onSelect={setNewGoalDeadline} disabled={(date) => date < new Date()} className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={createGoal} disabled={saving || !newGoalName || !newGoalTarget}>
                  {saving ? "Creating..." : "Create Goal"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white rounded-xl shadow-sm border-0">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <PiggyBank className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Saved</p>
                  <p className="text-2xl font-bold">${totalSaved.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white rounded-xl shadow-sm border-0">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-secondary">
                  <Target className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Target</p>
                  <p className="text-2xl font-bold">${totalTarget.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white rounded-xl shadow-sm border-0">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-yellow-500/10">
                  <TrendingUp className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Goals</p>
                  <p className="text-2xl font-bold">{activeGoals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white rounded-xl shadow-sm border-0">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{completedGoals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goals Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Card key={idx} className="bg-white rounded-xl shadow-sm border-0 p-5 space-y-3">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-9 w-full" />
              </Card>
            ))}
          </div>
        ) : goals.length === 0 ? (
          <Card className="bg-white rounded-xl shadow-sm border-0 p-12 text-center">
            <PiggyBank className="h-12 w-12 mx-auto text-[var(--bank-slate)] mb-4" />
            <h3 className="text-lg font-semibold mb-2">No savings goals yet — create your first goal</h3>
            <p className="text-muted-foreground mb-4">Start by creating your first savings goal.</p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Goal
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => {
              const progress = getProgress(goal.current_amount, goal.target_amount);
              const daysLeft = getDaysRemaining(goal.deadline);
              return (
                <Card key={goal.id} className="bg-white rounded-xl shadow-sm border-0 overflow-hidden">
                  <div className="h-2" style={{ backgroundColor: goal.color }} />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{goal.name}</CardTitle>
                        {goal.description && (
                          <CardDescription className="mt-1">{goal.description}</CardDescription>
                        )}
                      </div>
                      <Badge className="rounded-full bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                        {goal.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-2xl font-bold text-[var(--bank-navy)] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>${goal.target_amount.toLocaleString()}</p>
                      <div className="flex justify-between text-sm mb-2">
                        <span>${goal.current_amount.toLocaleString()} saved</span>
                        <span className="text-muted-foreground">${goal.target_amount.toLocaleString()}</span>
                      </div>
                      <Progress value={progress} className="h-3 [&>div]:bg-[var(--bank-gold)]" />
                      <div className="mt-2">
                        <Badge className="rounded-full bg-[var(--bank-gold)]/20 text-[#0A1628] border border-[var(--bank-gold)]/40">{progress}% complete</Badge>
                      </div>
                    </div>

                    {goal.deadline && (
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span>Target: {format(new Date(goal.deadline), "MMM dd, yyyy")}</span>
                        {daysLeft !== null && daysLeft > 0 && (
                          <Badge variant="outline">{daysLeft} days left</Badge>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {goal.status === "active" && (
                        <Button
                          variant="outline"
                          className="flex-1 border-[var(--bank-navy)] text-[var(--bank-navy)] hover:bg-[var(--bank-navy)] hover:text-white"
                          disabled={!hasUsableAccount}
                          title={!hasUsableAccount ? "Requires at least one active account" : undefined}
                          onClick={() => {
                            setSelectedGoal(goal);
                            setContributeOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      )}
                      {goal.current_amount > 0 && (
                        <Button
                          variant="outline"
                          className="flex-1 border-[var(--bank-navy)] text-[var(--bank-navy)] hover:bg-[var(--bank-navy)] hover:text-white"
                          disabled={!hasUsableAccount}
                          title={!hasUsableAccount ? "Requires at least one active account" : undefined}
                          onClick={() => {
                            setSelectedGoal(goal);
                            setWithdrawOpen(true);
                          }}
                        >
                          <ArrowDownToLine className="h-4 w-4 mr-1" />
                          Withdraw
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteGoal(goal.id)}
                        disabled={goal.current_amount > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Contribute Dialog */}
        <Dialog open={contributeOpen} onOpenChange={setContributeOpen}>
          <DialogContent className="bg-white rounded-xl shadow-sm border-0">
            <DialogHeader>
              <DialogTitle>Add Funds to Goal</DialogTitle>
              <DialogDescription>
                Transfer funds from your account to "{selectedGoal?.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>From Account</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id} disabled={!isAccountUsable(a.status)}>
                        •••{a.account_number.slice(-4)} — ${a.computed_balance.toLocaleString()}
                        {!isAccountUsable(a.status) ? ` — ${getAccountStatusLabel(a.status)}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount to Add ($)</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                />
              </div>
              {selectedGoal && (
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Current progress</p>
                  <p className="text-lg font-semibold">
                    ${selectedGoal.current_amount.toLocaleString()} / ${selectedGoal.target_amount.toLocaleString()}
                  </p>
                  {contributionAmount && (
                    <p className="text-sm text-green-600 mt-2">
                      New total: ${(selectedGoal.current_amount + parseFloat(contributionAmount || "0")).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setContributeOpen(false)}>Cancel</Button>
              <Button onClick={contributeToGoal} disabled={saving || !contributionAmount || !selectedAccount}>
                {saving ? "Processing..." : "Transfer Funds"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Withdraw Dialog */}
        <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
          <DialogContent className="bg-white rounded-xl shadow-sm border-0">
            <DialogHeader>
              <DialogTitle>Withdraw from Goal</DialogTitle>
              <DialogDescription>
                Transfer funds from "{selectedGoal?.name}" back to your account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>To Account</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id} disabled={!isAccountUsable(a.status)}>
                        •••{a.account_number.slice(-4)} — ${a.computed_balance.toLocaleString()}
                        {!isAccountUsable(a.status) ? ` — ${getAccountStatusLabel(a.status)}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount to Withdraw ($)</Label>
                <Input
                  type="number"
                  placeholder="100"
                  max={selectedGoal?.current_amount}
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                />
                {selectedGoal && (
                  <p className="text-xs text-muted-foreground">
                    Available: ${selectedGoal.current_amount.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWithdrawOpen(false)}>Cancel</Button>
              <Button onClick={withdrawFromGoal} disabled={saving || !withdrawalAmount || !selectedAccount}>
                {saving ? "Processing..." : "Withdraw Funds"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="fixed bottom-24 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#C9A84C] text-[#0A1628] shadow-lg md:hidden"
          aria-label="Add savings goal"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </DashboardLayout>
  );
}
