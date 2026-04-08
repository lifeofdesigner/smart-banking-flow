import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface Beneficiary {
  id: string;
  nickname: string;
  account_number: string;
  account_id: string | null;
  bank_name: string;
  created_at: string;
  holder_name?: string;
}

interface RecipientLookup {
  id: string;
  account_number: string;
  status: string | null;
  holder_name: string;
}

const Beneficiaries = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const siteSettings = useSiteSettings();
  const bankName = siteSettings["site_name"] || "MicroFinance Bank";

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [userAccountNumbers, setUserAccountNumbers] = useState<string[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [saving, setSaving] = useState(false);

  // Lookup state
  const [lookupLoading, setLookupLoading] = useState(false);
  const [recipient, setRecipient] = useState<RecipientLookup | null>(null);
  const [lookupError, setLookupError] = useState("");

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      navigate("/auth");
      return;
    }
    setUserId(user.id);
    await loadData(user.id);
  };

  const loadData = async (uid: string) => {
    try {
      const [benRes, accRes] = await Promise.all([
        supabase
          .from("beneficiaries")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("accounts")
          .select("account_number")
          .eq("user_id", uid),
      ]);

      if (accRes.data) {
        setUserAccountNumbers(accRes.data.map((a) => a.account_number));
      }

      if (benRes.data) {
        // Enrich with holder names
        const enriched = await Promise.all(
          benRes.data.map(async (b) => {
            if (!b.account_id) return { ...b, holder_name: "Unknown" };
            const { data: acc } = await supabase
              .from("accounts")
              .select("user_id")
              .eq("id", b.account_id)
              .single();
            if (!acc?.user_id) return { ...b, holder_name: "System Account" };
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", acc.user_id)
              .single();
            return { ...b, holder_name: profile?.full_name || "Unknown" };
          })
        );
        setBeneficiaries(enriched);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Debounced account lookup
  useEffect(() => {
    if (accountNumber.length < 5) {
      setRecipient(null);
      setLookupError("");
      return;
    }
    const timer = setTimeout(() => lookupAccount(accountNumber), 500);
    return () => clearTimeout(timer);
  }, [accountNumber]);

  const lookupAccount = async (accNum: string) => {
    setLookupLoading(true);
    setLookupError("");
    setRecipient(null);
    try {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, account_number, status")
        .eq("account_number", accNum)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setLookupError("Invalid account number");
        return;
      }

      // Check if it's user's own account
      if (userAccountNumbers.includes(accNum)) {
        setLookupError("Cannot add your own account as a beneficiary");
        return;
      }

      const { data: accFull } = await supabase
        .from("accounts")
        .select("user_id")
        .eq("id", data.id)
        .single();

      let holderName = "System Account";
      if (accFull?.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", accFull.user_id)
          .single();
        holderName = profile?.full_name || "Unknown";
      }

      setRecipient({ ...data, holder_name: holderName });
    } catch {
      setLookupError("Error looking up account");
    } finally {
      setLookupLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingId(null);
    setNickname("");
    setAccountNumber("");
    setRecipient(null);
    setLookupError("");
    setDialogOpen(true);
  };

  const openEditDialog = (b: Beneficiary) => {
    setEditingId(b.id);
    setNickname(b.nickname);
    setAccountNumber(b.account_number);
    setRecipient(null);
    setLookupError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!userId || !nickname.trim()) {
      toast({ title: "Nickname is required", variant: "destructive" });
      return;
    }

    if (editingId) {
      // Update nickname only
      setSaving(true);
      const { error } = await supabase
        .from("beneficiaries")
        .update({ nickname: nickname.trim() })
        .eq("id", editingId);
      setSaving(false);

      if (error) {
        toast({ title: "Error updating", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Beneficiary updated" });
    } else {
      // Insert new
      if (!recipient) {
        toast({ title: "Please enter a valid account number", variant: "destructive" });
        return;
      }

      setSaving(true);
      const { error } = await supabase.from("beneficiaries").insert({
        user_id: userId,
        nickname: nickname.trim(),
        account_number: recipient.account_number,
        account_id: recipient.id,
        bank_name: bankName,
      });
      setSaving(false);

      if (error) {
        const msg = error.message.includes("unique")
          ? "This account is already in your beneficiaries"
          : error.message;
        toast({ title: "Error adding beneficiary", description: msg, variant: "destructive" });
        return;
      }
      toast({ title: "Beneficiary added" });
    }

    setDialogOpen(false);
    await loadData(userId);
  };

  const handleDelete = async () => {
    if (!deleteId || !userId) return;
    const { error } = await supabase
      .from("beneficiaries")
      .delete()
      .eq("id", deleteId);
    if (error) {
      toast({ title: "Error deleting", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Beneficiary deleted" });
      await loadData(userId);
    }
    setDeleteId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <Card className="bg-white rounded-xl shadow-sm border-0 p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={idx} className="h-10 w-full" />
            ))}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] p-6">
      <header className="bg-white rounded-xl shadow-sm border-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-[#0A1628] border-l-4 border-[#C9A84C] pl-3">Beneficiaries</h1>
                <p className="text-sm text-muted-foreground">Manage saved recipients</p>
              </div>
            </div>
            <Button className="bg-[var(--bank-gold)] text-[#0A1628] hover:bg-[#b9963d]" onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Beneficiary
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="bg-white rounded-xl shadow-sm border-0">
          <CardHeader>
            <CardTitle>Saved Beneficiaries</CardTitle>
          </CardHeader>
          <CardContent>
            {beneficiaries.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-[var(--bank-slate)]" />
                <p className="text-lg font-semibold text-[#0A1628]">No beneficiaries added yet</p>
                <p className="text-muted-foreground">Add a beneficiary to speed up future transfers.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#0A1628] hover:bg-[#0A1628]">
                    <TableHead className="text-white">Nickname</TableHead>
                    <TableHead className="text-white">Account Holder</TableHead>
                    <TableHead className="text-white">Account Number</TableHead>
                    <TableHead className="text-white">Bank</TableHead>
                    <TableHead className="text-white">Created</TableHead>
                    <TableHead className="text-right text-white">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {beneficiaries.map((b) => (
                    <TableRow key={b.id} className="border-b border-[#E6EAF0] hover:bg-[#F0F4FA]">
                      <TableCell className="font-medium">{b.nickname}</TableCell>
                      <TableCell>{b.holder_name}</TableCell>
                      <TableCell className="font-mono">{b.account_number}</TableCell>
                      <TableCell>{b.bank_name}</TableCell>
                      <TableCell>{new Date(b.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(b)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(b.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white rounded-xl shadow-sm border-0">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Beneficiary" : "Add Beneficiary"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nickname</Label>
              <Input
                placeholder="e.g. John's Savings"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={50}
              />
            </div>

            {!editingId && (
              <div className="space-y-2">
                <Label>Account Number</Label>
                <div className="relative">
                  <Input
                    placeholder="Enter account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                    maxLength={20}
                  />
                  {lookupLoading && (
                    <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                  {!lookupLoading && recipient && (
                    <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-600" />
                  )}
                </div>
                {lookupError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {lookupError}
                  </div>
                )}
                {recipient && (
                  <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-1">
                    <p className="font-medium">{recipient.holder_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Account: {recipient.account_number}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      Status:{" "}
                      <span
                        className={
                          recipient.status === "active"
                            ? "text-green-600"
                            : "text-destructive"
                        }
                      >
                        {recipient.status}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || (!editingId && !recipient) || !nickname.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingId ? (
                "Update"
              ) : (
                "Add Beneficiary"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-white rounded-xl shadow-sm border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Beneficiary</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this beneficiary? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Beneficiaries;
