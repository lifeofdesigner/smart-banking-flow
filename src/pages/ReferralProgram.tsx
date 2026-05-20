import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
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

const db = supabase as unknown;

export default function ReferralProgram() {
  const siteSettings = useSiteSettings();
  const siteName = siteSettings["site_name"] || "Your Bank";
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
    const { data: profile } = await supabase.from("profiles").select("referral_code").eq("id", user.id).single();
    setReferralCode((profile as unknown)?.referral_code ?? null);
    const { data: refs } = await db.from("referrals").select("*").eq("referrer_user_id", user.id).order("created_at", { ascending: false });
    setReferrals(refs || []);
    const { data: usedRef } = await db.from("referrals").select("id").eq("referred_user_id", user.id).maybeSingle();
    setHasUsedCode(!!usedRef);
    setLoading(false);
  };

  const copyCode = () => {
    if (referralCode) { navigator.clipboard.writeText(referralCode); toast({ title: "Copied!", description: "Referral code copied to clipboard" }); }
  };
  const shareCode = () => {
    if (referralCode) {
      const text = `Join ${siteName} with my referral code: ${referralCode}`;
      if (navigator.share) navigator.share({ title: `Join ${siteName}`, text });
      else { navigator.clipboard.writeText(text); toast({ title: "Copied!", description: "Share text copied" }); }
    }
  };
  const applyCode = async () => {
    if (!codeInput.trim()) return;
    setApplying(true);
    try {
      const { data, error } = await db.rpc("apply_referral_code", { p_code: codeInput.trim() });
      if (error) throw error;
      toast({ title: "Success!", description: data });
      setCodeInput(""); setHasUsedCode(true);
    } catch (err: unknown) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    setApplying(false);
  };

  const totalRewards = referrals.filter(r => r.reward_issued).reduce((s, r) => s + Number(r.reward_amount), 0);
  const pendingCount = referrals.filter(r => !r.reward_issued).length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Referral Program</h1>
          <p className="text-muted-foreground">Invite friends and earn $25 for each successful referral</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Users, label: "Total Referrals", value: referrals.length, color: "bg-primary/10 text-primary" },
            { icon: DollarSign, label: "Rewards Earned", value: `$${totalRewards.toFixed(2)}`, color: "bg-green-500/10 text-green-600" },
            { icon: Clock, label: "Pending", value: pendingCount, color: "bg-yellow-500/10 text-yellow-600" },
          ].map(({ icon: Icon, label, value, color }) => (
            <Card key={label}><CardContent className="pt-6"><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div></div></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5" /> Your Referral Code</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
                <p className="text-3xl font-mono font-bold tracking-widest text-primary">{loading ? "..." : (referralCode || "—")}</p>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={copyCode} disabled={!referralCode}><Copy className="h-4 w-4 mr-2" />Copy Code</Button>
                <Button variant="outline" onClick={shareCode} disabled={!referralCode}><Share2 className="h-4 w-4 mr-2" />Share</Button>
              </div>
              <div className="pt-2 border-t space-y-2 text-sm text-muted-foreground">
                {["Share your code with friends", "Friend signs up and makes first transaction", "You automatically receive $25 reward"].map(t => (
                  <div key={t} className="flex items-start gap-2"><CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" /><span>{t}</span></div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Were You Referred?</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {hasUsedCode ? (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div><p className="font-medium">Referral code applied!</p><p className="text-sm text-muted-foreground">Your referrer earns $25 after your first transaction.</p></div>
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm">Enter a friend's code. They'll earn $25 after your first transaction.</p>
                  <div className="flex gap-2">
                    <Input placeholder="Enter referral code" value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} className="font-mono" onKeyDown={e => e.key === 'Enter' && applyCode()} />
                    <Button onClick={applyCode} disabled={applying || !codeInput.trim()}>{applying ? "Applying..." : "Apply"}</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Referral History</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}</div>
              : referrals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No referrals yet. Share your code to get started!</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left py-2 text-muted-foreground font-medium">Date</th><th className="text-left py-2 text-muted-foreground font-medium">Code</th><th className="text-left py-2 text-muted-foreground font-medium">Status</th><th className="text-right py-2 text-muted-foreground font-medium">Reward</th></tr></thead>
                    <tbody>{referrals.map(r => (
                      <tr key={r.id} className="border-b hover:bg-muted/30">
                        <td className="py-3">{format(new Date(r.created_at), "MMM d, yyyy")}</td>
                        <td className="py-3 font-mono">{r.referral_code}</td>
                        <td className="py-3">{r.reward_issued ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Rewarded</Badge> : <Badge variant="secondary">Pending</Badge>}</td>
                        <td className="py-3 text-right">{r.reward_issued ? <span className="text-green-600 font-medium">+${Number(r.reward_amount).toFixed(2)}</span> : <span className="text-muted-foreground">Pending</span>}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
