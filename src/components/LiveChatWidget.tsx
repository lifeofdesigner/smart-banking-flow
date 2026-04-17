import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import {
  CHAT_SCHEMA_UNAVAILABLE_MESSAGE,
  buildGuestConversationSubject,
  chatSupabase,
  ChatConversationRow,
  ChatMessageRow,
  formatChatTimestamp,
  formatRelativeTime,
  isMissingChatSchemaError,
  parseGuestConversationSubject,
  upsertMessage,
} from "@/lib/live-chat";

interface LiveChatWidgetProps {
  customerId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
}

interface ResolvedChatIdentity {
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  isAuthenticated: boolean;
}

interface GuestChatSession {
  guestSessionId: string;
  conversationId: string | null;
  name: string;
  email: string;
}

const GUEST_STORAGE_KEY = "halverix-live-chat-guest";
const DEFAULT_GUEST_SUBJECT = "Public Landing Page Chat";

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

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const readGuestSession = (): GuestChatSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<GuestChatSession>;
    if (
      typeof parsed.guestSessionId !== "string"
      || typeof parsed.name !== "string"
      || typeof parsed.email !== "string"
    ) {
      return null;
    }

    return {
      guestSessionId: parsed.guestSessionId,
      conversationId: typeof parsed.conversationId === "string" ? parsed.conversationId : null,
      name: parsed.name,
      email: parsed.email,
    };
  } catch {
    return null;
  }
};

const persistGuestSession = (session: GuestChatSession | null) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(GUEST_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(session));
};

export default function LiveChatWidget({ customerId, customerName, customerEmail }: LiveChatWidgetProps) {
  const initialGuestSessionRef = useRef<GuestChatSession | null>(readGuestSession());
  const [open, setOpen] = useState(false);
  const [identityReady, setIdentityReady] = useState(Boolean(customerId));
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatUnavailable, setChatUnavailable] = useState(false);
  const [resolvedIdentity, setResolvedIdentity] = useState<ResolvedChatIdentity>({
    customerId: customerId ?? null,
    customerName: customerName ?? null,
    customerEmail: customerEmail ?? null,
    isAuthenticated: Boolean(customerId),
  });
  const [guestSession, setGuestSession] = useState<GuestChatSession | null>(initialGuestSessionRef.current);
  const [guestName, setGuestName] = useState(initialGuestSessionRef.current?.name ?? "");
  const [guestEmail, setGuestEmail] = useState(initialGuestSessionRef.current?.email ?? "");
  const [guestMessage, setGuestMessage] = useState("");
  const [conversation, setConversation] = useState<ChatConversationRow | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [subject, setSubject] = useState("");
  const [messageText, setMessageText] = useState("");
  const [agentName, setAgentName] = useState<string | null>(null);
  const [agentOnline, setAgentOnline] = useState(false);
  const [hasOnlineAgents, setHasOnlineAgents] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isAuthenticated = Boolean(resolvedIdentity.customerId) && resolvedIdentity.isAuthenticated;
  const guestConversationMeta = useMemo(
    () => parseGuestConversationSubject(conversation?.subject),
    [conversation?.subject]
  );
  const displayCustomerName = isAuthenticated
    ? resolvedIdentity.customerName || "You"
    : guestSession?.name || guestName.trim() || "Guest";
  const widgetScope = resolvedIdentity.customerId || guestSession?.guestSessionId || "guest";
  const showGuestPreChat = identityReady && !loading && !conversation && !isAuthenticated;
  const conversationSubjectLabel = guestConversationMeta?.subject || subject || DEFAULT_GUEST_SUBJECT;

  const headerSubtitle = useMemo(() => {
    if (conversation?.agent_id) {
      return agentName ? `Connected to ${agentName}` : "Agent assigned";
    }

    return hasOnlineAgents ? "Support agents are online" : "Leave a message, we'll get back to you";
  }, [agentName, conversation?.agent_id, hasOnlineAgents]);

  useEffect(() => {
    persistGuestSession(guestSession);
  }, [guestSession]);

  useEffect(() => {
    let isMounted = true;

    const loadResolvedIdentity = async () => {
      setLoading(true);

      if (customerId) {
        setResolvedIdentity({
          customerId,
          customerName: customerName ?? null,
          customerEmail: customerEmail ?? null,
          isAuthenticated: true,
        });
        setIdentityReady(true);
        return;
      }

      setIdentityReady(false);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (error || !user) {
        setResolvedIdentity({
          customerId: null,
          customerName: null,
          customerEmail: null,
          isAuthenticated: false,
        });
        setIdentityReady(true);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      setResolvedIdentity({
        customerId: user.id,
        customerName: customerName ?? profile?.full_name ?? user.user_metadata?.full_name ?? null,
        customerEmail: customerEmail ?? profile?.email ?? user.email ?? null,
        isAuthenticated: true,
      });
      setIdentityReady(true);
    };

    void loadResolvedIdentity();

    if (customerId) {
      return () => {
        isMounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadResolvedIdentity();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [customerEmail, customerId, customerName]);

  const loadUnreadCount = async (conversationId: string) => {
    const { count, error } = await chatSupabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("sender_type", "agent")
      .eq("is_read", false);

    if (!error) {
      setUnreadCount(count ?? 0);
    }
  };

  const loadAgentAvailability = async () => {
    const { data, error } = await chatSupabase
      .from("chat_agent_status")
      .select("agent_id, is_online")
      .eq("is_online", true);

    if (error) {
      if (isMissingChatSchemaError(error)) {
        throw error;
      }

      return false;
    }

    const online = (data || []).length > 0;
    setHasOnlineAgents(online);
    setAgentOnline(online);
    return online;
  };

  const loadAssignedAgentState = async (agentId: string | null, fallbackOnline = hasOnlineAgents) => {
    if (!agentId) {
      setAgentName(null);
      setAgentOnline(fallbackOnline);
      return;
    }

    const [{ data: profile }, { data: statusRow }] = await Promise.all([
      chatSupabase.from("profiles").select("full_name").eq("id", agentId).maybeSingle(),
      chatSupabase.from("chat_agent_status").select("is_online").eq("agent_id", agentId).maybeSingle(),
    ]);

    setAgentName(profile?.full_name ?? "Support Agent");
    setAgentOnline(Boolean(statusRow?.is_online));
  };

  const loadMessages = async (conversationId: string) => {
    setLoadingMessages(true);

    const { data, error } = await chatSupabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    setLoadingMessages(false);

    if (error) {
      toast.error(getErrorMessage(error, "Failed to load chat messages"));
      return;
    }

    setMessages((data || []).map(normalizeMessage));
  };

  const markMessagesAsRead = async (conversationId: string) => {
    const { error } = await chatSupabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("sender_type", "agent")
      .eq("is_read", false);

    if (!error) {
      setMessages((current) =>
        current.map((message) =>
          message.sender_type === "agent" ? { ...message, is_read: true } : message
        )
      );
      setUnreadCount(0);
    }
  };

  const loadConversation = async () => {
    if (!identityReady) {
      return;
    }

    setLoading(true);
    setChatUnavailable(false);

    try {
      const onlineAgentsAvailable = await loadAgentAvailability();
      let data: any = null;
      let error: any = null;

      if (isAuthenticated && resolvedIdentity.customerId) {
        ({ data, error } = await chatSupabase
          .from("chat_conversations")
          .select("*")
          .eq("customer_id", resolvedIdentity.customerId)
          .in("status", ["waiting", "active"])
          .order("last_message_at", { ascending: false })
          .limit(1)
          .maybeSingle());
      } else if (guestSession?.conversationId) {
        ({ data, error } = await chatSupabase
          .from("chat_conversations")
          .select("*")
          .eq("id", guestSession.conversationId)
          .in("status", ["waiting", "active"])
          .maybeSingle());
      }

      if (error) {
        throw error;
      }

      if (!data) {
        setConversation(null);
        setMessages([]);
        setUnreadCount(0);
        setAgentName(null);
        setAgentOnline(onlineAgentsAvailable);
        if (!isAuthenticated && guestSession?.conversationId) {
          setGuestSession((current) =>
            current ? { ...current, conversationId: null } : current
          );
        }
        return;
      }

      const nextConversation = normalizeConversation(data);
      setConversation(nextConversation);
      setSubject(
        isAuthenticated
          ? nextConversation.subject ?? ""
          : parseGuestConversationSubject(nextConversation.subject)?.subject ?? DEFAULT_GUEST_SUBJECT
      );
      await Promise.all([
        loadMessages(nextConversation.id),
        loadUnreadCount(nextConversation.id),
        loadAssignedAgentState(nextConversation.agent_id, onlineAgentsAvailable),
      ]);
    } catch (error) {
      if (isMissingChatSchemaError(error)) {
        setChatUnavailable(true);
        return;
      }

      toast.error(getErrorMessage(error, "Failed to load live chat"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!identityReady) {
      return;
    }

    void loadConversation();
  }, [guestSession?.conversationId, identityReady, isAuthenticated, resolvedIdentity.customerId]);

  useEffect(() => {
    if (!conversation?.id || !open) return;

    void markMessagesAsRead(conversation.id);
  }, [conversation?.id, open]);

  useEffect(() => {
    if (!open) return;

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!conversation?.id) return;

    const messageChannel = chatSupabase
      .channel(`customer-chat-messages-${widgetScope}-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const nextMessage = normalizeMessage(payload.new);
          setMessages((current) => upsertMessage(current, nextMessage));

          if (nextMessage.sender_type === "agent") {
            if (open) {
              void markMessagesAsRead(conversation.id);
            } else {
              setUnreadCount((current) => current + 1);
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((current) => upsertMessage(current, normalizeMessage(payload.new)));
        },
      )
      .subscribe();

    const conversationChannel = chatSupabase
      .channel(`customer-chat-conversation-${widgetScope}-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_conversations",
          filter: `id=eq.${conversation.id}`,
        },
        (payload) => {
          const nextConversation = normalizeConversation(payload.new);

          if (nextConversation.status === "resolved") {
            setConversation(null);
            setMessages([]);
            setSubject("");
            setAgentName(null);
            setAgentOnline(false);
            setUnreadCount(0);
            if (!isAuthenticated) {
              setGuestSession((current) =>
                current ? { ...current, conversationId: null } : current
              );
            }
            toast.success("This chat was resolved. You can start a new conversation anytime.");
            return;
          }

          setConversation(nextConversation);
          void loadAssignedAgentState(nextConversation.agent_id);
        },
      )
      .subscribe();

    return () => {
      void chatSupabase.removeChannel(messageChannel);
      void chatSupabase.removeChannel(conversationChannel);
    };
  }, [conversation?.id, isAuthenticated, open, widgetScope]);

  useEffect(() => {
    if (!conversation?.agent_id) return;

    const agentStatusChannel = chatSupabase
      .channel(`customer-chat-agent-status-${conversation.agent_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_agent_status",
          filter: `agent_id=eq.${conversation.agent_id}`,
        },
        (payload) => {
          setAgentOnline(Boolean((payload.new as { is_online?: boolean } | null)?.is_online));
        },
      )
      .subscribe();

    return () => {
      void chatSupabase.removeChannel(agentStatusChannel);
    };
  }, [conversation?.agent_id]);

  useEffect(() => {
    const availabilityChannel = chatSupabase
      .channel(`customer-chat-availability-${widgetScope}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_agent_status",
        },
        () => {
          void loadAgentAvailability();

          if (conversation?.agent_id) {
            void loadAssignedAgentState(conversation.agent_id);
          }
        },
      )
      .subscribe();

    return () => {
      void chatSupabase.removeChannel(availabilityChannel);
    };
  }, [conversation?.agent_id, widgetScope]);

  const handleSendMessage = async () => {
    const trimmedMessage = showGuestPreChat ? guestMessage.trim() : messageText.trim();
    if (!trimmedMessage) {
      return;
    }

    if (showGuestPreChat) {
      if (!guestName.trim() || !guestEmail.trim()) {
        toast.error("Please enter your name and email before starting the chat.");
        return;
      }

      if (!isValidEmail(guestEmail.trim())) {
        toast.error("Please enter a valid email address.");
        return;
      }
    }

    if (!isAuthenticated && !guestSession?.guestSessionId && !guestName.trim()) {
      return;
    }

    setSending(true);

    try {
      let activeConversation = conversation;
      let nextGuestSession = guestSession;

      if (!activeConversation) {
        const sentAt = new Date().toISOString();

        if (isAuthenticated && resolvedIdentity.customerId) {
          const { data, error } = await chatSupabase
            .from("chat_conversations")
            .insert({
              customer_id: resolvedIdentity.customerId,
              subject: subject.trim() || "General Support",
              status: "waiting",
              last_message_at: sentAt,
            })
            .select("*")
            .single();

          if (error) {
            throw error;
          }

          activeConversation = normalizeConversation(data);
          setConversation(activeConversation);
          setSubject(activeConversation.subject ?? "");
        } else {
          const guestSessionId = guestSession?.guestSessionId
            || globalThis.crypto?.randomUUID?.()
            || `guest-${Date.now()}`;
          nextGuestSession = {
            guestSessionId,
            conversationId: null,
            name: guestName.trim(),
            email: guestEmail.trim(),
          };

          const { data, error } = await chatSupabase
            .from("chat_conversations")
            .insert({
              customer_id: null,
              subject: buildGuestConversationSubject({
                type: "guest",
                name: nextGuestSession.name,
                email: nextGuestSession.email,
                subject: DEFAULT_GUEST_SUBJECT,
              }),
              status: "waiting",
              last_message_at: sentAt,
            })
            .select("*")
            .single();

          if (error) {
            throw error;
          }

          activeConversation = normalizeConversation(data);
          nextGuestSession = {
            ...nextGuestSession,
            conversationId: activeConversation.id,
          };
          setGuestSession(nextGuestSession);
          setGuestName(nextGuestSession.name);
          setGuestEmail(nextGuestSession.email);
          setConversation(activeConversation);
          setSubject(DEFAULT_GUEST_SUBJECT);
        }
      }

      if (!activeConversation) {
        throw new Error("Unable to start the conversation.");
      }

      const senderId = isAuthenticated ? resolvedIdentity.customerId : null;
      const sentAt = new Date().toISOString();
      const { data: insertedMessage, error: messageError } = await chatSupabase
        .from("chat_messages")
        .insert({
          conversation_id: activeConversation.id,
          sender_id: senderId,
          sender_type: "customer",
          message: trimmedMessage,
          is_read: false,
        })
        .select("*")
        .single();

      if (messageError) {
        throw messageError;
      }

      const nextStatus = activeConversation.agent_id ? "active" : "waiting";
      const { error: conversationError } = await chatSupabase
        .from("chat_conversations")
        .update({
          status: nextStatus,
          last_message_at: sentAt,
        })
        .eq("id", activeConversation.id);

      if (conversationError) {
        throw conversationError;
      }

      setConversation((current) =>
        current
          ? { ...current, status: nextStatus, last_message_at: sentAt }
          : { ...activeConversation, status: nextStatus, last_message_at: sentAt }
      );
      setMessages((current) => upsertMessage(current, normalizeMessage(insertedMessage)));
      setMessageText("");
      setGuestMessage("");

      if (nextGuestSession && !isAuthenticated) {
        setGuestSession(nextGuestSession);
      }
    } catch (error) {
      if (isMissingChatSchemaError(error)) {
        setChatUnavailable(true);
        toast.error(CHAT_SCHEMA_UNAVAILABLE_MESSAGE);
        return;
      }

      toast.error(getErrorMessage(error, "Failed to send message"));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSendMessage();
    }
  };

  if (chatUnavailable) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!open ? (
        <div className="flex items-center gap-3">
          {!isAuthenticated ? (
            <div className="hidden rounded-full border border-[var(--bank-gold)]/20 bg-white/95 px-4 py-2 text-sm font-medium text-[var(--bank-navy)] shadow-lg sm:inline-flex">
              Chat with us
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bank-navy)] text-white shadow-lg transition hover:scale-[1.02] hover:bg-[var(--bank-slate)]"
            aria-label="Open live chat"
          >
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </button>
        </div>
      ) : (
        <div className="flex h-[min(500px,calc(100vh-110px))] w-[min(350px,calc(100vw-40px))] flex-col overflow-hidden rounded-2xl border border-[var(--bank-navy)]/10 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-[var(--bank-navy)] px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Halverix Bank Support</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-white/80">
                <span className={`h-2.5 w-2.5 rounded-full ${agentOnline ? "bg-emerald-400" : "bg-slate-400"}`} />
                <span className="truncate">{headerSubtitle}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Close live chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-white px-4 py-4">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading chat...
              </div>
            ) : conversation ? (
              loadingMessages ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                  Your conversation is ready. Send a message to start.
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => {
                    const isCustomer = message.sender_type === "customer";
                    const isSystem = message.sender_type === "system";
                    const senderLabel = isSystem
                      ? "System"
                      : isCustomer
                        ? displayCustomerName
                        : agentName || "Support Agent";

                    if (isSystem) {
                      return (
                        <div key={message.id} className="text-center text-xs text-muted-foreground">
                          <p>{message.message}</p>
                          <p className="mt-1">{formatChatTimestamp(message.created_at)}</p>
                        </div>
                      );
                    }

                    return (
                      <div key={message.id} className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[82%] ${isCustomer ? "items-end" : "items-start"} flex flex-col`}>
                          <div
                            className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${
                              isCustomer
                                ? "rounded-br-md bg-[var(--bank-navy)] text-white"
                                : "rounded-bl-md bg-slate-100 text-slate-900"
                            }`}
                          >
                            {message.message}
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {senderLabel} - {formatChatTimestamp(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )
            ) : showGuestPreChat ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[var(--bank-navy)]/10 bg-[var(--bank-bg)]/60 p-4">
                  <p className="text-sm font-semibold text-[var(--bank-navy)]">Start Chat</p>
                  <p className="mt-1 text-sm text-[var(--bank-muted)]">
                    {hasOnlineAgents
                      ? "Share a few details and a support agent can pick this up live."
                      : "Leave a message and our team will follow up by chat as soon as an agent is available."}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--bank-navy)]">Name</label>
                  <Input
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    placeholder="Your full name"
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--bank-navy)]">Email</label>
                  <Input
                    type="email"
                    value={guestEmail}
                    onChange={(event) => setGuestEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--bank-navy)]">Message</label>
                  <Textarea
                    value={guestMessage}
                    onChange={(event) => setGuestMessage(event.target.value)}
                    placeholder="Tell us how we can help"
                    rows={5}
                    className="resize-none bg-white"
                  />
                </div>

                <div className="rounded-xl border border-dashed border-[var(--bank-navy)]/20 px-4 py-3 text-sm text-[var(--bank-muted)]">
                  {hasOnlineAgents
                    ? "Support agents are online now."
                    : "Support agents are currently offline. Your message will still be saved for follow-up."}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[var(--bank-navy)]/10 bg-[var(--bank-bg)]/60 p-4">
                  <p className="text-sm font-semibold text-[var(--bank-navy)]">Start Chat</p>
                  <p className="mt-1 text-sm text-[var(--bank-muted)]">
                    {hasOnlineAgents
                      ? "A support agent can reply live as soon as they join the conversation."
                      : "Leave a message, we'll get back to you as soon as an agent is available."}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--bank-navy)]">Subject</label>
                  <Input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="What do you need help with?"
                    className="bg-white"
                  />
                </div>

                <div className="rounded-xl border border-dashed border-[var(--bank-navy)]/20 px-4 py-3 text-sm text-[var(--bank-muted)]">
                  {hasOnlineAgents
                    ? "Agents are online now."
                    : "Agents are currently offline. Your message will still be saved for follow-up."}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[var(--bank-navy)]/10 bg-white p-3">
            {conversation ? (
              <p className="mb-2 text-[11px] text-muted-foreground">
                Last activity {formatRelativeTime(conversation.last_message_at || conversation.updated_at)}
              </p>
            ) : null}

            {showGuestPreChat ? (
              <Button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={sending || !guestName.trim() || !guestEmail.trim() || !guestMessage.trim()}
                className="w-full bg-[var(--bank-navy)] text-white hover:bg-[var(--bank-slate)]"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Chat"}
              </Button>
            ) : (
              <div className="space-y-2">
                {!conversation ? (
                  <p className="text-[11px] text-muted-foreground">
                    Subject: {conversationSubjectLabel}
                  </p>
                ) : null}
                <div className="flex items-center gap-2">
                  <Input
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={conversation ? "Type your message..." : "Write your first message..."}
                    className="bg-white"
                  />
                  <Button
                    type="button"
                    onClick={() => void handleSendMessage()}
                    disabled={sending || !messageText.trim()}
                    className="bg-[var(--bank-navy)] text-white hover:bg-[var(--bank-slate)]"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : conversation ? <Send className="h-4 w-4" /> : "Start Chat"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
