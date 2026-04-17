import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AppRole = "admin" | "user";

type ListUsersPayload = {
  action: "list_users";
  search?: string;
  role?: AppRole | "all";
};

type CreateUserPayload = {
  action: "create_user";
  email: string;
  password: string;
  full_name: string;
  role: AppRole;
};

type Payload = ListUsersPayload | CreateUserPayload;

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  created_at: string | null;
};

type RoleRow = {
  user_id: string;
  role: string;
};

const privilegedRoles = ["admin", "super_admin", "finance_admin", "support_admin", "content_manager"] as const;

type AuthUserLite = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  email_confirmed_at?: string | null;
  banned_until?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sanitizeError = (err: unknown, fallback = "Request failed") => {
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message?: unknown }).message || "");
    if (message.toLowerCase().includes("already") || message.toLowerCase().includes("duplicate")) {
      return "A user with this email already exists.";
    }
  }

  return fallback;
};

const parseAuthToken = (authHeader: string | null) => {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token.length ? token : null;
};

const isNonEmptyString = (value: unknown) => typeof value === "string" && value.trim().length > 0;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server configuration error" }, 500);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const token = parseAuthToken(req.headers.get("Authorization"));
    if (!token) return json({ error: "Unauthorized" }, 401);

    const {
      data: { user: caller },
      error: callerError,
    } = await supabaseAdmin.auth.getUser(token);

    if (callerError || !caller) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: adminRole, error: adminRoleError } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", caller.id)
      .in("role", [...privilegedRoles])
      .limit(1)
      .maybeSingle();

    if (adminRoleError || !adminRole) {
      return json({ error: "Forbidden: elevated admin role required" }, 403);
    }

    const payload = (await req.json()) as Payload;

    if (payload.action === "list_users") {
      const search = (payload.search || "").trim().toLowerCase();
      const roleFilter = payload.role && payload.role !== "all" ? payload.role : null;

      const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (usersError) {
        return json({ error: "Failed to list users" }, 500);
      }

      const authUsers = (users.users || []) as AuthUserLite[];
      const userIds = authUsers.map((u) => u.id);

      let profiles: ProfileRow[] = [];
      let roles: RoleRow[] = [];

      if (userIds.length) {
        const { data: profileRows } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name, email, created_at")
          .in("id", userIds);

        const { data: roleRows } = await supabaseAdmin
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        profiles = (profileRows || []) as ProfileRow[];
        roles = (roleRows || []) as RoleRow[];
      }

      const profileById = new Map(profiles.map((p) => [p.id, p]));
      const rolesByUserId = new Map<string, string[]>();

      for (const roleRow of roles) {
        const list = rolesByUserId.get(roleRow.user_id) || [];
        if (!list.includes(roleRow.role)) list.push(roleRow.role);
        rolesByUserId.set(roleRow.user_id, list);
      }

      const rows = authUsers
        .map((u) => {
          const profile = profileById.get(u.id);
          const userRoles = rolesByUserId.get(u.id) || [];
          const bannedUntil = u.banned_until ? new Date(u.banned_until) : null;
          const isBanned = bannedUntil ? bannedUntil.getTime() > Date.now() : false;
          const status = isBanned ? "banned" : u.email_confirmed_at ? "active" : "pending";
          const metadataFullName =
            u.user_metadata && typeof u.user_metadata.full_name === "string"
              ? u.user_metadata.full_name
              : null;

          return {
            id: u.id,
            full_name: profile?.full_name || metadataFullName || "User",
            email: profile?.email || u.email || "",
            roles: userRoles,
            created_at: profile?.created_at || u.created_at || null,
            status,
          };
        })
        .filter((u: { roles: string[]; email: string; full_name: string }) => {
          if (roleFilter && !u.roles.includes(roleFilter)) return false;
          if (!search) return true;
          return u.email.toLowerCase().includes(search) || u.full_name.toLowerCase().includes(search);
        })
        .sort((a: { created_at: string | null }, b: { created_at: string | null }) => {
          const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bd - ad;
        });

      return json({ data: rows });
    }

    if (payload.action === "create_user") {
      if (
        !isNonEmptyString(payload.email) ||
        !isNonEmptyString(payload.password) ||
        !isNonEmptyString(payload.full_name) ||
        (payload.role !== "admin" && payload.role !== "user")
      ) {
        return json({ error: "Invalid payload" }, 400);
      }

      const email = payload.email.trim().toLowerCase();
      const fullName = payload.full_name.trim();

      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

      if (createError || !created.user) {
        return json({ error: sanitizeError(createError, "Unable to create user") }, 400);
      }

      const newUserId = created.user.id;

      const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
        {
          id: newUserId,
          full_name: fullName,
          email,
        },
        { onConflict: "id" },
      );

      if (profileError) {
        return json({ error: "User created, but profile setup failed" }, 500);
      }

      const ensureRole = async (role: AppRole) => {
        const { error: roleError } = await supabaseAdmin.from("user_roles").upsert(
          {
            user_id: newUserId,
            role,
          },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );

        if (roleError) {
          throw roleError;
        }
      };

      try {
        await ensureRole("user");
        if (payload.role === "admin") {
          await ensureRole("admin");
        }
      } catch {
        return json({ error: "User created, but role assignment failed" }, 500);
      }

      return json({
        data: {
          id: newUserId,
          email,
          full_name: fullName,
          role: payload.role,
        },
      });
    }

    return json({ error: "Invalid action" }, 400);
  } catch {
    return json({ error: "Unexpected server error" }, 500);
  }
});

