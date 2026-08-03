export type SupabaseSessionLike = {
  user?: { id: string } | null;
  access_token?: string | null;
} | null;

export const decodeJwtPayload = (token: string) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = atob(normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "="));

    return JSON.parse(decodedPayload) as { sub?: string };
  } catch {
    return null;
  }
};

export const getSessionUserId = (session: SupabaseSessionLike) =>
  session?.user?.id ?? (session?.access_token ? decodeJwtPayload(session.access_token)?.sub ?? null : null);
