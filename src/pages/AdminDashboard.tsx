/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MessageSquareText, UserPlus } from "lucide-react";
import LedgerExplorer from "@/components/admin/LedgerExplorer";
import TransferLimitsManager from "@/components/admin/TransferLimitsManager";
import KYCReviews from "@/components/admin/KYCReviews";
import LoanManagement from "@/components/admin/LoanManagement";
import FeeManagement from "@/components/admin/FeeManagement";
import ContentManagement from "@/components/admin/ContentManagement";
import SiteSettingsManager from "@/components/admin/SiteSettingsManager";
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
import { canAccessLiveChatSupport } from "@/lib/live-chat";
import { getSessionUserId } from "@/lib/supabaseSession";
import { logAdminAction } from "@/lib/auditLog";
import { toast } from "sonner";
import { useSiteSettings } from "@/hooks/useSiteSettings";

type WireTransferRow = {
  id: string;
  user_id: string;
  beneficiary_name: string;
  beneficiary_country: string;
  amount: number;
  currency?: string | null;
  purpose?: string | null;
  status: string;
  current_stage?: number | null;
  profiles?: { full_name?: string; email?: string } | null;
};

export default function AdminDashboard() {
  const siteSettings = useSiteSettings();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [canOpenLiveChat, setCanOpenLiveChat] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [users, setUsers] = useState<unknown[]>([]);
  const [accounts, setAccounts] = useState<unknown[]>([]);
  const [wireTransfers, setWireTransfers] = useState<WireTransferRow[]>([]);
  const [transactions, setTransactions] = useState<unknown[]>([]);
  const [allBeneficiaries, setAllBeneficiaries] = useState<unknown[]>([]);
  const [allNotifications, setAllNotifications] = useState<unknown[]>([]);
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
      const { data: { session } } = await supabase.auth.getSession();
      const userId = getSessionUserId(session);
      if (!userId) {
        navigate("/admin-login");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const hasAdminRole = roles?.some(r => r.role === "admin");
      const hasDirectUserManagementAccess = roles?.some(r => r.role === "admin") || false;
      const canAccessChatSupport = canAccessLiveChatSupport((roles || []).map((roleRow) => roleRow.role));
      
      if (!hasAdminRole) {
        toast.error("Access denied: Admin privileges required");
        navigate("/dashboard");
        return;
      }

      setCanManageUsers(hasDirectUserManagementAccess);
      setCanOpenLiveChat(canAccessChatSupport);
      setAdminId(userId);
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

      const usersById = new Map((usersRes.data || []).map((u: unknown) => [u.id, u]));

      if (usersRes.data) setUsers(usersRes.data);
      if (accountsRes.data) {
        const withBalances = accountsRes.data.map((acc: unknown) => ({
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
        })) as WireTransferRow[];
        setWireTransfers(enrichedWires);
      }
      if (txRes.data) setTransactions(txRes.data);
      if (benRes.data) {
        // Enrich with user names
        const enriched = await Promise.all(
          benRes.data.map(async (b: unknown) => {
            const user = usersRes.data?.find((u: unknown) => u.id === b.user_id);
            return { ...b, user_name: user?.full_name || "Unknown" };
          })
        );
        setAllBeneficiaries(enriched);
      }
      if (notifRes.data) {
        const enrichedNotifs = notifRes.data.map((n: unknown) => {
          const user = usersRes.data?.find((u: unknown) => u.id === n.user_id);
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const adminUserId = getSessionUserId(session);
      const { error } = await supabase
        .from("profiles")
        .update({ kyc_status: status })
        .eq("id", userId);

      if (error) throw error;

      toast.success("KYC status updated");
      fetchData();

      void logAdminAction("admin.kyc_status_change", adminUserId, { target_user_id: userId, new_status: status });
    } catch (error) {
      console.error("Error updating KYC:", error);
      toast.error("Failed to update KYC status");
    }
  };

  const updateAccountStatus = async (accountId: string, status: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const adminUserId = getSessionUserId(session);
      const { error } = await supabase
        .from("accounts")
        .update({ status })
        .eq("id", accountId);

      if (error) throw error;

      toast.success("Account status updated");
      fetchData();

      void logAdminAction(status === "frozen" ? "admin.account_freeze" : "admin.account_status_change", adminUserId, {
        account_id: accountId,
        new_status: status,
      });
    } catch (error) {
      console.error("Error updating account:", error);
      toast.error("Failed to update account status");
    }
  };

  const updateWireTransferStatus = async (transferId: string, action: string, reason?: string) => {
    const actionToStatusMap: Record<string, string> = {
      approve: "completed",
      reject: "rejected",
      cancel: "cancelled",
      hold: "held",
      suspend: "suspended",
      resume: "verification_pending",
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const adminUserId = getSessionUserId(session);

      const { data: wireData, error: wireError } = await supabase
        .from("wire_transfers")
        .select("user_id, current_stage")
        .eq("id", transferId)
        .single();

      if (wireError) throw wireError;
      const userId = wireData?.user_id;
      if (!userId) {
        throw new Error("Wire transfer user not found");
      }

      let status = actionToStatusMap[action];
      let dbError = null;

      if (action === "delete") {
        const { error } = await supabase.from("wire_transfers").delete().eq("id", transferId);
        dbError = error;
      } else {
        const updateData: Record<string, any> = { status };
        if (action === "resume") {
          updateData.current_stage = wireData?.current_stage || 1;
        }
        const { error } = await supabase.from("wire_transfers").update(updateData).eq("id", transferId);
        dbError = error;
      }

      if (dbError) throw dbError;

      await logAdminAction(
        action === "delete" ? "admin.wire_transfer_deleted" : "admin.wire_transfer_status_change",
        adminUserId,
        {
          wire_transfer_id: transferId,
          new_status: action === "delete" ? "deleted" : status,
          reason: reason || null,
        }
      );

      const actionLabel =
        action === "approve"
          ? "approved"
          : action === "reject"
          ? "rejected"
          : action === "cancel"
          ? "cancelled"
          : action === "hold"
          ? "held"
          : action === "suspend"
          ? "suspended"
          : action === "resume"
          ? "resumed"
          : action === "delete"
          ? "deleted"
          : action;

      const notificationMessages: Record<string, string> = {
        completed: "Your wire transfer has been approved and completed.",
        cancelled: `Your wire transfer has been cancelled.${reason ? ` Reason: ${reason}` : ""}`,
        rejected: `Your wire transfer has been rejected.${reason ? ` Reason: ${reason}` : ""}`,
        held: `Your wire transfer has been placed on hold.${reason ? ` Reason: ${reason}` : ""}`,
        suspended: `Your wire transfer has been suspended.${reason ? ` Reason: ${reason}` : ""}`,
        verification_pending: "Your wire transfer has been resumed and can continue.",
        deleted: `Your wire transfer has been deleted.${reason ? ` Reason: ${reason}` : ""}`,
      };

      const notificationMessage = notificationMessages[actionLabel as keyof typeof notificationMessages];
      if (notificationMessage) {
        const { error: notifError } = await supabase.from("notifications").insert({
          user_id: userId,
          type: "info",
          title: "Wire Transfer Update",
          message: notificationMessage,
        });
        if (notifError) throw notifError;
      }

      toast.success(`Wire transfer ${actionLabel}.`);
      fetchData();
    } catch (error) {
      console.error("Error updating wire transfer:", error);
      toast.error("Failed to update wire transfer status");
      throw error;
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
    <div className="min-h-screen admin-premium-page" style={{ background: "var(--bank-bg)" }}>
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
                <h1 className="admin-premium-heading text-3xl leading-tight text-[var(--bank-navy)]">{siteSettings["site_name"] || "Your Bank"}</h1>
                <p className="text-sm font-medium tracking-wide text-[var(--bank-gold)]">Administration Portal</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex flex-col items-end gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--bank-muted)]">Current Date & Time</p>
                  <p className="text-sm font-medium text-[var(--bank-navy)]">{now.toLocaleString()}</p>
                </div>
                {canManageUsers ? (
                  <Button
                    className="bg-[var(--bank-navy)] text-white hover:bg-[var(--bank-slate)]"
                    onClick={() => navigate("/admin-users")}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Manage Users
                  </Button>
                ) : null}
                {canOpenLiveChat ? (
                  <Button
                    variant="outline"
                    className="border-[var(--bank-navy)]/20 text-[var(--bank-navy)] hover:bg-[var(--bank-navy)]/5"
                    onClick={() => navigate("/live-chat-support")}
                  >
                    <MessageSquareText className="mr-2 h-4 w-4" />
                    Live Chat
                  </Button>
                ) : null}
              </div>
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
            <TabsTrigger value="users" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Users</TabsTrigger>
            <TabsTrigger value="accounts" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Accounts</TabsTrigger>
            <TabsTrigger value="wires" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Wire Transfers</TabsTrigger>
            <TabsTrigger value="transactions" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Transactions</TabsTrigger>
            <TabsTrigger value="ledger" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Ledger</TabsTrigger>
            <TabsTrigger value="beneficiaries" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Beneficiaries</TabsTrigger>
            <TabsTrigger value="limits" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Transfer Limits</TabsTrigger>
            <TabsTrigger value="loans" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Loans</TabsTrigger>
            <TabsTrigger value="cards" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Cards</TabsTrigger>
            <TabsTrigger value="investments" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Investments</TabsTrigger>
            <TabsTrigger value="savings" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Savings</TabsTrigger>
            <TabsTrigger value="bills" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Bills</TabsTrigger>
            <TabsTrigger value="atm" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">ATM</TabsTrigger>
            <TabsTrigger value="scheduled" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Scheduled</TabsTrigger>
            <TabsTrigger value="cashback" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Cashback</TabsTrigger>
            <TabsTrigger value="fraud" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Fraud Alerts</TabsTrigger>
            <TabsTrigger value="referrals" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Referrals</TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Notifications</TabsTrigger>
            <TabsTrigger value="kyc" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">KYC Reviews</TabsTrigger>
            <TabsTrigger value="fees" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Fees</TabsTrigger>
            <TabsTrigger value="audit" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Audit Logs</TabsTrigger>
            <TabsTrigger value="content" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Content</TabsTrigger>
            <TabsTrigger value="site-settings" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Site Settings</TabsTrigger>
            <TabsTrigger value="currency" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Currency</TabsTrigger>
            <TabsTrigger value="support" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Support</TabsTrigger>
            <TabsTrigger value="reconciliation" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Reconciliation</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Reports</TabsTrigger>
            <TabsTrigger value="liquidity" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Liquidity</TabsTrigger>
            <TabsTrigger value="health" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Health</TabsTrigger>
            <TabsTrigger value="reversal" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Reversals</TabsTrigger>
            <TabsTrigger value="stresstest" className="rounded-none border-b-[3px] border-transparent bg-transparent font-normal text-[var(--bank-muted)] data-[state=active]:border-b-[3px] data-[state=active]:border-[var(--bank-gold)] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--bank-navy)] shadow-none hover:text-[var(--bank-navy)]">Stress Test</TabsTrigger>
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
              onWireTransferAction={updateWireTransferStatus}
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

          <TabsContent value="site-settings">
            <SiteSettingsManager adminId={adminId} />
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
