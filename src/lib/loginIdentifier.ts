import { supabase } from "@/integrations/supabase/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isEmailLike = (value: string) => EMAIL_RE.test(value.trim());

/**
 * Resolves a login identifier (email or bank account number) to the email
 * Supabase Auth actually needs. Account-number resolution happens server-side
 * via the resolve_login_identifier RPC, which never reveals whether a given
 * identifier exists — an unresolvable identifier is echoed back unchanged so
 * the caller falls through to signInWithPassword's own generic error.
 */
export async function resolveLoginEmail(identifier: string): Promise<string> {
  const trimmed = identifier.trim();
  if (isEmailLike(trimmed)) return trimmed;

  const { data, error } = await supabase.rpc("resolve_login_identifier", { p_identifier: trimmed });
  if (error || typeof data !== "string" || !data) return trimmed;

  return data;
}

export async function signInWithIdentifier(identifier: string, password: string) {
  const email = await resolveLoginEmail(identifier);
  return supabase.auth.signInWithPassword({ email, password });
}
