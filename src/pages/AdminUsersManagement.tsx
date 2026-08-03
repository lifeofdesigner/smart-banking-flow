/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Loader2, RefreshCw, UserPlus, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from "@supabase/supabase-js";

type Role = "user" | "admin";

interface ManagedUser {
  id: string;
  full_name: string;
  email: string;
  roles: string[];
  created_at: string | null;
  status: string;
  can_initiate_wire_transfer: boolean;
}

export default function AdminUsersManagement() {
  const navigate = useNavigate();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [users, setUsers] = useState<ManagedUser[]>([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "user" as Role,
  });

  const handleToggleAccountStatus = async (user: ManagedUser) => {
    const newStatus = user.status === 'frozen' ? 'active' : 'frozen';
    try {
      const { error } = await supabase.rpc('admin_update_user_account_status', {
        p_user_id: user.id,
        p_status: newStatus,
      });
      if (error) throw error;
      toast.success(`User account has been ${newStatus}.`);
      await fetchUsers(); // Refresh the user list
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleToggleWireTransfer = async (user: ManagedUser) => {
    const canTransfer = !user.can_initiate_wire_transfer;
    try {
      const { error } = await supabase.rpc('admin_toggle_wire_transfer_access', {
        p_user_id: user.id,
        p_can_transfer: canTransfer,
      });
      if (error) throw error;
      toast.success(`Wire transfers have been ${canTransfer ? 'unblocked' : 'blocked'} for the user.`);
      await fetchUsers(); // Refresh the user list
    } catch (error) {
      toast.error(error.message);
    }
  };

  const extractFunctionPayloadError = (value: unknown) => {
    if (!value || typeof value !== "object") return null;

    if ("error" in value && typeof value.error === "string" && value.error.trim()) {
      return value.error;
    }

    if ("message" in value && typeof value.message === "string" && value.message.trim()) {
      return value.message;
    }

    return null;
  };

  const getSafeFunctionErrorMessage = async (error: unknown, fallback: string) => {
    if (error instanceof FunctionsHttpError) {
      const response = error.context;
      const jsonResponse = response.clone();
      const textResponse = response.clone();

      try {
        const body = await jsonResponse.json();
        const bodyMessage = extractFunctionPayloadError(body);
        if (bodyMessage) {
          return bodyMessage;
        }
      } catch {
        // ignore parse errors and fall back to text/status
      }

      try {
        const rawText = await textResponse.text();
        if (rawText.trim()) {
          return rawText.trim();
        }
      } catch {
        // ignore read errors and fall back
      }

      if (response.status === 403) {
        return "Forbidden: elevated admin role required";
      }

      if (response.status) {
        return `Request failed (${response.status}${response.statusText ? ` ${response.statusText}` : ""})`;
      }

      return fallback;
    }

    if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
      return error.message || fallback;
    }

    if (error && typeof error === "object" && "message" in error && typeof (error as unknown).message === "string") {
      return (error as unknown).message;
    }

    return fallback;
  };

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    setLoadingAuth(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/admin-login");
        return;
      }

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();

      if (!roleRow) {
        toast.error("Access denied: elevated admin privileges required");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      await fetchUsers("");
    } catch {
      navigate("/dashboard");
    } finally {
      setLoadingAuth(false);
    }
  };

  const fetchUsers = async (overrideSearch?: string) => {
    setLoadingUsers(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const effectiveSearch = (overrideSearch ?? search).trim();
      const { data, error } = await supabase.functions.invoke("admin-user-management", {
        body: {
          action: "list_users",
          search: effectiveSearch,
          role: roleFilter,
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      const payloadError = extractFunctionPayloadError(data);
      if (payloadError) throw new Error(payloadError);
      setUsers((data?.data || []) as ManagedUser[]);
    } catch (error) {
      toast.error(await getSafeFunctionErrorMessage(error, "Failed to load users"));
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const openCreateUser = () => {
    setForm({ full_name: "", email: "", password: "", role: "user" });
    setDialogOpen(true);
  };

  const openCreateAdmin = () => {
    setForm({ full_name: "", email: "", password: "", role: "admin" });
    setDialogOpen(true);
  };

  const copyTempPassword = async () => {
    if (!form.password) {
      toast.error("Enter a temporary password first");
      return;
    }

    try {
      await navigator.clipboard.writeText(form.password);
      toast.success("Temporary password copied");
    } catch {
      toast.error("Failed to copy password");
    }
  };

  const createUser = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error("Full name, email and temporary password are required");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("admin-user-management", {
        body: {
          action: "create_user",
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      const payloadError = extractFunctionPayloadError(data);
      if (payloadError) throw new Error(payloadError);

      toast.success(form.role === "admin" ? "Admin created successfully" : "User created successfully");
      setForm({ full_name: "", email: "", password: "", role: "user" });
      setDialogOpen(false);
      await fetchUsers();
    } catch (error) {
      toast.error(await getSafeFunctionErrorMessage(error, "Failed to create user"));
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    const timer = setTimeout(() => {
      fetchUsers();
    }, 350);
    return () => clearTimeout(timer);
  }, [search, roleFilter, isAdmin]);

  const emptyMessage = useMemo(() => {
    if (search.trim()) return "No users match your search.";
    if (roleFilter !== "all") return `No ${roleFilter} roles found.`;
    return "No users available.";
  }, [roleFilter, search]);

  if (loadingAuth) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
          <div className="text-muted-foreground animate-pulse">Loading admin user management...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 py-4 md:p-6">
        <Card className="admin-premium-card rounded-lg border-0">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="admin-premium-heading text-[var(--bank-navy)]">Admin User Management</CardTitle>
                <CardDescription className="text-[var(--bank-muted)]">
                  Create platform users and admins securely using server-side privileged operations.
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => fetchUsers()} disabled={loadingUsers}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loadingUsers ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button variant="outline" onClick={openCreateUser}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create User
                </Button>
                <Button onClick={openCreateAdmin} className="bg-[var(--bank-gold)] text-[#27200d] hover:bg-[#b9973f]">
                  <UserRoundCog className="mr-2 h-4 w-4" />
                  Create Admin
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email or display name"
                className="bg-white"
              />
              <Select value={roleFilter} onValueChange={(value: "all" | Role) => setRoleFilter(value)}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader className="admin-premium-table-head">
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUsers ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        {emptyMessage}
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id} className="admin-premium-row">
                        <TableCell>{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.length ? (
                              user.roles.map((role) => (
                                <Badge key={`${user.id}-${role}`} variant={role === "admin" ? "default" : "secondary"}>
                                  {role}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="secondary">none</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{user.created_at ? new Date(user.created_at).toLocaleString() : "-"}</TableCell>
                        <TableCell>
                          <Badge variant={user.status === "active" ? "default" : "secondary"}>{user.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleAccountStatus(user)}
                            >
                              {user.status === 'frozen' ? 'Un-hold Account' : 'Hold Account'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleWireTransfer(user)}
                            >
                              {user.can_initiate_wire_transfer ? 'Block Wire' : 'Un-block Wire'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.role === "admin" ? "Create Admin" : "Create User"}</DialogTitle>
            <DialogDescription>
              Creates a new auth account, profile record, and required roles using the secure admin Edge Function.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-full-name">Full name / display name</Label>
              <Input
                id="create-full-name"
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                placeholder="Jane Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="jane@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-password">Temporary password</Label>
              <div className="flex gap-2">
                <Input
                  id="create-password"
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Set temporary password"
                />
                <Button type="button" variant="outline" onClick={copyTempPassword}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(value: Role) => setForm((prev) => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={createUser} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {form.role === "admin" ? "Create Admin" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

