import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Share2, Gift, Users, DollarSign, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface Referral {
  id: string;
  referred_user_id: string | null;
  referral_code: string;
  status: string;
  reward_issued: boolean;
  reward_amount: number;
  created_at: string;
}

export default function ReferralProgram() {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [applying, setApplying] = useState(false);
  const [hasUsedCode, setHasUsedCode] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles").select("referral_code").eq("id", user.id).single();
    setReferralCode((profile as any)?.referral_code || null);

    const { data: refs } = await supabase
      .from("referrals" as any).select("*").eq("referrer_user_id", user.id)
      .order("created_at", { ascending: false });
    setReferrals((refs as Referral[]) || []);

    const { data: usedRef } = await supabase
      .from("referrals" as any).select("id").eq("referred_user_id", user.id).maybeSingle();
    setHasUsedCode(!!usedRef);

    setLoading(false);
  };

  const copyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast({ title: "Copied!", description: "Referral code copied to clipboard" });
    }
  };

  const shareCode = () => {
    if (referralCode) {
      const text = `Join MicroFinance Bank with my referral code: ${referralCode}`;
      if (navigator.share) {
        navigator.share({ title: "Join MicroFinance Bank", text });
      } else {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied!", description: "Share text copied to clipboard" });
      }
    }
  };

  const applyCode = async () => {
    if (!codeInput.trim()) return;
    setApplying(true);
    try {
      const { data, error } = await supabase.rpc("apply_referral_code" as any, { p_code: codeInput.trim() });
      if (error) throw error;
      toast({ title: "Success!", description: data as string });
      setCodeInput("");
      setHasUsedCode(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setApplying(false);
  };

  const totalRewards = referrals.filter(r => r.reward_issued).reduce((s, r) => s + Number(r.reward_amount), 0);
  const completedReferrals = referrals.filter(r => r.reward_issued).length;
  const pendingReferrals = referrals.filter(r => !r.reward_issued).length;

  const getStatusBadge = (referral: Referral) => {
    if (referral.reward_issued) return <Badge className="bg-green-100 text-green-800">Rewarded</Badge>;
    if (referral.status === 'pending') return <Badge variant="secondary">Pending</Badge>;
    return <Badge variant="outline">{referral.status}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Referral Program</h1>
          <p className="text-muted-foreground">Invite friends and earn $25 for each successful referral</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Referrals</p>
                  <p className="text-2xl font-bold">{referrals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10"><DollarSign className="h-5 w-5 text-green-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Rewards Earned</p>
                  <p className="text-2xl font-bold">${totalRewards.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10"><Clock className="h-5 w-5 text-yellow-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Referrals</p>
                  <p className="text-2xl font-bold">{pendingReferrals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Referral Code Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5" /> Your Referral Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="h-16 bg-muted animate-pulse rounded-lg" />
              ) : (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
                  <p className="text-3xl font-mono font-bold tracking-widest text-primary">{referralCode || "—"}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button className="flex-1" onClick={copyCode} disabled={!referralCode}>
                  <Copy className="h-4 w-4 mr-2" /> Copy Code
                </Button>
                <Button variant="outline" onClick={shareCode} disabled={!referralCode}>
                  <Share2 className="h-4 w-4 mr-2" /> Share
                </Button>
              </div>
              <div className="pt-2 border-t space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2"><CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" /><span>Share your code with friends</span></div>
                <div className="flex items-start gap-2"><CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" /><span>Friend signs up and completes their first transaction</span></div>
                <div className="flex items-start gap-2"><CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" /><span>You automatically receive $25 reward</span></div>
              </div>
            </CardContent>
          </Card>

          {/* Enter a referral code */}
          <Card>
            <CardHeader>
              <CardTitle>Were You Referred?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasUsedCode ? (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Referral code applied!</p>
                    <p className="text-sm text-green-600">Your referrer will earn a reward after your first transaction.</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm">If a friend invited you, enter their referral code below. They'll earn $25 after your first transaction.</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter referral code (e.g. ABC12345)"
                      value={codeInput}
                      onChange={e => setCodeInput(e.target.value.toUpperCase())}
                      className="font-mono"
                      onKeyDown={e => e.key === 'Enter' && applyCode()}
                    />
                    <Button onClick={applyCode} disabled={applying || !codeInput.trim()}>
                      {applying ? "Applying..." : "Apply"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Referral History */}
        <Card>
          <CardHeader>
            <CardTitle>Referral History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
            ) : referrals.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No referrals yet. Share your code to get started!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left py-2 text-muted-foreground font-medium">Date</th><th className="text-left py-2 text-muted-foreground font-medium">Code Used</th><th className="text-left py-2 text-muted-foreground font-medium">Status</th><th className="text-right py-2 text-muted-foreground font-medium">Reward</th></tr></thead>
                  <tbody>
                    {referrals.map(r => (
                      <tr key={r.id} className="border-b hover:bg-muted/30">
                        <td className="py-3">{format(new Date(r.created_at), "MMM d, yyyy")}</td>
                        <td className="py-3 font-mono">{r.referral_code}</td>
                        <td className="py-3">{getStatusBadge(r)}</td>
                        <td className="py-3 text-right">{r.reward_issued ? <span className="text-green-600 font-medium">+${Number(r.reward_amount).toFixed(2)}</span> : <span className="text-muted-foreground">Pending</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
