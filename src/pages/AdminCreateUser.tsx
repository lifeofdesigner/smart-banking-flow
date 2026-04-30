/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type FormRole = "user" | "admin";
type AccountTypeOption = "savings" | "current";

type ListedUser = {
  id: string;
  full_name: string;
  email: string;
  created_at: string | null;
  roles: string[];
};

const defaultForm = {
  full_name: "",
  email: "",
  password: "",
  role: "user" as FormRole,
  account_type: "savings" as AccountTypeOption,
};

const defaultAccountTypeIds: Record<AccountTypeOption, string | null> = {
  savings: null,
  current: null,
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createSignupClient = () =>
  createClient<Database>(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }

  return fallback;
};

const getPrimaryRole = (roles: string[]) => {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("support_admin")) return "support_admin";
  if (roles.includes("finance_admin")) return "finance_admin";
  if (roles.includes("content_manager")) return "content_manager";
  return roles[0] || "user";
};

const getRoleBadgeClass = (role: string) => {
  if (role === "admin") {
    return "border-0 bg-[var(--bank-gold)]/25 text-[#7a5b0d]";
  }

  if (role === "user") {
    return "border-0 bg-emerald-100 text-emerald-700";
  }

  return "border-0 bg-[var(--bank-navy)]/10 text-[var(--bank-navy)]";
};

export default function AdminCreateUser() {
  const navigate = useNavigate();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<ListedUser[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [accountTypeIds, setAccountTypeIds] = useState(defaultAccountTypeIds);

  useEffect(() => {
    void initializePage();
  }, [navigate]);

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

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (rolesError) {
        throw rolesError;
      }

      const hasAdminRole = (roles || []).some((roleRow) => roleRow.role === "admin");

      if (!hasAdminRole) {
        toast.error("Access denied: admin role required for direct user creation");
        navigate("/admin");
        return;
      }

      setAuthorized(true);
      await Promise.all([loadUsers(), loadAccountTypeIds()]);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load user management"));
      navigate("/admin");
    } finally {
      setLoadingAuth(false);
    }
  };

  const loadAccountTypeIds = async () => {
    const { data, error } = await supabase
      .from("account_types")
      .select("id, name")
      .in("name", ["Savings Account", "Checking Account"]);

    if (error) {
      throw error;
    }

    const nextIds = { ...defaultAccountTypeIds };

    for (const row of data || []) {
      if (row.name === "Savings Account") {
        nextIds.savings = row.id;
      }

      if (row.name === "Checking Account") {
        nextIds.current = row.id;
      }
    }

    setAccountTypeIds(nextIds);
  };

  const loadUsers = async () => {
    setLoadingUsers(true);

    try {
      const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (profilesError) throw profilesError;
      if (rolesError) throw rolesError;

      const rolesByUser = new Map<string, string[]>();

      for (const roleRow of roles || []) {
        const roleList = rolesByUser.get(roleRow.user_id) || [];
        if (!roleList.includes(roleRow.role)) {
          roleList.push(roleRow.role);
        }
        rolesByUser.set(roleRow.user_id, roleList);
      }

      const nextUsers = (profiles || []).map((profile) => ({
        ...profile,
        roles: rolesByUser.get(profile.id) || ["user"],
      }));

      setUsers(nextUsers);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load users"));
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const ensureProfileRecord = async (
    signupClient: SupabaseClient<Database>,
    userId: string,
    fullName: string,
    email: string,
    canWriteAsSignedUpUser: boolean,
  ) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data: existingProfile, error: profileLookupError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (profileLookupError) {
        throw profileLookupError;
      }

      if (existingProfile) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ full_name: fullName, email })
          .eq("id", userId);

        if (updateError) {
          throw updateError;
        }

        return;
      }

      await wait(250 * (attempt + 1));
    }

    if (!canWriteAsSignedUpUser) {
      throw new Error("User account created, but the profile row was not available for browser-side setup.");
    }

    const {
      error,
    } = await signupClient.from("profiles").insert({
      id: userId,
      full_name: fullName,
      email,
    });

    if (error) {
      throw error;
    }
  };

  const assignRole = async (userId: string, role: FormRole) => {
    const rolesToAssign: FormRole[] = role === "admin" ? ["user", "admin"] : ["user"];

    for (const nextRole of rolesToAssign) {
      const { error } = await supabase.from("user_roles").upsert(
        {
          user_id: userId,
          role: nextRole,
        },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );

      if (error) {
        throw error;
      }
    }
  };

  const applyAccountType = async (userId: string, accountType: AccountTypeOption) => {
    const desiredAccountTypeId = accountTypeIds[accountType];

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data: account, error: accountLookupError } = await supabase
        .from("accounts")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (accountLookupError) {
        throw accountLookupError;
      }

      if (account) {
        const updatePayload: Database["public"]["Tables"]["accounts"]["Update"] = {
          account_type: accountType,
        };

        if (desiredAccountTypeId) {
          updatePayload.account_type_id = desiredAccountTypeId;
        }

        const { error: updateError } = await supabase
          .from("accounts")
          .update(updatePayload)
          .eq("id", account.id);

        if (updateError) {
          throw updateError;
        }

        return;
      }

      await wait(250 * (attempt + 1));
    }
  };

  const handleSubmit = async () => {
    const fullName = form.full_name.trim();
    const email = form.email.trim().toLowerCase();

    if (!fullName || !email || !form.password) {
      toast.error("Full name, email, password, role, and account type are required");
      return;
    }

    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setSubmitting(true);

    try {
      const signupClient = createSignupClient();
      const { data, error } = await signupClient.auth.signUp({
        email,
        password: form.password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("User signup did not return a user record");
      }

      await ensureProfileRecord(signupClient, data.user.id, fullName, email, Boolean(data.session));
      await assignRole(data.user.id, form.role);
      await applyAccountType(data.user.id, form.account_type);

      toast.success(`${fullName} created successfully`);
      setForm(defaultForm);
      await loadUsers();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create user"));
      await loadUsers();
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return user.full_name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
  });

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse">Loading user management...</div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 py-4 md:p-6">
        <div className="space-y-2">
          <h1 className="admin-premium-heading text-3xl text-[var(--bank-navy)]">User Management</h1>
          <p className="text-sm text-[var(--bank-muted)]">Create users directly from the admin portal and review existing profiles.</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px,1fr]">
          <Card className="bg-white rounded-xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[var(--bank-navy)]">Create New User</CardTitle>
              <CardDescription className="text-[var(--bank-muted)]">
                Browser-based user onboarding without Edge Functions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-user-full-name">Full Name</Label>
                <Input
                  id="create-user-full-name"
                  value={form.full_name}
                  onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                  placeholder="Jane Doe"
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-user-email">Email</Label>
                <Input
                  id="create-user-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="jane@example.com"
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-user-password">Password</Label>
                <Input
                  id="create-user-password"
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Minimum 8 characters"
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(value: FormRole) => setForm((current) => ({ ...current, role: value }))}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select
                  value={form.account_type}
                  onValueChange={(value: AccountTypeOption) => setForm((current) => ({ ...current, account_type: value }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full bg-[var(--bank-navy)] text-white hover:bg-[var(--bank-slate)]"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create User
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-xl border-0 shadow-sm">
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-[var(--bank-navy)]">Existing Users</CardTitle>
                  <CardDescription className="text-[var(--bank-muted)]">Profiles and roles from `public.profiles` and `public.user_roles`.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => loadUsers()} disabled={loadingUsers}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loadingUsers ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or email"
                className="bg-white"
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="admin-premium-table-head">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUsers ? (
                    <TableRow className="admin-premium-row">
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow className="admin-premium-row">
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No users match your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => {
                      const primaryRole = getPrimaryRole(user.roles);

                      return (
                        <TableRow key={user.id} className="admin-premium-row">
                          <TableCell className="font-medium text-[var(--bank-navy)]">{user.full_name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge className={getRoleBadgeClass(primaryRole)}>
                              {primaryRole.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.created_at ? new Date(user.created_at).toLocaleString() : "-"}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
