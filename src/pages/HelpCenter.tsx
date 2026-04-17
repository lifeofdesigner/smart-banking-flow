import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HelpCircle, MessageSquare, AlertCircle, Phone, Mail, Clock, Search, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const faqs = [
  {
    category: "Account",
    questions: [
      { q: "How do I reset my password?", a: "Go to Security Settings and click 'Change Password'." },
      { q: "How do I update my personal information?", a: "Navigate to your Profile page from the sidebar." },
      { q: "What is KYC verification?", a: "KYC verification is required to verify your identity before making transfers or applying for loans." },
    ],
  },
  {
    category: "Transfers",
    questions: [
      { q: "What are the transfer limits?", a: "Standard accounts have a daily limit of $5,000 and per-transaction limit of $2,000." },
      { q: "How long do wire transfers take?", a: "International wire transfers typically take 3-5 business days." },
      { q: "Are there fees for transfers?", a: "Internal transfers between your own accounts are free. External transfers may have fees." },
    ],
  },
  {
    category: "Loans",
    questions: [
      { q: "How do I apply for a loan?", a: "Go to the Loans page, select a product, enter the amount, and submit." },
      { q: "Can I pay off my loan early?", a: "Yes, you can make early repayments without prepayment penalties." },
    ],
  },
  {
    category: "Security",
    questions: [
      { q: "Is my data secure?", a: "Yes, we use bank-grade encryption to protect your data." },
      { q: "What should I do if I notice suspicious activity?", a: "Change your password immediately and contact support." },
    ],
  },
];

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  message: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  created_at: string;
}

export default function HelpCenter() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => { loadTickets(); }, []);

  const loadTickets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("support_tickets" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setTickets(data as any);
    setLoadingTickets(false);
  };

  const filteredFaqs = faqs
    .map((c) => ({ ...c, questions: c.questions.filter((q) => q.q.toLowerCase().includes(searchTerm.toLowerCase()) || q.a.toLowerCase().includes(searchTerm.toLowerCase())) }))
    .filter((c) => c.questions.length > 0);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("support_tickets" as any).insert({
      user_id: user.id,
      subject,
      category,
      message,
      priority,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ticket Submitted", description: "We'll get back to you within 24 hours." });
      setSubject("");
      setMessage("");
      setCategory("general");
      setPriority("medium");
      loadTickets();
    }
    setSubmitting(false);
  };

  const statusColor = (s: string) => (s === "open" ? "destructive" : s === "replied" ? "default" : "secondary");

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F4F5F7] p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#0A1628] border-l-4 border-[#C9A84C] pl-3">Help Center</h1>
          <p className="text-muted-foreground mt-1">Find answers and get support</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10"><Phone className="h-5 w-5 text-primary" /></div>
                <div><p className="font-medium">Phone Support</p><p className="text-sm text-muted-foreground">+1 (800) 123-4567</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10"><Mail className="h-5 w-5 text-primary" /></div>
                <div><p className="font-medium">Email Support</p><p className="text-sm text-muted-foreground">support@microfinance.com</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div>
                <div><p className="font-medium">Support Hours</p><p className="text-sm text-muted-foreground">Mon-Fri, 8AM - 8PM EST</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="faq">
          <TabsList className="mb-4 grid h-auto w-full grid-cols-2 rounded-xl border border-[#E6EAF0] bg-white p-1 shadow-sm md:inline-flex md:w-auto md:flex-wrap">
            <TabsTrigger value="faq" className="rounded-lg px-4 py-2 data-[state=active]:bg-[var(--bank-navy)] data-[state=active]:text-white">
              <HelpCircle className="mr-2 h-4 w-4" />
              <span className="md:hidden">Help</span>
              <span className="hidden md:inline">FAQs</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="hidden rounded-lg px-4 py-2 data-[state=active]:bg-[var(--bank-navy)] data-[state=active]:text-white md:inline-flex">
              <MessageSquare className="h-4 w-4 mr-2" />Submit Ticket
            </TabsTrigger>
            <TabsTrigger value="tickets" className="rounded-lg px-4 py-2 data-[state=active]:bg-[var(--bank-navy)] data-[state=active]:text-white">
              <Ticket className="h-4 w-4 mr-2" />My Tickets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faq">
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search FAQs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
              </CardHeader>
              <CardContent>
                {filteredFaqs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No matching questions found</div>
                ) : (
                  <div className="space-y-6">
                    {filteredFaqs.map((cat) => (
                      <div key={cat.category}>
                        <h3 className="font-semibold mb-3 text-lg">{cat.category}</h3>
                        <Accordion type="single" collapsible className="space-y-2">
                          {cat.questions.map((item, idx) => (
                            <AccordionItem key={idx} value={`${cat.category}-${idx}`} className="border rounded-lg px-4">
                              <AccordionTrigger className="hover:no-underline">{item.q}</AccordionTrigger>
                              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 space-y-4 rounded-2xl border border-[#E6EAF0] bg-[#F8FAFC] p-4 md:hidden">
                  <div className="flex items-center gap-2 text-[#0A1628]">
                    <MessageSquare className="h-4 w-4" />
                    <p className="text-sm font-semibold">Need more help?</p>
                  </div>
                  <Button
                    type="button"
                    className="h-11 w-full bg-[var(--bank-navy)] hover:bg-[var(--bank-slate)]"
                    onClick={() => {
                      const trigger = document.querySelector('[data-value="contact"]') as HTMLButtonElement | null;
                      trigger?.click();
                    }}
                  >
                    Submit Support Ticket
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle>Submit a Support Ticket</CardTitle>
                <CardDescription>We'll respond within 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitTicket} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="transaction">Transaction Problem</SelectItem>
                          <SelectItem value="account">Account Issue</SelectItem>
                          <SelectItem value="transfer">Transfer Issue</SelectItem>
                          <SelectItem value="security">Security Concern</SelectItem>
                          <SelectItem value="technical">Technical Bug</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input placeholder="Brief description of your issue" value={subject} onChange={(e) => setSubject(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea placeholder="Describe your issue in detail..." value={message} onChange={(e) => setMessage(e.target.value)} rows={6} required />
                  </div>
                  <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Ticket"}</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <CardTitle>My Support Tickets</CardTitle>
                <CardDescription>Track the status of your requests</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTickets ? (
                  <div className="text-center py-8 text-muted-foreground animate-pulse">Loading...</div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No tickets submitted yet</div>
                ) : (
                  <div className="space-y-4">
                    {tickets.map((t) => (
                      <Card key={t.id} className="border">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium">{t.subject}</h4>
                              <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()} · {t.category}</p>
                            </div>
                            <Badge variant={statusColor(t.status) as any}>{t.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{t.message}</p>
                          {t.admin_reply && (
                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                              <p className="text-xs font-medium text-primary mb-1">Support Reply:</p>
                              <p className="text-sm">{t.admin_reply}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
