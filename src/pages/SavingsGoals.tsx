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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PiggyBank, Plus, CalendarIcon, Target, TrendingUp, Trash2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);

  // Form state
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalDescription, setNewGoalDescription] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalDeadline, setNewGoalDeadline] = useState<Date | undefined>();
  const [contributionAmount, setContributionAmount] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setGoals(data);
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
      loadGoals();
    }
    setSaving(false);
  };

  const contributeToGoal = async () => {
    if (!selectedGoal || !contributionAmount) return;
    setSaving(true);

    const newAmount = selectedGoal.current_amount + parseFloat(contributionAmount);
    const newStatus = newAmount >= selectedGoal.target_amount ? "completed" : "active";

    const { error } = await supabase
      .from("savings_goals")
      .update({ current_amount: newAmount, status: newStatus })
      .eq("id", selectedGoal.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Added $${contributionAmount} to your goal!` });
      setContributeOpen(false);
      setContributionAmount("");
      setSelectedGoal(null);
      loadGoals();
    }
    setSaving(false);
  };

  const deleteGoal = async (goalId: string) => {
    const { error } = await supabase.from("savings_goals").delete().eq("id", goalId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Goal deleted" });
      loadGoals();
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
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Savings Goals</h1>
            <p className="text-muted-foreground">Track your savings progress</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
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
          <Card>
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
          <Card>
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
          <Card>
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
          <Card>
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
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : goals.length === 0 ? (
          <Card className="p-12 text-center">
            <PiggyBank className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No savings goals yet</h3>
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
                <Card key={goal.id} className="overflow-hidden">
                  <div className="h-2" style={{ backgroundColor: goal.color }} />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{goal.name}</CardTitle>
                        {goal.description && (
                          <CardDescription className="mt-1">{goal.description}</CardDescription>
                        )}
                      </div>
                      <Badge variant={goal.status === "completed" ? "default" : "secondary"}>
                        {goal.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>${goal.current_amount.toLocaleString()} saved</span>
                        <span className="text-muted-foreground">${goal.target_amount.toLocaleString()}</span>
                      </div>
                      <Progress value={progress} className="h-3" />
                      <p className="text-sm text-muted-foreground mt-1">{progress}% complete</p>
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
                          className="flex-1"
                          onClick={() => {
                            setSelectedGoal(goal);
                            setContributeOpen(true);
                          }}
                        >
                          Add Progress
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteGoal(goal.id)}
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Progress</DialogTitle>
              <DialogDescription>Record your savings progress for "{selectedGoal?.name}"</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
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
              <Button onClick={contributeToGoal} disabled={saving || !contributionAmount}>
                {saving ? "Adding..." : "Add Progress"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
