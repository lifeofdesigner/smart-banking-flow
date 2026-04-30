import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function TransactionReversal() {
  const [txId, setTxId] = useState("");
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleReverse = async () => {
    if (!txId.trim()) { toast.error("Enter a transaction ID"); return; }
    if (!reason.trim()) { toast.error("Enter a reason for reversal"); return; }

    setProcessing(true);
    setResult(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("reverse_transaction", {
        p_transaction_id: txId.trim(),
        p_admin_id: user.id,
        p_reason: reason.trim(),
      });

      if (error) throw error;
      setResult(`Reversal successful. New transaction ID: ${data}`);
      toast.success("Transaction reversed successfully");
      setTxId("");
      setReason("");
    } catch (e: unknown) {
      toast.error(e.message);
      setResult(`Error: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5" /> Transaction Reversal</CardTitle>
        <CardDescription>Reverse a completed transaction by creating a counter ledger entry</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>This creates a reversing ledger entry. The original transaction record is preserved and marked as "reversed".</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="txId">Transaction ID</Label>
          <Input id="txId" placeholder="e.g. a1b2c3d4-..." value={txId} onChange={e => setTxId(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Reason for Reversal</Label>
          <Textarea id="reason" placeholder="Explain why this transaction is being reversed..." value={reason} onChange={e => setReason(e.target.value)} />
        </div>

        <Button onClick={handleReverse} disabled={processing} variant="destructive">
          <RotateCcw className={`h-4 w-4 mr-2 ${processing ? "animate-spin" : ""}`} />
          {processing ? "Processing..." : "Reverse Transaction"}
        </Button>

        {result && (
          <div className={`p-3 rounded-md text-sm ${result.startsWith("Error") ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
            {result}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
