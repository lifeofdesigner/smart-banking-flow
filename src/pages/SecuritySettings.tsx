import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, Lock, Smartphone, Monitor, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SecuritySettings() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    if (newPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Password updated successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setLoading(false);
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  const strengthColors = ["bg-[#EF4444]", "bg-[#EF4444]", "bg-[#F59E0B]", "bg-[#10B981]", "bg-[var(--bank-navy)]"];

  return (
    <DashboardLayout>
      <div className="mx-auto min-h-screen max-w-4xl bg-[#F4F5F7] px-4 py-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#0A1628] border-l-4 border-[#C9A84C] pl-3">Security Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account security and authentication</p>
        </div>

        {/* Change Password */}
        <Card className="mb-6 bg-white rounded-xl shadow-sm border-0">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current">Current Password</Label>
                <Input
                  id="current"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new">New Password</Label>
                <Input
                  id="new"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                {newPassword && (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded ${i < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-muted"}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Password strength: {strengthLabels[passwordStrength - 1] || "Very Weak"}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm New Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              <Button type="submit" className="bg-[var(--bank-navy)] hover:bg-[var(--bank-slate)]" disabled={loading || !newPassword || newPassword !== confirmPassword}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>

            <Separator className="my-6" />

            <div className="space-y-3 text-sm">
              <p className="font-medium">Password Requirements:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${newPassword.length >= 8 ? "text-green-600" : "text-muted-foreground"}`} />
                  At least 8 characters
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? "text-green-600" : "text-muted-foreground"}`} />
                  Upper and lowercase letters
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${/[0-9]/.test(newPassword) ? "text-green-600" : "text-muted-foreground"}`} />
                  At least one number
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${/[^a-zA-Z0-9]/.test(newPassword) ? "text-green-600" : "text-muted-foreground"}`} />
                  At least one special character
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <Card className="mb-6 bg-white rounded-xl shadow-sm border-0 border-l-4 border-l-amber-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500/10">
                <Smartphone className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="border-amber-200 bg-amber-50/70">
              <Info className="h-4 w-4" />
              <AlertTitle>Coming Soon</AlertTitle>
              <AlertDescription>
                Two-factor authentication will be available soon. This feature will allow you to add an extra layer of security using your mobile device.
              </AlertDescription>
            </Alert>

            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Enable 2FA</p>
                    <p className="text-sm text-muted-foreground">Require verification code on login</p>
                  </div>
                </div>
                <Switch disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card className="mb-6 bg-white rounded-xl shadow-sm border-0">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-secondary">
                <Monitor className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>Manage your logged-in devices</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border border-[#E6EAF0] rounded-xl bg-[#F8FAFC]">
                <div className="flex items-center gap-4">
                  <span className="h-10 w-10 rounded-full bg-[var(--bank-navy)]/10 text-[var(--bank-navy)] flex items-center justify-center">
                    <Monitor className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium text-[#0A1628]">Current Session</p>
                    <p className="text-sm text-muted-foreground">This device • Lagos, Nigeria • Last active: Just now</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-500/10 text-green-600">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Tips */}
        <Card className="bg-white rounded-xl shadow-sm border-0 border-l-4 border-l-[var(--bank-navy)]">
          <CardHeader>
            <CardTitle className="text-[var(--bank-navy)] flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Security Best Practices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Never share your password or OTP with anyone, including bank staff</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Use a unique password that you don't use for other accounts</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Enable two-factor authentication when available</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Log out when using public or shared computers</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Regularly review your transaction history for unauthorized activity</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
