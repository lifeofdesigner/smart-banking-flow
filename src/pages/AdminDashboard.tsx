import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import LedgerExplorer from "@/components/admin/LedgerExplorer";
import TransferLimitsManager from "@/components/admin/TransferLimitsManager";
import KYCReviews from "@/components/admin/KYCReviews";
import LoanManagement from "@/components/admin/LoanManagement";
import FeeManagement from "@/components/admin/FeeManagement";
import ContentManagement from "@/components/admin/ContentManagement";
import FraudAlerts from "@/components/admin/FraudAlerts";
import ReferralsManager from "@/components/admin/ReferralsManager";
import AuditLogs from "@/components/admin/AuditLogs";
import StressTest from "@/components/admin/StressTest";
import CurrencyRatesManager from "@/components/admin/CurrencyRatesManager";
import SupportTicketsManager from "@/components/admin/SupportTicketsManager";
import CardsManager from "@/components/admin/CardsManager";
import InvestmentsManager from "@/components/admin/InvestmentsManager";
import BillPaymentsManager from "@/components/admin/BillPaymentsManager";
import ATMWithdrawalsManager from "@/components/admin/ATMWithdrawalsManager";
import SavingsManager from "@/components/admin/SavingsManager";
import CashbackManager from "@/components/admin/CashbackManager";
import ScheduledTransfersManager from "@/components/admin/ScheduledTransfersManager";
import LedgerReconciliation from "@/components/admin/LedgerReconciliation";
import FinancialReports from "@/components/admin/FinancialReports";
import LiquidityMonitor from "@/components/admin/LiquidityMonitor";
import SystemHealth from "@/components/admin/SystemHealth";
import TransactionReversal from "@/components/admin/TransactionReversal";
import AdminSummaryStats from "@/components/admin/AdminSummaryStats";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminAccountsTab from "@/components/admin/AdminAccountsTab";
import AdminWiresTab from "@/components/admin/AdminWiresTab";
import AdminTransactionsTab from "@/components/admin/AdminTransactionsTab";
import AdminBeneficiariesTab from "@/components/admin/AdminBeneficiariesTab";
import AdminNotificationsTab from "@/components/admin/AdminNotificationsTab";
import { toast } from "sonner";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [wireTransfers, setWireTransfers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [allBeneficiaries, setAllBeneficiaries] = useState<any[]>([]);
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
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

      const hasAdminRole = roles?.some(r => ["admin", "super_admin", "finance_admin", "support_admin", "content_manager"].includes(r.role));
      
      if (!hasAdminRole) {
        toast.error("Access denied: Admin privileges required");
        navigate("/dashboard");
        return;
      }

      setAdminId(user.id);
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
        supabase.from("accounts").select("*").order("created_at", { ascending: false }),
        supabase.from("wire_transfers").select("*").order("created_at", { ascending: false }),
        supabase.from("transactions").select("*, accounts(account_number)").order("created_at", { ascending: false }),
        supabase.from("beneficiaries").select("*").order("created_at", { ascending: false }),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100),
      ]);

      const usersById = new Map((usersRes.data || []).map((u: any) => [u.id, u]));

      if (usersRes.data) setUsers(usersRes.data);
      if (accountsRes.data) {
        const withBalances = accountsRes.data.map((acc: any) => ({
          ...acc,
          profiles: acc.profiles || (acc.user_id ? usersById.get(acc.user_id) : null),
          computed_balance: acc.available_balance ?? acc.balance ?? 0,
        }));
        setAccounts(withBalances);
      }
      if (wiresRes.data) {
        const enrichedWires = wiresRes.data.map((wire: any) => ({
          ...wire,
          profiles: wire.profiles || (wire.user_id ? usersById.get(wire.user_id) : null),
        }));
        setWireTransfers(enrichedWires);
      }
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
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("profiles")
        .update({ kyc_status: status })
        .eq("id", userId);

      if (error) throw error;

      // Audit log
      await (supabase as any).from("audit_logs").insert({
        action: "admin.kyc_status_change",
        user_id: user?.id,
        metadata: { target_user_id: userId, new_status: status },
      });

      toast.success("KYC status updated");
      fetchData();
    } catch (error) {
      console.error("Error updating KYC:", error);
      toast.error("Failed to update KYC status");
    }
  };

  const updateAccountStatus = async (accountId: string, status: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("accounts")
        .update({ status })
        .eq("id", accountId);

      if (error) throw error;

      // Audit log
      await (supabase as any).from("audit_logs").insert({
        action: status === "suspended" ? "admin.account_freeze" : "admin.account_status_change",
        user_id: user?.id,
        metadata: { account_id: accountId, new_status: status },
      });

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

  const handleViewCodes = (_wireTransferId: string) => {
    // handled in AdminWiresTab dialog
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
    <div className="min-h-screen admin-premium-page">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 border-b border-[var(--bank-navy)]/20 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                className="text-[var(--bank-muted)] hover:bg-[var(--bank-navy)]/5 hover:text-[var(--bank-navy)]"
                onClick={() => navigate("/dashboard")}
              >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
              </Button>
              <div>
                <h1 className="admin-premium-heading text-3xl leading-tight text-[var(--bank-navy)]">MicroFinance Bank</h1>
                <p className="text-sm font-medium tracking-wide text-[var(--bank-gold)]">Administration Portal</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-[var(--bank-muted)]">Current Date & Time</p>
              <p className="text-sm font-medium text-[var(--bank-navy)]">{now.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <AdminSummaryStats
          usersCount={users.length}
          accountsCount={accounts.length}
          wireTransfersCount={wireTransfers.length}
          transactionsCount={transactions.length}
        />

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="h-auto w-full justify-start flex-wrap gap-x-1 gap-y-2 rounded-none border-b-2 border-[var(--bank-navy)]/20 bg-[var(--bank-white)] px-2 py-2 shadow-sm">
            <TabsTrigger value="users" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Users</TabsTrigger>
            <TabsTrigger value="accounts" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Accounts</TabsTrigger>
            <TabsTrigger value="wires" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Wire Transfers</TabsTrigger>
            <TabsTrigger value="transactions" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Transactions</TabsTrigger>
            <TabsTrigger value="ledger" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Ledger</TabsTrigger>
            <TabsTrigger value="beneficiaries" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Beneficiaries</TabsTrigger>
            <TabsTrigger value="limits" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Transfer Limits</TabsTrigger>
            <TabsTrigger value="loans" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Loans</TabsTrigger>
            <TabsTrigger value="cards" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Cards</TabsTrigger>
            <TabsTrigger value="investments" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Investments</TabsTrigger>
            <TabsTrigger value="savings" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Savings</TabsTrigger>
            <TabsTrigger value="bills" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Bills</TabsTrigger>
            <TabsTrigger value="atm" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">ATM</TabsTrigger>
            <TabsTrigger value="scheduled" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Scheduled</TabsTrigger>
            <TabsTrigger value="cashback" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Cashback</TabsTrigger>
            <TabsTrigger value="fraud" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Fraud Alerts</TabsTrigger>
            <TabsTrigger value="referrals" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Referrals</TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Notifications</TabsTrigger>
            <TabsTrigger value="kyc" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">KYC Reviews</TabsTrigger>
            <TabsTrigger value="fees" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Fees</TabsTrigger>
            <TabsTrigger value="audit" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Audit Logs</TabsTrigger>
            <TabsTrigger value="content" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Content</TabsTrigger>
            <TabsTrigger value="currency" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Currency</TabsTrigger>
            <TabsTrigger value="support" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Support</TabsTrigger>
            <TabsTrigger value="reconciliation" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Reconciliation</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Reports</TabsTrigger>
            <TabsTrigger value="liquidity" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Liquidity</TabsTrigger>
            <TabsTrigger value="health" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Health</TabsTrigger>
            <TabsTrigger value="reversal" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Reversals</TabsTrigger>
            <TabsTrigger value="stresstest" className="rounded-none border-b-[3px] border-transparent bg-transparent text-[var(--bank-muted)] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Stress Test</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <AdminUsersTab users={users} updateKycStatus={updateKycStatus} />
          </TabsContent>

          <TabsContent value="accounts">
            <AdminAccountsTab
              accounts={accounts}
              adminId={adminId}
              onDepositSuccess={fetchData}
              updateAccountStatus={updateAccountStatus}
            />
          </TabsContent>

          <TabsContent value="wires">
            <AdminWiresTab
              wireTransfers={wireTransfers}
              approveWireTransfer={approveWireTransfer}
              adminId={adminId}
              onViewCodes={handleViewCodes}
            />
          </TabsContent>

          <TabsContent value="transactions">
            <AdminTransactionsTab transactions={transactions} />
          </TabsContent>
          <TabsContent value="ledger">
            <LedgerExplorer />
          </TabsContent>

          <TabsContent value="beneficiaries">
            <AdminBeneficiariesTab allBeneficiaries={allBeneficiaries} />
          </TabsContent>

          <TabsContent value="limits">
            <TransferLimitsManager />
          </TabsContent>

          <TabsContent value="loans">
            <LoanManagement />
          </TabsContent>

          <TabsContent value="fraud">
            <FraudAlerts />
          </TabsContent>

          <TabsContent value="referrals">
            <ReferralsManager />
          </TabsContent>

          <TabsContent value="notifications">
            <AdminNotificationsTab allNotifications={allNotifications} />
          </TabsContent>

          <TabsContent value="kyc">
            <KYCReviews />
          </TabsContent>

          <TabsContent value="fees">
            <FeeManagement />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogs />
          </TabsContent>

          <TabsContent value="content">
            <ContentManagement />
          </TabsContent>

          <TabsContent value="currency">
            <CurrencyRatesManager />
          </TabsContent>

          <TabsContent value="support">
            <SupportTicketsManager />
          </TabsContent>

          <TabsContent value="stresstest">
            <StressTest />
          </TabsContent>

          <TabsContent value="reconciliation">
            <LedgerReconciliation />
          </TabsContent>

          <TabsContent value="reports">
            <FinancialReports />
          </TabsContent>

          <TabsContent value="liquidity">
            <LiquidityMonitor />
          </TabsContent>

          <TabsContent value="health">
            <SystemHealth />
          </TabsContent>

          <TabsContent value="reversal">
            <TransactionReversal />
          </TabsContent>

          <TabsContent value="cards">
            <CardsManager />
          </TabsContent>

          <TabsContent value="investments">
            <InvestmentsManager />
          </TabsContent>

          <TabsContent value="savings">
            <SavingsManager />
          </TabsContent>

          <TabsContent value="bills">
            <BillPaymentsManager />
          </TabsContent>

          <TabsContent value="atm">
            <ATMWithdrawalsManager />
          </TabsContent>

          <TabsContent value="scheduled">
            <ScheduledTransfersManager />
          </TabsContent>

          <TabsContent value="cashback">
            <CashbackManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
