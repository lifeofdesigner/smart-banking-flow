import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Loader2, MessageSquareText, RefreshCw, Send, UserRound, Wallet } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CHAT_SCHEMA_UNAVAILABLE_MESSAGE,
  canAccessLiveChatSupport,
  chatSupabase,
  ChatAccountSummary,
  ChatConversationRow,
  ChatMessageRow,
  ChatProfileSummary,
  ChatTransactionSummary,
  ConversationListItem,
  formatChatTimestamp,
  formatConversationDate,
  formatRelativeTime,
  getConversationStatusBadgeClass,
  getInitials,
  isMissingChatSchemaError,
  parseGuestConversationSubject,
  upsertMessage,
} from "@/lib/live-chat";

type ConversationFilter = "all" | "waiting" | "active" | "resolved";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }

  return fallback;
};

const normalizeConversation = (value: any): ChatConversationRow => ({
  id: value.id,
  customer_id: value.customer_id,
  agent_id: value.agent_id ?? null,
  status: value.status,
  subject: value.subject ?? null,
  created_at: value.created_at,
  updated_at: value.updated_at,
  last_message_at: value.last_message_at ?? null,
});

const normalizeMessage = (value: any): ChatMessageRow => ({
  id: value.id,
  conversation_id: value.conversation_id,
  sender_id: value.sender_id ?? null,
  sender_type: value.sender_type,
  message: value.message,
  is_read: Boolean(value.is_read),
  created_at: value.created_at,
});

export default function LiveChatSupport() {
  const navigate = useNavigate();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("Support Agent");
  const [isOnline, setIsOnline] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [customerInfoOpen, setCustomerInfoOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<ChatConversationRow | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [customerProfile, setCustomerProfile] = useState<ChatProfileSummary | null>(null);
  const [accounts, setAccounts] = useState<ChatAccountSummary[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<ChatTransactionSummary[]>([]);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const activeGuestMeta = useMemo(
    () => parseGuestConversationSubject(activeConversation?.subject),
    [activeConversation?.subject]
  );
  const activeConversationSubject = activeGuestMeta?.subject || activeConversation?.subject || "General Support";

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return conversations.filter((conversation) => {
      const matchesStatus = filter === "all" ? true : conversation.status === filter;
      const matchesSearch = query
        ? conversation.customer_name.toLowerCase().includes(query) || conversation.customer_email.toLowerCase().includes(query)
        : true;

      return matchesStatus && matchesSearch;
    });
  }, [conversations, filter, search]);

  const loadConversations = async (preferredConversationId?: string) => {
    setLoadingConversations(true);

    try {
      const { data: conversationRows, error } = await chatSupabase
        .from("chat_conversations")
        .select("*")
        .order("last_message_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const normalizedConversations = (conversationRows || []).map(normalizeConversation);

      if (normalizedConversations.length === 0) {
        setConversations([]);
        setSelectedConversationId(null);
        setActiveConversation(null);
        setMessages([]);
        setCustomerProfile(null);
        setAccounts([]);
        setRecentTransactions([]);
        return;
      }

      const customerIds = Array.from(
        new Set(
          normalizedConversations
            .map((conversation) => conversation.customer_id)
            .filter((value): value is string => Boolean(value))
        )
      );
      const conversationIds = normalizedConversations.map((conversation) => conversation.id);

      const [{ data: profiles, error: profilesError }, { data: messageRows, error: messagesError }] = await Promise.all([
        customerIds.length
          ? supabase.from("profiles").select("id, full_name, email").in("id", customerIds)
          : Promise.resolve({ data: [] as ChatProfileSummary[], error: null }),
        chatSupabase
          .from("chat_messages")
          .select("id, conversation_id, message, created_at, is_read, sender_type")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false }),
      ]);

      if (profilesError) {
        throw profilesError;
      }

      if (messagesError) {
        throw messagesError;
      }

      const profileMap = new Map<string, ChatProfileSummary>();
      for (const profile of profiles || []) {
        profileMap.set(profile.id, profile);
      }

      const latestMessageMap = new Map<string, string>();
      const unreadCountMap = new Map<string, number>();

      for (const messageRow of messageRows || []) {
        if (!latestMessageMap.has(messageRow.conversation_id)) {
          latestMessageMap.set(messageRow.conversation_id, messageRow.message);
        }

        if (messageRow.sender_type === "customer" && !messageRow.is_read) {
          unreadCountMap.set(
            messageRow.conversation_id,
            (unreadCountMap.get(messageRow.conversation_id) ?? 0) + 1
          );
        }
      }

      const nextConversations: ConversationListItem[] = normalizedConversations.map((conversation) => {
        const customer = conversation.customer_id ? profileMap.get(conversation.customer_id) : undefined;
        const guestMeta = parseGuestConversationSubject(conversation.subject);
        const isGuest = Boolean(guestMeta);

        return {
          ...conversation,
          customer_name: isGuest
            ? `Guest: ${guestMeta?.name} (${guestMeta?.email})`
            : customer?.full_name || "Unknown Customer",
          customer_email: isGuest ? guestMeta?.email || "Guest visitor" : customer?.email || "No email",
          latest_message: latestMessageMap.get(conversation.id) || guestMeta?.subject || conversation.subject || "No messages yet",
          unread_count: unreadCountMap.get(conversation.id) ?? 0,
          is_guest: isGuest,
          guest_name: guestMeta?.name ?? null,
          guest_email: guestMeta?.email ?? null,
        };
      });

      setConversations(nextConversations);

      const preferredId = preferredConversationId ?? selectedConversationId;
      const preferredConversation = preferredId
        ? nextConversations.find((conversation) => conversation.id === preferredId)
        : null;
      const nextSelection = preferredConversation?.id
        || nextConversations.find((conversation) => conversation.status === "waiting")?.id
        || nextConversations[0]?.id
        || null;

      setSelectedConversationId(nextSelection);
    } catch (error) {
      if (isMissingChatSchemaError(error)) {
        toast.error(CHAT_SCHEMA_UNAVAILABLE_MESSAGE);
        return;
      }

      toast.error(getErrorMessage(error, "Failed to load conversations"));
    } finally {
      setLoadingConversations(false);
    }
  };

  const markConversationRead = async (conversationId: string) => {
    const { error } = await chatSupabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("sender_type", "customer")
      .eq("is_read", false);

    if (!error) {
      setMessages((current) =>
        current.map((message) =>
          message.sender_type === "customer" ? { ...message, is_read: true } : message
        )
      );
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, unread_count: 0 }
            : conversation
        )
      );
    }
  };

  const loadConversationDetails = async (conversationId: string, showLoader = true) => {
    if (!agentId) return;

    setLoadingConversation(showLoader);

    try {
      const { data, error } = await chatSupabase
        .from("chat_conversations")
        .select("*")
        .eq("id", conversationId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setActiveConversation(null);
        setMessages([]);
        setCustomerProfile(null);
        setAccounts([]);
        setRecentTransactions([]);
        setLoadingConversation(false);
        return;
      }

      let nextConversation = normalizeConversation(data);

      if (nextConversation.status !== "resolved" && !nextConversation.agent_id) {
        const { data: claimedConversation, error: claimError } = await chatSupabase
          .from("chat_conversations")
          .update({
            agent_id: agentId,
            status: "active",
          })
          .eq("id", conversationId)
          .select("*")
          .single();

        if (!claimError && claimedConversation) {
          nextConversation = normalizeConversation(claimedConversation);
        }
      }

      const guestMeta = parseGuestConversationSubject(nextConversation.subject);

      const [{ data: messageRows, error: messagesError }, { data: profileRow, error: profileError }, { data: accountRows, error: accountsError }] = await Promise.all([
        chatSupabase
          .from("chat_messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true }),
        nextConversation.customer_id
          ? supabase.from("profiles").select("id, full_name, email").eq("id", nextConversation.customer_id).maybeSingle()
          : Promise.resolve({
              data: guestMeta
                ? {
                    id: nextConversation.id,
                    full_name: `Guest: ${guestMeta.name}`,
                    email: guestMeta.email,
                  } satisfies ChatProfileSummary
                : null,
              error: null,
            }),
        nextConversation.customer_id
          ? supabase
              .from("accounts")
              .select("id, account_number, account_type, available_balance, balance, currency, status")
              .eq("user_id", nextConversation.customer_id)
              .order("created_at", { ascending: true })
          : Promise.resolve({ data: [] as ChatAccountSummary[], error: null }),
      ]);

      if (messagesError) {
        throw messagesError;
      }

      if (profileError) {
        throw profileError;
      }

      if (accountsError) {
        throw accountsError;
      }

      const accountIds = nextConversation.customer_id ? (accountRows || []).map((account) => account.id) : [];
      const { data: transactionRows, error: transactionsError } = accountIds.length
        ? await supabase
            .from("transactions")
            .select("id, amount, transaction_type, description, status, created_at")
            .in("account_id", accountIds)
            .order("created_at", { ascending: false })
            .limit(5)
        : { data: [] as ChatTransactionSummary[], error: null };

      if (transactionsError) {
        throw transactionsError;
      }

      setActiveConversation(nextConversation);
      setMessages((messageRows || []).map(normalizeMessage));
      setCustomerProfile(profileRow || null);
      setAccounts((accountRows || []) as ChatAccountSummary[]);
      setRecentTransactions((transactionRows || []) as ChatTransactionSummary[]);

      await markConversationRead(conversationId);
    } catch (error) {
      if (isMissingChatSchemaError(error)) {
        toast.error(CHAT_SCHEMA_UNAVAILABLE_MESSAGE);
        return;
      }

      toast.error(getErrorMessage(error, "Failed to load conversation"));
    } finally {
      setLoadingConversation(false);
    }
  };

  const initializePage = async () => {
    setLoadingAuth(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate("/auth");
        return;
      }

      const [{ data: roles, error: rolesError }, { data: profile }, { data: agentStatus }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        chatSupabase.from("chat_agent_status").select("is_online").eq("agent_id", user.id).maybeSingle(),
      ]);

      if (rolesError) {
        throw rolesError;
      }

      const roleNames = (roles || []).map((roleRow) => roleRow.role);
      if (!canAccessLiveChatSupport(roleNames)) {
        toast.error("Access denied: live chat support is limited to admin and support roles");
        navigate("/dashboard");
        return;
      }

      setAgentId(user.id);
      setAgentName(profile?.full_name || "Support Agent");
      setIsOnline(Boolean(agentStatus?.is_online));
      setAuthorized(true);
      await loadConversations();
    } catch (error) {
      if (isMissingChatSchemaError(error)) {
        toast.error(CHAT_SCHEMA_UNAVAILABLE_MESSAGE);
        navigate("/admin");
        return;
      }

      toast.error(getErrorMessage(error, "Failed to load live chat support"));
      navigate("/dashboard");
    } finally {
      setLoadingAuth(false);
    }
  };

  useEffect(() => {
    void initializePage();
  }, [navigate]);

  useEffect(() => {
    if (!authorized || !selectedConversationId) return;

    void loadConversationDetails(selectedConversationId);
  }, [authorized, selectedConversationId, agentId]);

  useEffect(() => {
    if (!authorized) return;

    const syncChannel = chatSupabase
      .channel(`support-live-chat-sync-${agentId ?? "agent"}-${selectedConversationId ?? "none"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_conversations",
        },
        (payload) => {
          const changedConversationId = (payload.new as { id?: string } | null)?.id
            || (payload.old as { id?: string } | null)?.id;

          void loadConversations(changedConversationId);

          if (selectedConversationId && changedConversationId === selectedConversationId) {
            void loadConversationDetails(selectedConversationId, false);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const changedConversationId = (payload.new as { conversation_id?: string } | null)?.conversation_id
            || (payload.old as { conversation_id?: string } | null)?.conversation_id;

          void loadConversations(changedConversationId);

          if (selectedConversationId && changedConversationId === selectedConversationId) {
            if (payload.eventType === "INSERT" && payload.new) {
              setMessages((current) => upsertMessage(current, normalizeMessage(payload.new)));
            }

            void loadConversationDetails(selectedConversationId, false);
          }
        },
      )
      .subscribe();

    return () => {
      void chatSupabase.removeChannel(syncChannel);
    };
  }, [authorized, agentId, selectedConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleToggleOnline = async (checked: boolean) => {
    if (!agentId) return;

    setUpdatingStatus(true);

    const { error } = await chatSupabase
      .from("chat_agent_status")
      .upsert(
        {
          agent_id: agentId,
          is_online: checked,
          last_seen: new Date().toISOString(),
        },
        { onConflict: "agent_id" }
      );

    setUpdatingStatus(false);

    if (error) {
      toast.error(getErrorMessage(error, "Failed to update agent status"));
      return;
    }

    setIsOnline(checked);
    toast.success(checked ? "You are now online" : "You are now offline");
  };

  const handleSendMessage = async () => {
    const trimmedMessage = messageText.trim();

    if (!trimmedMessage || !selectedConversationId || !agentId) {
      return;
    }

    setSending(true);

    try {
      const sentAt = new Date().toISOString();
      const { data, error } = await chatSupabase
        .from("chat_messages")
        .insert({
          conversation_id: selectedConversationId,
          sender_id: agentId,
          sender_type: "agent",
          message: trimmedMessage,
          is_read: false,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const { data: updatedConversation, error: updateError } = await chatSupabase
        .from("chat_conversations")
        .update({
          agent_id: agentId,
          status: "active",
          last_message_at: sentAt,
        })
        .eq("id", selectedConversationId)
        .select("*")
        .single();

      if (updateError) {
        throw updateError;
      }

      setMessages((current) => upsertMessage(current, normalizeMessage(data)));
      setActiveConversation(updatedConversation ? normalizeConversation(updatedConversation) : null);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversationId
            ? {
                ...conversation,
                agent_id: agentId,
                status: "active",
                last_message_at: sentAt,
                latest_message: trimmedMessage,
              }
            : conversation
        )
      );
      setMessageText("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to send message"));
    } finally {
      setSending(false);
    }
  };

  const handleResolveConversation = async () => {
    if (!selectedConversationId) return;

    setResolving(true);

    try {
      const { data, error } = await chatSupabase
        .from("chat_conversations")
        .update({
          status: "resolved",
        })
        .eq("id", selectedConversationId)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const resolvedConversation = normalizeConversation(data);
      setActiveConversation(resolvedConversation);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversationId
            ? { ...conversation, status: "resolved" }
            : conversation
        )
      );
      toast.success("Conversation resolved");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to resolve conversation"));
    } finally {
      setResolving(false);
    }
  };

  const handleMessageKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSendMessage();
    }
  };

  if (loadingAuth) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <div className="text-muted-foreground animate-pulse">Loading live chat support...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 py-4 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="admin-premium-heading text-3xl text-[var(--bank-navy)]">Live Chat Support</h1>
            <p className="mt-1 text-sm text-[var(--bank-muted)]">
              Manage customer support conversations in real time from a single workspace.
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--bank-navy)]/10 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--bank-navy)]">{agentName}</p>
              <p className="text-xs text-[var(--bank-muted)]">
                You are {isOnline ? "Online" : "Offline"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={isOnline} disabled={updatingStatus} onCheckedChange={handleToggleOnline} />
              <span className={`text-xs font-semibold ${isOnline ? "text-emerald-700" : "text-slate-500"}`}>
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[320px,1fr]">
          <Card className="overflow-hidden rounded-2xl border-0 bg-white shadow-sm">
            <CardHeader className="space-y-4 border-b border-[var(--bank-navy)]/10 bg-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-[var(--bank-navy)]">Conversations</CardTitle>
                <Button variant="outline" size="sm" onClick={() => loadConversations()} disabled={loadingConversations}>
                  <RefreshCw className={cn("mr-2 h-4 w-4", loadingConversations && "animate-spin")} />
                  Refresh
                </Button>
              </div>

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by customer name or email"
                className="bg-white"
              />

              <Tabs value={filter} onValueChange={(value) => setFilter(value as ConversationFilter)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="waiting">Waiting</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="resolved">Resolved</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent className="max-h-[calc(100vh-260px)] overflow-y-auto p-3">
              {loadingConversations ? (
                <div className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading conversations...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex min-h-[160px] items-center justify-center text-center text-sm text-muted-foreground">
                  No conversations match the current filters.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredConversations.map((conversation) => {
                    const isSelected = conversation.id === selectedConversationId;

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => setSelectedConversationId(conversation.id)}
                        className={cn(
                          "w-full rounded-2xl border px-4 py-3 text-left transition",
                          isSelected
                            ? "border-[var(--bank-gold)] bg-[var(--bank-gold)]/10 shadow-sm"
                            : "border-[var(--bank-navy)]/10 bg-white hover:border-[var(--bank-gold)]/60 hover:bg-[var(--bank-bg)]/70",
                          conversation.status === "waiting" && "border-amber-300 bg-amber-50/80",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--bank-navy)] text-sm font-semibold text-white">
                            {getInitials(conversation.is_guest ? conversation.guest_name || "Guest" : conversation.customer_name)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[var(--bank-navy)]">
                                  {conversation.customer_name}
                                </p>
                                <p className="truncate text-xs text-[var(--bank-muted)]">
                                  {conversation.customer_email}
                                </p>
                              </div>
                              <span className="flex-shrink-0 text-[11px] text-[var(--bank-muted)]">
                                {formatRelativeTime(conversation.last_message_at || conversation.created_at)}
                              </span>
                            </div>

                            <div className="mt-2 flex items-center gap-2">
                              <Badge className={getConversationStatusBadgeClass(conversation.status)}>
                                {conversation.status}
                              </Badge>
                              {conversation.is_guest ? (
                                <Badge className="border-0 bg-[var(--bank-gold)]/15 text-[var(--bank-navy)]">
                                  Guest
                                </Badge>
                              ) : null}
                              {conversation.unread_count > 0 ? (
                                <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                                  {conversation.unread_count}
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-2 truncate text-sm text-[var(--bank-muted)]">
                              {conversation.latest_message}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-0 bg-white shadow-sm">
            {!selectedConversationId ? (
              <div className="flex min-h-[500px] items-center justify-center px-6 text-center">
                <div className="max-w-sm">
                  <MessageSquareText className="mx-auto h-10 w-10 text-[var(--bank-gold)]" />
                  <h2 className="mt-4 text-xl font-semibold text-[var(--bank-navy)]">Select a conversation</h2>
                  <p className="mt-2 text-sm text-[var(--bank-muted)]">
                    Choose a customer conversation from the list to review account context and respond in real time.
                  </p>
                </div>
              </div>
            ) : loadingConversation ? (
              <div className="flex min-h-[500px] items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading conversation...
              </div>
            ) : activeConversation && customerProfile ? (
              <>
                <div className="border-b border-[var(--bank-navy)]/10 bg-white px-6 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bank-navy)] text-sm font-semibold text-white">
                          {getInitials(customerProfile.full_name || customerProfile.email || "Customer")}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold text-[var(--bank-navy)]">
                            {customerProfile.full_name || "Customer"}
                          </p>
                          <p className="truncate text-sm text-[var(--bank-muted)]">{customerProfile.email}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge className={getConversationStatusBadgeClass(activeConversation.status)}>
                          {activeConversation.status}
                        </Badge>
                        {activeGuestMeta ? (
                          <Badge className="border-0 bg-[var(--bank-gold)]/15 text-[var(--bank-navy)]">
                            Guest
                          </Badge>
                        ) : null}
                        <span className="text-xs text-[var(--bank-muted)]">
                          Opened {formatConversationDate(activeConversation.created_at)}
                        </span>
                      </div>
                    </div>

                    <Collapsible open={customerInfoOpen} onOpenChange={setCustomerInfoOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" className="border-[var(--bank-navy)]/20 text-[var(--bank-navy)]">
                          <Wallet className="mr-2 h-4 w-4" />
                          Account Info
                          <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", customerInfoOpen && "rotate-180")} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-4">
                        {activeGuestMeta ? (
                          <div className="rounded-2xl border border-[var(--bank-navy)]/10 bg-[var(--bank-bg)]/60 p-4">
                            <p className="text-sm font-semibold text-[var(--bank-navy)]">Guest Visitor Details</p>
                            <div className="mt-3 space-y-2 text-sm text-[var(--bank-muted)]">
                              <p>Name: {activeGuestMeta.name}</p>
                              <p>Email: {activeGuestMeta.email}</p>
                              <p>This conversation was started from the public landing page and does not have linked banking accounts.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="grid gap-4 rounded-2xl border border-[var(--bank-navy)]/10 bg-[var(--bank-bg)]/60 p-4 lg:grid-cols-[1.2fr_1fr]">
                            <div className="space-y-3">
                              <p className="text-sm font-semibold text-[var(--bank-navy)]">Accounts</p>
                              {accounts.length === 0 ? (
                                <p className="text-sm text-[var(--bank-muted)]">No accounts found for this customer.</p>
                              ) : (
                                <div className="space-y-2">
                                  {accounts.map((account) => {
                                    const displayBalance = account.available_balance ?? account.balance ?? 0;

                                    return (
                                      <div
                                        key={account.id}
                                        className="rounded-xl border border-white/70 bg-white px-3 py-3 shadow-sm"
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <div>
                                            <p className="text-sm font-semibold text-[var(--bank-navy)]">
                                              {account.account_type}
                                            </p>
                                            <p className="text-xs text-[var(--bank-muted)]">
                                              Account No: {account.account_number}
                                            </p>
                                          </div>
                                          <p className="text-sm font-semibold text-[var(--bank-navy)]">
                                            {(account.currency || "USD")} {displayBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            <div className="space-y-3">
                              <p className="text-sm font-semibold text-[var(--bank-navy)]">Recent Transactions</p>
                              {recentTransactions.length === 0 ? (
                                <p className="text-sm text-[var(--bank-muted)]">No recent transactions available.</p>
                              ) : (
                                <div className="space-y-2">
                                  {recentTransactions.map((transaction) => (
                                    <div
                                      key={transaction.id}
                                      className="rounded-xl border border-white/70 bg-white px-3 py-3 shadow-sm"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-medium capitalize text-[var(--bank-navy)]">
                                            {transaction.transaction_type.replace(/_/g, " ")}
                                          </p>
                                          <p className="truncate text-xs text-[var(--bank-muted)]">
                                            {transaction.description || "No description"}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-semibold text-[var(--bank-navy)]">
                                            ${transaction.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                          </p>
                                          <p className="text-xs text-[var(--bank-muted)]">
                                            {formatConversationDate(transaction.created_at)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>
                <div className="flex h-[460px] flex-col bg-[#F8FAFC]">
                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    {messages.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-center text-sm text-[var(--bank-muted)]">
                        No messages yet for this conversation.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((message) => {
                          const isAgentMessage = message.sender_type === "agent";
                          const isSystemMessage = message.sender_type === "system";
                          const senderLabel = isSystemMessage
                            ? "System"
                            : isAgentMessage
                              ? agentName
                              : activeGuestMeta?.name || customerProfile.full_name || customerProfile.email || "Customer";

                          if (isSystemMessage) {
                            return (
                              <div key={message.id} className="text-center text-xs text-muted-foreground">
                                <p>{message.message}</p>
                                <p className="mt-1">{formatChatTimestamp(message.created_at)}</p>
                              </div>
                            );
                          }

                          return (
                            <div key={message.id} className={cn("flex", isAgentMessage ? "justify-end" : "justify-start")}>
                              <div className={cn("max-w-[80%] space-y-1", isAgentMessage ? "items-end text-right" : "items-start")}>
                                <div
                                  className={cn(
                                    "rounded-2xl px-4 py-3 text-sm shadow-sm",
                                    isAgentMessage
                                      ? "rounded-br-md bg-[var(--bank-navy)] text-white"
                                      : "rounded-bl-md bg-slate-100 text-slate-900",
                                  )}
                                >
                                  {message.message}
                                </div>
                                <p className="text-[11px] text-[var(--bank-muted)]">
                                  {senderLabel} - {formatChatTimestamp(message.created_at)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[var(--bank-navy)]/10 bg-white px-6 py-4">
                    <div className="space-y-3">
                      <Textarea
                        value={messageText}
                        onChange={(event) => setMessageText(event.target.value)}
                        onKeyDown={handleMessageKeyDown}
                        placeholder="Write a reply to the customer..."
                        rows={3}
                        className="resize-none bg-white"
                        disabled={activeConversation.status === "resolved"}
                      />
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-[var(--bank-muted)]">
                          Subject: {activeConversationSubject}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => void handleResolveConversation()}
                            disabled={resolving || activeConversation.status === "resolved"}
                          >
                            {resolving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Resolve
                          </Button>
                          <Button
                            onClick={() => void handleSendMessage()}
                            disabled={sending || activeConversation.status === "resolved" || !messageText.trim()}
                            className="bg-[var(--bank-navy)] text-white hover:bg-[var(--bank-slate)]"
                          >
                            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Send
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-[500px] items-center justify-center px-6 text-center">
                <div className="max-w-sm">
                  <UserRound className="mx-auto h-10 w-10 text-[var(--bank-gold)]" />
                  <h2 className="mt-4 text-xl font-semibold text-[var(--bank-navy)]">Conversation unavailable</h2>
                  <p className="mt-2 text-sm text-[var(--bank-muted)]">
                    This conversation could not be loaded. Try selecting another thread or refreshing the list.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
