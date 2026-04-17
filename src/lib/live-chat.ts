import { supabase } from "@/integrations/supabase/client";

export const chatSupabase = supabase as typeof supabase & {
  from: (table: string) => any;
};

export const PRIVILEGED_ROLES = [
  "admin",
  "super_admin",
  "finance_admin",
  "support_admin",
  "content_manager",
] as const;

export const SUPPORT_ROLES = ["admin", "super_admin", "support_admin"] as const;

export type ChatStatus = "waiting" | "active" | "resolved";
export type ChatSenderType = "customer" | "agent" | "system";

export interface ChatConversationRow {
  id: string;
  customer_id: string | null;
  agent_id: string | null;
  status: ChatStatus;
  subject: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
}

export interface ChatMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_type: ChatSenderType;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatAgentStatusRow {
  agent_id: string;
  is_online: boolean;
  last_seen: string | null;
}

export interface ChatProfileSummary {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at?: string | null;
}

export interface ChatAccountSummary {
  id: string;
  account_number: string;
  account_type: string;
  available_balance: number;
  balance: number | null;
  currency: string | null;
  status: string | null;
}

export interface ChatTransactionSummary {
  id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  status: string | null;
  created_at: string | null;
}

export interface ConversationListItem extends ChatConversationRow {
  customer_name: string;
  customer_email: string;
  latest_message: string;
  unread_count: number;
  is_guest: boolean;
  guest_name: string | null;
  guest_email: string | null;
}

export interface GuestConversationSubject {
  type: "guest";
  name: string;
  email: string;
  subject?: string | null;
}

export const CHAT_SCHEMA_UNAVAILABLE_MESSAGE =
  "Live chat is not available until the chat tables are deployed to this Supabase project.";

export const isPrivilegedRole = (role: string) =>
  PRIVILEGED_ROLES.includes(role as (typeof PRIVILEGED_ROLES)[number]);

export const canAccessLiveChatSupport = (roles: string[]) =>
  roles.some((role) => SUPPORT_ROLES.includes(role as (typeof SUPPORT_ROLES)[number]));

export const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "U";

export const formatChatTimestamp = (value?: string | null) => {
  if (!value) return "";

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

export const formatConversationDate = (value?: string | null) => {
  if (!value) return "-";

  return new Date(value).toLocaleString();
};

export const formatRelativeTime = (value?: string | null) => {
  if (!value) return "Just now";

  const now = Date.now();
  const then = new Date(value).getTime();
  const diffMs = now - then;

  if (Number.isNaN(diffMs)) return "Just now";

  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(value).toLocaleDateString();
};

export const getConversationStatusBadgeClass = (status: ChatStatus) => {
  if (status === "waiting") {
    return "border-0 bg-amber-100 text-amber-700";
  }

  if (status === "active") {
    return "border-0 bg-emerald-100 text-emerald-700";
  }

  return "border-0 bg-slate-200 text-slate-700";
};

export const buildGuestConversationSubject = (payload: GuestConversationSubject) =>
  JSON.stringify(payload);

export const parseGuestConversationSubject = (value?: string | null) => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<GuestConversationSubject>;

    if (parsed.type !== "guest" || typeof parsed.name !== "string" || typeof parsed.email !== "string") {
      return null;
    }

    return {
      type: "guest" as const,
      name: parsed.name,
      email: parsed.email,
      subject: typeof parsed.subject === "string" ? parsed.subject : null,
    };
  } catch {
    return null;
  }
};

export const isMissingChatSchemaError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error && typeof (error as { message?: unknown }).message === "string"
    ? (error as { message: string }).message
    : "";
  const code = "code" in error && typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : "";

  return code === "PGRST205"
    || (
      message.includes("schema cache")
      && (
        message.includes("public.chat_conversations")
        || message.includes("public.chat_messages")
        || message.includes("public.chat_agent_status")
      )
    );
};

export const sortMessagesByCreatedAt = (messages: ChatMessageRow[]) =>
  [...messages].sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());

export const upsertMessage = (messages: ChatMessageRow[], nextMessage: ChatMessageRow) => {
  const existingIndex = messages.findIndex((message) => message.id === nextMessage.id);

  if (existingIndex === -1) {
    return sortMessagesByCreatedAt([...messages, nextMessage]);
  }

  const nextMessages = [...messages];
  nextMessages[existingIndex] = nextMessage;
  return sortMessagesByCreatedAt(nextMessages);
};
