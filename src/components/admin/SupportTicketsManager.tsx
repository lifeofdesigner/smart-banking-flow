import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Reply } from "lucide-react";
import { toast } from "sonner";

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  message: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  created_at: string;
  user_name?: string;
}

export default function SupportTicketsManager() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTicket, setReplyTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);

  useEffect(() => { loadTickets(); }, []);

  const loadTickets = async () => {
    const { data } = await supabase.from("support_tickets" as any).select("*").order("created_at", { ascending: false });
    if (data) {
      const userIds = [...new Set((data as any[]).map((t: any) => t.user_id).filter(Boolean))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      setTickets((data as any[]).map((t: any) => ({ ...t, user_name: profileMap.get(t.user_id) || "Unknown" })));
    }
    setLoading(false);
  };

  const handleReply = async () => {
    if (!replyTicket || !reply.trim()) return;
    setReplying(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("support_tickets" as any)
      .update({ admin_reply: reply, replied_at: new Date().toISOString(), replied_by: user?.id, status: "replied", updated_at: new Date().toISOString() })
      .eq("id", replyTicket.id);
    if (error) toast.error(error.message);
    else {
      // Send notification to user
      await supabase.from("notifications").insert({
        user_id: replyTicket.user_id,
        type: "info",
        title: "Support Reply",
        message: `Your ticket "${replyTicket.subject}" has been responded to.`,
      });
      toast.success("Reply sent");
      setReplyTicket(null);
      setReply("");
      loadTickets();
    }
    setReplying(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("support_tickets" as any).update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    loadTickets();
  };

  const statusColor = (s: string) => s === "open" ? "destructive" : s === "replied" ? "default" : "secondary";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Support Tickets</CardTitle>
          <CardDescription>{tickets.filter(t => t.status === "open").length} open tickets</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No support tickets</div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{t.user_name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{t.subject}</TableCell>
                      <TableCell className="capitalize">{t.category}</TableCell>
                      <TableCell>
                        <Badge variant={t.priority === "high" ? "destructive" : "secondary"}>{t.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColor(t.status) as any}>{t.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => { setReplyTicket(t); setReply(t.admin_reply || ""); }}>
                            <Reply className="h-3 w-3 mr-1" />Reply
                          </Button>
                          {t.status !== "closed" && (
                            <Button size="sm" variant="ghost" onClick={() => updateStatus(t.id, "closed")}>Close</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!replyTicket} onOpenChange={() => setReplyTicket(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reply to: {replyTicket?.subject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Customer message:</p>
              <p className="text-sm">{replyTicket?.message}</p>
            </div>
            <Textarea
              placeholder="Type your reply..."
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReplyTicket(null)}>Cancel</Button>
            <Button onClick={handleReply} disabled={replying || !reply.trim()}>
              {replying ? "Sending..." : "Send Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
