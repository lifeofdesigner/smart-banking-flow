import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface CurrencyRate {
  id: string;
  base_currency: string;
  target_currency: string;
  rate: number;
  updated_at: string;
}

export default function CurrencyRatesManager() {
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState("");

  useEffect(() => { loadRates(); }, []);

  const loadRates = async () => {
    const { data } = await supabase.from("currency_rates" as unknown).select("*").order("base_currency");
    if (data) setRates(data as unknown);
    setLoading(false);
  };

  const updateRate = async (id: string) => {
    const newRate = parseFloat(editRate);
    if (isNaN(newRate) || newRate <= 0) {
      toast.error("Invalid rate");
      return;
    }
    const { error } = await supabase.from("currency_rates" as unknown).update({ rate: newRate, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Rate updated");
      setEditingId(null);
      loadRates();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Currency Exchange Rates
        </CardTitle>
        <CardDescription>Manage exchange rates for multi-currency support</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground animate-pulse">Loading rates...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono font-medium">{r.base_currency}</TableCell>
                  <TableCell className="font-mono font-medium">{r.target_currency}</TableCell>
                  <TableCell>
                    {editingId === r.id ? (
                      <Input
                        type="number"
                        step="0.000001"
                        value={editRate}
                        onChange={e => setEditRate(e.target.value)}
                        className="w-32"
                      />
                    ) : (
                      <span className="font-mono">{r.rate}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.updated_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {editingId === r.id ? (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => updateRate(r.id)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(r.id); setEditRate(r.rate.toString()); }}>
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
