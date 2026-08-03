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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Copy, Loader2, RefreshCw, UserPlus, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { getSessionUserId } from "@/lib/supabaseSession";

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

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }

  return fallback;
};

const buildUsers = (
  profileRows: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    created_at: string | null;
    can_initiate_wire_transfer: boolean | null;
  }>,
  roleRows: Array<{ user_id: string; role: string }>,
  accountRows: Array<{ user_id: string; status: string | null }>,
  search: string,
  roleFilter: "all" | Role,
) => {
  const rolesByUserId = new Map<string, string[]>();
  for (const roleRow of roleRows) {
    const roles = rolesByUserId.get(roleRow.user_id) || [];
    if (!roles.includes(roleRow.role)) roles.push(roleRow.role);
    rolesByUserId.set(roleRow.user_id, roles);
  }

  const accountStatusByUserId = new Map<string, string | null>();
  for (const accountRow of accountRows) {
    if (!accountStatusByUserId.has(accountRow.user_id)) {
      accountStatusByUserId.set(accountRow.user_id, accountRow.status);
    }
  }

  const query = search.trim().toLowerCase();

  return profileRows
    .map<ManagedUser>((profile) => ({
      id: profile.id,
      full_name: profile.full_name || "User",
      email: profile.email || "",
      roles: rolesByUserId.get(profile.id) || ["user"],
      created_at: profile.created_at,
      status: accountStatusByUserId.get(profile.id) || "pending",
      can_initiate_wire_transfer: profile.can_initiate_wire_transfer ?? true,
    }))
    .filter((user) => {
      if (roleFilter !== "all" && !user.roles.includes(roleFilter)) return false;
      if (!query) return true;
      return user.email.toLowerCase().includes(query) || user.full_name.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bd - ad;
    });
};

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

  const handleUpdateAccountStatus = async (userId: string, newStatus: "active" | "frozen" | "closed") => {
    try {
      const { error } = await supabase.rpc("admin_update_user_account_status", {
        p_user_id: userId,
        p_status: newStatus,
      });

      if (error) throw error;
      toast.success(`User account has been ${newStatus}.`);
      await fetchUsers();
    } catch (error) {
      toast.error(`Failed to update account status: ${toErrorMessage(error, "Unknown error")}`);
    }
  };

  const handleToggleWireTransfer = async (user: ManagedUser) => {
    const canTransfer = !user.can_initiate_wire_transfer;

    try {
      const { error } = await supabase.rpc("admin_toggle_wire_transfer_access", {
        p_user_id: user.id,
        p_can_transfer: canTransfer,
      });

      if (error) throw error;
      toast.success(`Wire transfers have been ${canTransfer ? "unblocked" : "blocked"} for the user.`);
      await fetchUsers();
    } catch (error) {
      toast.error(`Failed to toggle wire transfer access: ${toErrorMessage(error, "Unknown error")}`);
    }
  };

  useEffect(() => {
    void checkAccess();
  }, []);

  const checkAccess = async () => {
    setLoadingAuth(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = getSessionUserId(session);

      if (!userId) {
        navigate("/admin-login");
        return;
      }

      const { data: roleRow, error } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!roleRow) {
        toast.error("Access denied: elevated admin privileges required");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      await fetchUsers("");
    } catch (error) {
      toast.error(toErrorMessage(error, "Failed to load user management"));
      navigate("/dashboard");
    } finally {
      setLoadingAuth(false);
    }
  };

  const fetchUsers = async (overrideSearch?: string) => {
    setLoadingUsers(true);

    try {
      const [{ data: profileRows, error: profileError }, { data: roleRows, error: roleError }, { data: accountRows, error: accountError }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, email, created_at, can_initiate_wire_transfer")
            .order("created_at", { ascending: false }),
          supabase.from("user_roles").select("user_id, role"),
          supabase.from("accounts").select("user_id, status"),
        ]);

      if (profileError) throw profileError;
      if (roleError) throw roleError;
      if (accountError) throw accountError;

      setUsers(buildUsers(
        (profileRows || []) as Array<{
          id: string;
          full_name: string | null;
          email: string | null;
          created_at: string | null;
          can_initiate_wire_transfer: boolean | null;
        }>,
        (roleRows || []) as Array<{ user_id: string; role: string }>,
        (accountRows || []) as Array<{ user_id: string; status: string | null }>,
        overrideSearch ?? search,
        roleFilter,
      ));
    } catch (error) {
      toast.error(toErrorMessage(error, "Failed to load users"));
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    const timer = setTimeout(() => {
      void fetchUsers();
    }, 350);

    return () => clearTimeout(timer);
  }, [search, roleFilter, isAdmin]);

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
      const { error } = await supabase.rpc("admin_create_user", {
        p_full_name: form.full_name.trim(),
        p_email: form.email.trim().toLowerCase(),
        p_password: form.password,
        p_role: form.role,
        p_account_type: "savings",
        p_opening_balance: 0,
      });

      if (error) throw error;

      toast.success(form.role === "admin" ? "Admin created successfully" : "User created successfully");
      setForm({ full_name: "", email: "", password: "", role: "user" });
      setDialogOpen(false);
      await fetchUsers();
    } catch (error) {
      toast.error(toErrorMessage(error, "Failed to create user"));
    } finally {
      setSubmitting(false);
    }
  };

  const openTempPasswordCopy = async () => copyTempPassword();

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
                  Create platform users and admins securely using privileged database operations.
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                Actions <ChevronDown className="ml-2 h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {user.status !== "active" && (
                                <DropdownMenuItem onClick={() => handleUpdateAccountStatus(user.id, "active")}>Activate</DropdownMenuItem>
                              )}
                              {user.status === "active" && (
                                <DropdownMenuItem onClick={() => handleUpdateAccountStatus(user.id, "frozen")}>Hold</DropdownMenuItem>
                              )}
                              {user.status === "active" && (
                                <DropdownMenuItem onClick={() => handleUpdateAccountStatus(user.id, "frozen")}>Lock</DropdownMenuItem>
                              )}
                              {user.status !== "closed" && (
                                <DropdownMenuItem onClick={() => handleUpdateAccountStatus(user.id, "closed")}>Close Account</DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleToggleWireTransfer(user)}>
                                {user.can_initiate_wire_transfer ? "Block Wire" : "Un-block Wire"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
              Creates a new auth account, profile record, and required roles using secure database privileges.
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
                <Button type="button" variant="outline" onClick={openTempPasswordCopy}>
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
