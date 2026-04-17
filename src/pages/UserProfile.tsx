import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Mail, Phone, MapPin, Shield } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

export default function UserProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    kyc_status: "pending"
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const getKycBadgeVariant = (status: string) => {
    switch (status) {
      case "verified":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const initials = (profile.full_name || profile.email || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-[#F4F5F7] p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            <Skeleton className="h-10 w-40 rounded-md" />
            <Card className="rounded-xl border-0 bg-white shadow-sm">
              <CardContent className="space-y-6 p-6">
                <div className="flex flex-col items-center gap-3">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-11 w-full sm:w-40" />
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-[#F4F5F7] px-4 py-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6 hidden border border-[#E6EAF0] bg-white hover:bg-[#F0F4FA] md:inline-flex"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="space-y-6">
          <div className="md:hidden rounded-[28px] bg-[#0A1628] px-5 py-6 text-center">
            <div className="mx-auto flex h-[60px] w-[60px] items-center justify-center rounded-full bg-[#C9A84C] text-xl font-bold text-[#0A1628]">
              {initials}
            </div>
            <p className="mt-4 text-xl font-semibold text-white">{profile.full_name || "Unnamed User"}</p>
            <p className="mt-1 text-sm text-white/60">{profile.email}</p>
          </div>

          <div className="hidden md:block">
            <h1 className="text-2xl font-semibold text-[#0A1628] border-l-4 border-[#C9A84C] pl-3">My Profile</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your personal information</p>
          </div>

          <Card className="bg-white rounded-xl shadow-sm border-0">
            <CardHeader className="hidden md:block">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-[var(--bank-navy)] text-[var(--bank-gold)] flex items-center justify-center text-2xl font-bold">
                    {initials}
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-[var(--bank-navy)]" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {profile.full_name || "Unnamed User"}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">{profile.email}</CardDescription>
                  </div>
                </div>
                <Badge variant={getKycBadgeVariant(profile.kyc_status)}>
                  KYC: {profile.kyc_status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h2 className="text-base font-semibold text-[var(--bank-navy)]">Personal Information</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">
                        <User className="inline mr-2 h-4 w-4" />
                        Full Name
                      </Label>
                      <Input
                        id="full_name"
                        value={profile.full_name}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        required
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">
                        <Mail className="inline mr-2 h-4 w-4" />
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        disabled
                        className="bg-[#F8FAFC]"
                      />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-base font-semibold text-[var(--bank-navy)]">Contact Details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        <Phone className="inline mr-2 h-4 w-4" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={profile.phone || ""}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">
                        <MapPin className="inline mr-2 h-4 w-4" />
                        Address
                      </Label>
                      <Input
                        id="address"
                        value={profile.address || ""}
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={saving} className="h-12 w-full bg-[var(--bank-navy)] hover:bg-[var(--bank-slate)] md:h-10 md:w-auto">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-xl shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center text-[var(--bank-navy)]">
                <Shield className="mr-2 h-5 w-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  To change your password or email, please contact support.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}
