import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { CreditCard, Snowflake, Sun, Loader2 } from "lucide-react";

interface CardData {
  id: string;
  card_number: string;
  card_type: string;
  status: string;
  daily_limit: number;
  expires_at: string;
  frozen_at: string | null;
  account_id: string;
}

export default function CardsPage() {
  const { toast: uiToast } = useToast();
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => { loadCards(); }, []);

  const loadCards = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("cards").select("*").eq("user_id", user.id);
    if (error) { toast.error(error.message); return; }
    if (data) setCards(data);
    setLoading(false);
  };

  const toggleFreeze = async (card: CardData) => {
    setToggling(card.id);
    const newStatus = card.status === "frozen" ? "active" : "frozen";
    const { error } = await supabase.from("cards").update({
      status: newStatus,
      frozen_at: newStatus === "frozen" ? new Date().toISOString() : null,
    }).eq("id", card.id);

    if (error) {
      uiToast({ title: "Failed to update card", description: error.message, variant: "destructive" });
    } else {
      uiToast({ title: newStatus === "frozen" ? "Card frozen" : "Card unfrozen" });
      loadCards();
    }
    setToggling(null);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <h2 className="text-2xl font-bold">My Cards</h2>

        {cards.length === 0 ? (
          <Card className="p-8 text-center">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No cards found. A card will be issued with your next account.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map(card => (
              <div key={card.id} className="relative">
                {/* Visual Card */}
                <div className={`rounded-2xl p-6 text-primary-foreground aspect-[1.6/1] flex flex-col justify-between ${
                  card.status === "frozen"
                    ? "bg-gradient-to-br from-slate-400 to-slate-600"
                    : "bg-gradient-to-br from-primary to-primary/80"
                }`}>
                  <div className="flex justify-between items-start">
                    <span className="text-xs opacity-80 uppercase">{card.card_type} Card</span>
                    {card.status === "frozen" && <Snowflake className="h-5 w-5 opacity-80" />}
                  </div>
                  <div>
                    <p className="text-lg tracking-[0.2em] font-mono mb-1">{card.card_number}</p>
                    <p className="text-xs opacity-70">Expires {new Date(card.expires_at).toLocaleDateString("en-US", { month: "2-digit", year: "2-digit" })}</p>
                  </div>
                </div>

                {/* Card Actions */}
                <Card className="mt-3 p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`font-medium capitalize ${card.status === "active" ? "text-green-600" : "text-yellow-600"}`}>{card.status}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Daily Limit</span>
                    <span className="font-medium">${card.daily_limit.toLocaleString()}</span>
                  </div>
                  <Button
                    variant={card.status === "frozen" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => toggleFreeze(card)}
                    disabled={toggling === card.id}
                  >
                    {toggling === card.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : card.status === "frozen" ? (
                      <Sun className="h-4 w-4 mr-2" />
                    ) : (
                      <Snowflake className="h-4 w-4 mr-2" />
                    )}
                    {card.status === "frozen" ? "Unfreeze Card" : "Freeze Card"}
                  </Button>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
