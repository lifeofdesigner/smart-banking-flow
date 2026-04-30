import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign } from "lucide-react";

const db = supabase as unknown;

interface Referral {
  id: string;
  referrer_user_id: string;
  referred_user_id: string | null;
  referral_code: string;
  status: string;
  reward_issued: boolean;
  reward_amount: number;
  created_at: string;
  referrer_name?: string;
  referred_name?: string;
}

export default function ReferralsManager() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReferrals(); }, []);

  const loadReferrals = async () => {
    const { data } = await db
      .from("referrals")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      const userIds = [...new Set(data.flatMap((r: unknown) => [r.referrer_user_id, r.referred_user_id].filter(Boolean)))] as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      setReferrals(data.map((r: unknown) => ({
        ...r,
        referrer_name: profileMap.get(r.referrer_user_id) || "Unknown",
        referred_name: r.referred_user_id ? (profileMap.get(r.referred_user_id) || "Unknown") : "—",
      })));
    }
    setLoading(false);
  };

  const totalRewards = referrals.filter(r => r.reward_issued).reduce((s, r) => s + Number(r.reward_amount), 0);
  const completedCount = referrals.filter(r => r.status === "completed").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Referrals Management</CardTitle>
        <CardDescription>
          {referrals.length} total referrals • {completedCount} completed • ${totalRewards.toFixed(2)} rewards issued
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground animate-pulse">Loading referrals...</div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No referrals yet</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referrer</TableHead>
                <TableHead>Referred User</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.referrer_name}</TableCell>
                  <TableCell>{r.referred_name}</TableCell>
                  <TableCell className="font-mono">{r.referral_code}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "completed" ? "default" : "secondary"}>{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.reward_issued ? (
                      <span className="text-green-600 font-medium flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />{Number(r.reward_amount).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Pending</span>
                    )}
                  </TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
