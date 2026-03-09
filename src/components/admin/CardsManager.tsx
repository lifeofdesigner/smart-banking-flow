import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CreditCard, Search, Loader2 } from "lucide-react";

interface CardRecord {
  id: string;
  card_number: string;
  card_type: string;
  status: string;
  daily_limit: number;
  expires_at: string;
  frozen_at: string | null;
  created_at: string;
  user_id: string;
  account_id: string;
  profiles?: { full_name: string; email: string };
  accounts?: { account_number: string };
}

export default function CardsManager() {
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    const { data, error } = await supabase
      .from("cards")
      .select("*, profiles(full_name, email), accounts(account_number)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load cards");
    } else {
      setCards(data || []);
    }
    setLoading(false);
  };

  const updateCardStatus = async (cardId: string, status: string) => {
    const updateData: any = { status };
    if (status === "frozen") {
      updateData.frozen_at = new Date().toISOString();
    } else if (status === "active") {
      updateData.frozen_at = null;
    }

    const { error } = await supabase
      .from("cards")
      .update(updateData)
      .eq("id", cardId);

    if (error) {
      toast.error("Failed to update card");
    } else {
      toast.success("Card status updated");
      loadCards();
    }
  };

  const updateDailyLimit = async (cardId: string, limit: number) => {
    const { error } = await supabase
      .from("cards")
      .update({ daily_limit: limit })
      .eq("id", cardId);

    if (error) {
      toast.error("Failed to update limit");
    } else {
      toast.success("Daily limit updated");
      loadCards();
    }
  };

  const filtered = cards.filter(c =>
    c.card_number.includes(search) ||
    c.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.profiles?.email?.toLowerCase().includes(search.toLowerCase())
  );

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
          <CreditCard className="h-5 w-5" />
          Cards Management
        </CardTitle>
        <CardDescription>Manage user debit cards, limits, and statuses</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by card number, name, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Card Number</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Daily Limit</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((card) => (
              <TableRow key={card.id}>
                <TableCell className="font-mono">{card.card_number}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{card.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{card.profiles?.email}</p>
                  </div>
                </TableCell>
                <TableCell className="capitalize">{card.card_type}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="w-24"
                    defaultValue={card.daily_limit}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (val !== card.daily_limit && val > 0) {
                        updateDailyLimit(card.id, val);
                      }
                    }}
                  />
                </TableCell>
                <TableCell>{new Date(card.expires_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={card.status === "active" ? "default" : "destructive"}>
                    {card.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select value={card.status} onValueChange={(v) => updateCardStatus(card.id, v)}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="frozen">Frozen</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No cards found</p>
        )}
      </CardContent>
    </Card>
  );
}
