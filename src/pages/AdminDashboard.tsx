import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Users, CreditCard, Send, DollarSign, CheckCircle, XCircle, BookOpen, Heart, Shield, Bell, FileCheck, AlertTriangle, ScrollText, Gift } from "lucide-react";
import LedgerExplorer from "@/components/admin/LedgerExplorer";
import TransferLimitsManager from "@/components/admin/TransferLimitsManager";
import KYCReviews from "@/components/admin/KYCReviews";
import LoanManagement from "@/components/admin/LoanManagement";
import FeeManagement from "@/components/admin/FeeManagement";
import ContentManagement from "@/components/admin/ContentManagement";
import FraudAlerts from "@/components/admin/FraudAlerts";
import ReferralsManager from "@/components/admin/ReferralsManager";
import AuditLogs from "@/components/admin/AuditLogs";
import { toast } from "sonner";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [wireTransfers, setWireTransfers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [allBeneficiaries, setAllBeneficiaries] = useState<any[]>([]);
  const [allNotifications, setAllNotifications] = useState<any[]>([]);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasAdminRole = roles?.some(r => r.role === "admin");
      
      if (!hasAdminRole) {
        toast.error("Access denied: Admin privileges required");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      await fetchData();
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [usersRes, accountsRes, wiresRes, txRes, benRes, notifRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("accounts").select("*, profiles(full_name, email)").not("user_id", "is", null).order("created_at", { ascending: false }),
        supabase.from("wire_transfers").select("*, profiles(full_name, email)").order("created_at", { ascending: false }),
        supabase.from("transactions").select("*, accounts(account_number)").order("created_at", { ascending: false }),
        supabase.from("beneficiaries").select("*").order("created_at", { ascending: false }),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100),
      ]);

      if (usersRes.data) setUsers(usersRes.data);
      if (accountsRes.data) {
        const withBalances = accountsRes.data.map((acc: any) => ({
          ...acc,
          computed_balance: acc.available_balance ?? acc.balance ?? 0,
        }));
        setAccounts(withBalances);
      }
      if (wiresRes.data) setWireTransfers(wiresRes.data);
      if (txRes.data) setTransactions(txRes.data);
      if (benRes.data) {
        // Enrich with user names
        const enriched = await Promise.all(
          benRes.data.map(async (b: any) => {
            const user = usersRes.data?.find((u: any) => u.id === b.user_id);
            return { ...b, user_name: user?.full_name || "Unknown" };
          })
        );
        setAllBeneficiaries(enriched);
      }
      if (notifRes.data) {
        const enrichedNotifs = notifRes.data.map((n: any) => {
          const user = usersRes.data?.find((u: any) => u.id === n.user_id);
          return { ...n, user_name: user?.full_name || "Unknown" };
        });
        setAllNotifications(enrichedNotifs);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load admin data");
    }
  };

  const updateKycStatus = async (userId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ kyc_status: status })
        .eq("id", userId);

      if (error) throw error;
      toast.success("KYC status updated");
      fetchData();
    } catch (error) {
      console.error("Error updating KYC:", error);
      toast.error("Failed to update KYC status");
    }
  };

  const updateAccountStatus = async (accountId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("accounts")
        .update({ status })
        .eq("id", accountId);

      if (error) throw error;
      toast.success("Account status updated");
      fetchData();
    } catch (error) {
      console.error("Error updating account:", error);
      toast.error("Failed to update account status");
    }
  };

  const approveWireTransfer = async (transferId: string) => {
    try {
      const { error } = await supabase
        .from("wire_transfers")
        .update({ status: "completed" })
        .eq("id", transferId);

      if (error) throw error;
      toast.success("Wire transfer approved");
      fetchData();
    } catch (error) {
      console.error("Error approving transfer:", error);
      toast.error("Failed to approve transfer");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading admin panel...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Users className="h-4 w-4 text-muted-foreground mr-2" />
                <span className="text-2xl font-bold">{users.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <CreditCard className="h-4 w-4 text-muted-foreground mr-2" />
                <span className="text-2xl font-bold">{accounts.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Wire Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Send className="h-4 w-4 text-muted-foreground mr-2" />
                <span className="text-2xl font-bold">{wireTransfers.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 text-muted-foreground mr-2" />
                <span className="text-2xl font-bold">{transactions.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="wires">Wire Transfers</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
            <TabsTrigger value="beneficiaries">Beneficiaries</TabsTrigger>
            <TabsTrigger value="limits">Transfer Limits</TabsTrigger>
            <TabsTrigger value="loans">Loans</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="kyc">KYC Reviews</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user profiles and KYC verification</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>KYC Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={user.kyc_status === "verified" ? "default" : "secondary"}>
                            {user.kyc_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.kyc_status}
                            onValueChange={(value) => updateKycStatus(user.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="verified">Verified</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounts">
            <Card>
              <CardHeader>
                <CardTitle>Account Management</CardTitle>
                <CardDescription>View and manage user bank accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Number</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-mono">{account.account_number}</TableCell>
                        <TableCell>{account.profiles?.full_name}</TableCell>
                        <TableCell className="capitalize">{account.account_type}</TableCell>
                        <TableCell>${account.computed_balance?.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={account.status === "active" ? "default" : "secondary"}>
                            {account.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={account.status}
                            onValueChange={(value) => updateAccountStatus(account.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wires">
            <Card>
              <CardHeader>
                <CardTitle>Wire Transfer Management</CardTitle>
                <CardDescription>Monitor and approve wire transfers</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Beneficiary</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wireTransfers.map((wire) => (
                      <TableRow key={wire.id}>
                        <TableCell>{wire.profiles?.full_name}</TableCell>
                        <TableCell>{wire.beneficiary_name}</TableCell>
                        <TableCell>${wire.amount.toFixed(2)}</TableCell>
                        <TableCell>{wire.beneficiary_country}</TableCell>
                        <TableCell>{wire.current_stage}/5</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              wire.status === "completed"
                                ? "default"
                                : wire.status === "failed"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {wire.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {wire.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => approveWireTransfer(wire.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>View all system transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-xs">{tx.reference_number}</TableCell>
                        <TableCell className="font-mono">{tx.accounts?.account_number}</TableCell>
                        <TableCell className="capitalize">{tx.transaction_type}</TableCell>
                        <TableCell>${tx.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={tx.status === "completed" ? "default" : "secondary"}>
                            {tx.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="ledger">
            <LedgerExplorer />
          </TabsContent>

          <TabsContent value="beneficiaries">
            <Card>
              <CardHeader>
                <CardTitle>All Beneficiaries</CardTitle>
                <CardDescription>Overview of saved beneficiaries across all users</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Nickname</TableHead>
                      <TableHead>Account Number</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allBeneficiaries.map((b: any) => (
                      <TableRow key={b.id}>
                        <TableCell>{b.user_name}</TableCell>
                        <TableCell>{b.nickname}</TableCell>
                        <TableCell className="font-mono">{b.account_number}</TableCell>
                        <TableCell>{b.bank_name}</TableCell>
                        <TableCell>{new Date(b.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="limits">
            <TransferLimitsManager />
          </TabsContent>

          <TabsContent value="loans">
            <LoanManagement />
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>All Notifications</CardTitle>
                <CardDescription>System-wide notification log</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Read</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allNotifications.map((n: any) => (
                      <TableRow key={n.id}>
                        <TableCell>{n.user_name}</TableCell>
                        <TableCell>
                          <Badge variant={n.type === "credit_alert" ? "default" : n.type === "debit_alert" ? "secondary" : "destructive"}>
                            {n.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{n.title}</TableCell>
                        <TableCell className="max-w-xs truncate">{n.message}</TableCell>
                        <TableCell>{n.read ? <CheckCircle className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}</TableCell>
                        <TableCell>{new Date(n.created_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kyc">
            <KYCReviews />
          </TabsContent>

          <TabsContent value="fees">
            <FeeManagement />
          </TabsContent>

          <TabsContent value="content">
            <ContentManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}