import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LineChart, Search, Loader2 } from "lucide-react";

interface Investment {
  id: string;
  product_name: string;
  investment_type: string;
  principal: number;
  current_value: number;
  interest_rate: number;
  maturity_date: string | null;
  status: string;
  created_at: string;
  user_id: string;
  profiles?: { full_name: string; email: string };
}

export default function InvestmentsManager() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadInvestments();
  }, []);

  const loadInvestments = async () => {
    const { data, error } = await supabase
      .from("investments")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load investments");
    } else {
      setInvestments(data || []);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("investments")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update investment");
    } else {
      toast.success("Investment status updated");
      loadInvestments();
    }
  };

  const updateCurrentValue = async (id: string, value: number) => {
    const { error } = await supabase
      .from("investments")
      .update({ current_value: value })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update value");
    } else {
      toast.success("Value updated");
      loadInvestments();
    }
  };

  const filtered = investments.filter(i =>
    i.product_name.toLowerCase().includes(search.toLowerCase()) ||
    i.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.profiles?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPrincipal = investments.reduce((s, i) => s + i.principal, 0);
  const totalValue = investments.reduce((s, i) => s + i.current_value, 0);

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
          <LineChart className="h-5 w-5" />
          Investments Management
        </CardTitle>
        <CardDescription>
          Monitor and manage user investments. Total Principal: ${totalPrincipal.toLocaleString()} | Current Value: ${totalValue.toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product name, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Investor</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Principal</TableHead>
              <TableHead>Current Value</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Maturity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.product_name}</TableCell>
                <TableCell>
                  <div>
                    <p>{inv.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{inv.profiles?.email}</p>
                  </div>
                </TableCell>
                <TableCell className="capitalize">{inv.investment_type.replace(/_/g, " ")}</TableCell>
                <TableCell>${inv.principal.toLocaleString()}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="w-28"
                    defaultValue={inv.current_value}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (val !== inv.current_value && val >= 0) {
                        updateCurrentValue(inv.id, val);
                      }
                    }}
                  />
                </TableCell>
                <TableCell>{inv.interest_rate}%</TableCell>
                <TableCell>
                  {inv.maturity_date ? new Date(inv.maturity_date).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={inv.status === "active" ? "default" : "secondary"}>
                    {inv.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select value={inv.status} onValueChange={(v) => updateStatus(inv.id, v)}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="matured">Matured</SelectItem>
                      <SelectItem value="withdrawn">Withdrawn</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No investments found</p>
        )}
      </CardContent>
    </Card>
  );
}
