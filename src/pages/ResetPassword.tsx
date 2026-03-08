import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Shield, CheckCircle, XCircle } from "lucide-react";
import { z } from "zod";

const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasValidToken, setHasValidToken] = useState(false);
  const [checking, setChecking] = useState(true);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event which fires when the user clicks the reset link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setHasValidToken(true);
        setChecking(false);
      }
    });

    // Also check if there's already a session (user may have already been authenticated via the recovery link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Check URL hash for recovery type
      const hash = window.location.hash;
      if (hash && hash.includes("type=recovery")) {
        setHasValidToken(true);
      } else if (session) {
        // If there's an active session, allow password reset (user came from recovery link)
        setHasValidToken(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const validated = resetSchema.parse(formData);

      const { error } = await supabase.auth.updateUser({
        password: validated.password,
      });

      if (error) throw error;

      // Sign out after password reset so user logs in fresh
      await supabase.auth.signOut();
      setSuccess(true);

      toast({
        title: "Password reset successful!",
        description: "You can now log in with your new password.",
      });

      setTimeout(() => navigate("/auth"), 3000);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        toast({
          title: "Reset failed",
          description: error.message || "An error occurred while resetting your password.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <Card className="w-full max-w-md p-8 shadow-2xl text-center">
          <div className="animate-pulse text-muted-foreground">Verifying reset token...</div>
        </Card>
      </div>
    );
  }

  if (!hasValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <Card className="w-full max-w-md p-8 shadow-2xl text-center space-y-4">
          <XCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Invalid or Expired Link</h2>
          <p className="text-muted-foreground text-sm">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Button onClick={() => navigate("/auth")} className="w-full">
            Back to Login
          </Button>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <Card className="w-full max-w-md p-8 shadow-2xl text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
          <h2 className="text-xl font-bold">Password Reset Successful</h2>
          <p className="text-muted-foreground text-sm">
            Redirecting you to the login page...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Set New Password</h1>
          <p className="text-muted-foreground text-sm">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">New Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="h-12 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm Password</label>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              className="h-12"
            />
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
          </div>

          <Button type="submit" className="w-full h-12" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-border text-center">
          <a href="/auth" className="text-sm text-primary hover:underline">
            ← Back to Login
          </a>
        </div>
      </Card>
    </div>
  );
};

export default ResetPassword;
