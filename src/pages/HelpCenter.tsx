import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, MessageSquare, AlertCircle, Phone, Mail, Clock, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const faqs = [
  {
    category: "Account",
    questions: [
      {
        q: "How do I reset my password?",
        a: "You can reset your password by going to Security Settings and clicking 'Change Password'. You'll need to enter your current password and then create a new one."
      },
      {
        q: "How do I update my personal information?",
        a: "Navigate to your Profile page from the sidebar. There you can update your phone number, address, and other personal details."
      },
      {
        q: "What is KYC verification?",
        a: "KYC (Know Your Customer) verification is a process to verify your identity. You'll need to submit a government-issued ID and proof of address. This is required for certain services and transaction limits."
      }
    ]
  },
  {
    category: "Transfers",
    questions: [
      {
        q: "What are the transfer limits?",
        a: "Transfer limits vary based on your account type and KYC status. Standard accounts have a daily limit of $5,000 and per-transaction limit of $2,000. Contact support for higher limits."
      },
      {
        q: "How long do wire transfers take?",
        a: "International wire transfers typically take 3-5 business days. Domestic transfers are usually processed within 1-2 business days."
      },
      {
        q: "Are there fees for transfers?",
        a: "Internal transfers between your own accounts are free. Transfers to other accounts have a small fee. Wire transfers have additional processing fees based on the destination country."
      }
    ]
  },
  {
    category: "Loans",
    questions: [
      {
        q: "How do I apply for a loan?",
        a: "Go to the Loans page, select a loan product that suits your needs, enter the desired amount, and submit your application. You'll receive a decision within 24-48 hours."
      },
      {
        q: "What documents are needed for a loan?",
        a: "You'll need valid identification, proof of income, and completed KYC verification. Additional documents may be required based on the loan amount."
      },
      {
        q: "Can I pay off my loan early?",
        a: "Yes, you can make early repayments without any prepayment penalties. Simply go to your active loan and click 'Make Payment' for any pending installment."
      }
    ]
  },
  {
    category: "Security",
    questions: [
      {
        q: "Is my data secure?",
        a: "Yes, we use bank-grade encryption to protect your data. All communications are encrypted using SSL/TLS, and we follow industry best practices for data security."
      },
      {
        q: "What should I do if I notice suspicious activity?",
        a: "Immediately change your password, contact our support team, and review your recent transactions. We take all security concerns seriously."
      },
      {
        q: "How can I protect my account?",
        a: "Use a strong, unique password. Enable two-factor authentication when available. Never share your login credentials. Always log out on shared devices."
      }
    ]
  }
];

export default function HelpCenter() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [issueType, setIssueType] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(searchTerm.toLowerCase()) || 
           q.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({ title: "Message Sent", description: "We'll get back to you within 24 hours." });
    setContactSubject("");
    setContactMessage("");
    setSubmitting(false);
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({ title: "Issue Reported", description: "Your issue has been logged. We'll investigate and update you." });
    setIssueType("");
    setIssueDescription("");
    setSubmitting(false);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Help Center</h1>
          <p className="text-muted-foreground">Find answers and get support</p>
        </div>

        {/* Quick Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Phone Support</p>
                  <p className="text-sm text-muted-foreground">+1 (800) 123-4567</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Email Support</p>
                  <p className="text-sm text-muted-foreground">support@microfinance.com</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Support Hours</p>
                  <p className="text-sm text-muted-foreground">Mon-Fri, 8AM - 8PM EST</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="faq">
          <TabsList className="mb-4">
            <TabsTrigger value="faq">
              <HelpCircle className="h-4 w-4 mr-2" />
              FAQs
            </TabsTrigger>
            <TabsTrigger value="contact">
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Us
            </TabsTrigger>
            <TabsTrigger value="report">
              <AlertCircle className="h-4 w-4 mr-2" />
              Report Issue
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faq">
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>Find quick answers to common questions</CardDescription>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search FAQs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {filteredFaqs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No matching questions found</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredFaqs.map((category) => (
                      <div key={category.category}>
                        <h3 className="font-semibold mb-3 text-lg">{category.category}</h3>
                        <Accordion type="single" collapsible className="space-y-2">
                          {category.questions.map((item, idx) => (
                            <AccordionItem
                              key={idx}
                              value={`${category.category}-${idx}`}
                              className="border rounded-lg px-4"
                            >
                              <AccordionTrigger className="hover:no-underline">
                                {item.q}
                              </AccordionTrigger>
                              <AccordionContent className="text-muted-foreground">
                                {item.a}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle>Contact Support</CardTitle>
                <CardDescription>Send us a message and we'll respond within 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      placeholder="What can we help you with?"
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                      placeholder="Describe your question or concern in detail..."
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      rows={6}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="report">
            <Card>
              <CardHeader>
                <CardTitle>Report an Issue</CardTitle>
                <CardDescription>Let us know about any problems you've encountered</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleIssueSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Issue Type</Label>
                    <Select value={issueType} onValueChange={setIssueType} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select issue type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transaction">Transaction Problem</SelectItem>
                        <SelectItem value="account">Account Access Issue</SelectItem>
                        <SelectItem value="transfer">Transfer Failed</SelectItem>
                        <SelectItem value="security">Security Concern</SelectItem>
                        <SelectItem value="technical">Technical Bug</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Please provide details about the issue, including any error messages you've seen..."
                      value={issueDescription}
                      onChange={(e) => setIssueDescription(e.target.value)}
                      rows={6}
                      required
                    />
                  </div>
                  <div className="p-4 bg-yellow-500/10 rounded-lg text-sm">
                    <p className="font-medium text-yellow-700 dark:text-yellow-500 mb-1">Important</p>
                    <p className="text-muted-foreground">
                      If this is a security concern or you notice unauthorized transactions, please also contact us immediately at our support hotline.
                    </p>
                  </div>
                  <Button type="submit" disabled={submitting || !issueType}>
                    {submitting ? "Submitting..." : "Submit Report"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
