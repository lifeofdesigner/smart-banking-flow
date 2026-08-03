import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Eye, EyeOff, Shield } from "lucide-react";
import { z } from "zod";
import { isEmailLike, signInWithIdentifier } from "@/lib/loginIdentifier";

const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or account number is required").max(254),
  password: z.string().min(1, "Password is required"),
});

const demoCredentials = {
  customer: { email: "customer@halverixbank.com", password: "DemoCustomer123!" },
  admin: { email: "admin@halverixbank.com", password: "DemoAdmin123!" },
} as const;

// Publicly known is fine here — it's the same demo account whose password
// is already hardcoded in this bundle. Seeded by
// supabase/migrations/20260803110000_seed_demo_customer_login_pin.sql.
const DEMO_CUSTOMER_PIN = "123456";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }

  return fallback;
};

const isNetworkError = (error: unknown) => {
  const message = getErrorMessage(error, "").toLowerCase();

  return error instanceof TypeError
    || message.includes("failed to fetch")
    || message.includes("networkerror")
    || message.includes("network request failed")
    || message.includes("err_name_not_resolved");
};

type PinGateResult = "proceed" | "pin_step" | "blocked";

/**
 * Single source of truth for "has this signed-in session cleared the
 * sign-in PIN requirement" — used by handleLogin's own submit AND by the
 * mount-time session check below, so a session created anywhere else (e.g.
 * the login panel embedded in the homepage hero) is routed the same way
 * the moment it lands here instead of needing its own copy of this logic.
 */
const resolvePinGate = async (): Promise<PinGateResult> => {
  const { data: pinStatusData, error: pinStatusError } = await supabase.rpc("my_login_pin_status");
  if (pinStatusError) throw pinStatusError;

  const pinStatus = pinStatusData as { pin_set: boolean; pin_verified: boolean };

  if (!pinStatus.pin_set) {
    await supabase.auth.signOut();
    return "blocked";
  }

  if (!pinStatus.pin_verified) {
    return "pin_step";
  }

  return "proceed";
};

const isAdminUser = async () => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return false;
  }

  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (rolesError) {
    throw rolesError;
  }

  return (roles || []).some((roleRow) => roleRow.role === "admin");
};

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const siteSettings = useSiteSettings();
  const supportEmail = siteSettings.support_email || "support@example.com";
  const isAdminLogin = location.pathname === "/admin-login";
  const defaultTab = new URLSearchParams(location.search).get("tab") === "signup" ? "signup" : "login";
  const showAdminDemoLogin = siteSettings.demo_admin_login_enabled !== "false";
  const showCustomerDemoLogin = siteSettings.demo_customer_login_enabled !== "false";
  const manualRedirectRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [registrationReady, setRegistrationReady] = useState(false);
  const [pinStep, setPinStep] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [verifyingPin, setVerifyingPin] = useState(false);

  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const [loginData, setLoginData] = useState({
    identifier: "",
    password: "",
  });

  useEffect(() => {
    if (isAdminLogin) {
      setRegistrationReady(true);
      return;
    }

    let isMounted = true;

    const loadRegistrationStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "signup_enabled")
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          setSignupEnabled(true);
          return;
        }

        setSignupEnabled(data?.value !== "false");
      } finally {
        if (isMounted) {
          setRegistrationReady(true);
        }
      }
    };

    void loadRegistrationStatus();

    return () => {
      isMounted = false;
    };
  }, [isAdminLogin]);

  useEffect(() => {
    let isMounted = true;

    // Routes any session that lands here — from this page's own login
    // form, the homepage hero's embedded login panel, or a stale tab — the
    // same way: straight through if admin or already PIN-verified, into
    // the PIN step if not, or signed back out if no PIN was ever assigned.
    const routeExistingSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || !isMounted) return;

      if (isAdminLogin) {
        navigate("/admin", { replace: true });
        return;
      }

      try {
        const gate = await resolvePinGate();
        if (!isMounted) return;

        if (gate === "blocked") {
          toast({
            title: "Sign-in PIN required",
            description: "Your account doesn't have a sign-in PIN yet. Please contact support to get one.",
            variant: "destructive",
          });
          return;
        }

        if (gate === "pin_step") {
          manualRedirectRef.current = true;
          setPinStep(true);
          return;
        }

        navigate("/dashboard", { replace: true });
      } catch {
        if (isMounted) navigate("/dashboard", { replace: true });
      }
    };

    void routeExistingSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && !manualRedirectRef.current) {
        void routeExistingSession();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isAdminLogin, navigate, toast]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdminLogin) return;

    setLoading(true);
    manualRedirectRef.current = true;

    try {
      const validated = signupSchema.parse(signupData);

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          data: {
            full_name: validated.fullName,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      if (data.user) {
        // A brand-new account has no sign-in PIN yet, so there's nothing to
        // verify — sign out immediately rather than let the auto-redirect
        // effect send them to a dashboard the login-PIN backstop will just
        // bounce them from.
        await supabase.auth.signOut();
        manualRedirectRef.current = false;

        toast({
          title: "Account created!",
          description: `Welcome to ${siteSettings["site_name"] || "Your Bank"}. An administrator will contact you with your sign-in PIN before you can log in.`,
        });
      }
    } catch (error: unknown) {
      manualRedirectRef.current = false;

      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else if (getErrorMessage(error, "").includes("already registered")) {
        toast({
          title: "Account exists",
          description: "This email is already registered. Please login instead.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signup failed",
          description: getErrorMessage(error, "An error occurred during signup"),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    manualRedirectRef.current = true;

    try {
      const validated = loginSchema.parse(loginData);

      const { error } = await signInWithIdentifier(validated.identifier, validated.password);

      if (error) throw error;

      if (isAdminLogin) {
        const hasAdminRole = await isAdminUser();

        if (!hasAdminRole) {
          await supabase.auth.signOut();
          throw new Error("Admin privileges are required for this portal.");
        }

        toast({
          title: "Login successful!",
          description: "Welcome back to the admin portal.",
        });

        navigate("/admin", { replace: true });
        return;
      }

      // Admins are exempt (checked above and already returned); every other
      // account needs its admin-assigned sign-in PIN verified for this
      // login before reaching the dashboard.
      const gate = await resolvePinGate();

      if (gate === "blocked") {
        throw new Error("Your account doesn't have a sign-in PIN yet. Please contact support to get one.");
      }

      if (gate === "pin_step") {
        setPinStep(true);
        return;
      }

      toast({
        title: "Login successful!",
        description: "Welcome back to your account.",
      });

      navigate("/dashboard", { replace: true });
    } catch (error: unknown) {
      manualRedirectRef.current = false;

      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else if (getErrorMessage(error, "").includes("Invalid")) {
        toast({
          title: "Invalid credentials",
          description: "Please check your email and password.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login failed",
          description: getErrorMessage(error, "An error occurred during login"),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async () => {
    setVerifyingPin(true);

    try {
      const { data, error } = await supabase.rpc("verify_login_pin", { p_pin: pinValue });

      if (error) throw error;

      const result = data as { ok: boolean; locked?: boolean; remaining?: number };

      if (!result.ok) {
        setPinValue("");
        toast({
          title: result.locked ? "Account locked" : "Incorrect PIN",
          description: result.locked
            ? "Too many incorrect attempts. Please contact support to reset your PIN."
            : `${result.remaining} attempt(s) remaining.`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Login successful!",
        description: "Welcome back to your account.",
      });

      navigate("/dashboard", { replace: true });
    } catch (error: unknown) {
      setPinValue("");
      toast({
        title: "Verification failed",
        description: getErrorMessage(error, "Could not verify your PIN."),
        variant: "destructive",
      });
    } finally {
      setVerifyingPin(false);
    }
  };

  const cancelPinStep = async () => {
    await supabase.auth.signOut();
    manualRedirectRef.current = false;
    setPinStep(false);
    setPinValue("");
  };

  const handleDemoLogin = async (variant: "customer" | "admin") => {
    setLoading(true);
    manualRedirectRef.current = true;

    const credentials = demoCredentials[variant];

    try {
      const { error } = await supabase.auth.signInWithPassword(credentials);

      if (error) throw error;

      if (variant === "admin") {
        const hasAdminRole = await isAdminUser();

        if (!hasAdminRole) {
          await supabase.auth.signOut();
          throw new Error("Demo admin account does not have admin privileges.");
        }
      } else {
        // Keep the one-click demo frictionless: satisfy the same
        // sign-in-PIN requirement a real customer would hit, using the
        // well-known demo PIN, instead of showing the interactive PIN step.
        const { data: pinResult, error: pinError } = await supabase.rpc("verify_login_pin", { p_pin: DEMO_CUSTOMER_PIN });
        if (pinError) throw pinError;
        if (!(pinResult as { ok: boolean }).ok) {
          throw new Error("Demo customer PIN is out of sync — run the seed migration again.");
        }
      }

      navigate(variant === "admin" ? "/admin" : "/dashboard", { replace: true });
    } catch (error: unknown) {
      manualRedirectRef.current = false;
      const description = isNetworkError(error)
        ? "Supabase is unreachable from this browser right now. Check your network/DNS, then try again."
        : `Run seed-demo.sql in Supabase, then use ${credentials.email} with the documented demo password.`;

      toast({
        title: variant === "admin" ? "Demo admin login unavailable" : "Demo customer login unavailable",
        description,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const showSignup = !isAdminLogin && registrationReady && signupEnabled;
  const showRegistrationClosed = !isAdminLogin && registrationReady && !signupEnabled;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md p-8 shadow-2xl">
        <div className="text-center mb-8">
          {siteSettings.site_logo_url ? (
            <img
              src={siteSettings.site_logo_url}
              alt={siteSettings.site_name || "Bank logo"}
              className="mx-auto mb-4 h-16 w-16 rounded-2xl object-contain"
            />
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
          )}
          <h1 className="text-3xl font-bold mb-2">
            {pinStep ? "Enter Your PIN" : isAdminLogin ? "Admin Portal" : "Internet Banking"}
          </h1>
          <p className="text-muted-foreground">
            {pinStep
              ? "Enter the 6-digit sign-in PIN issued to you."
              : isAdminLogin
                ? "Administrative access only"
                : "Secure access to your account"}
          </p>
        </div>

        {pinStep ? (
          <div className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={pinValue} onChange={setPinValue}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              type="button"
              className="w-full h-12"
              disabled={verifyingPin || pinValue.length !== 6}
              onClick={handleVerifyPin}
            >
              {verifyingPin ? "Verifying..." : "Verify & Sign In"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={cancelPinStep}
                className="text-sm text-muted-foreground hover:underline"
              >
                Not you? Sign out
              </button>
            </div>
          </div>
        ) : (
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className={`grid w-full mb-8 ${showSignup ? "grid-cols-2" : "grid-cols-1"}`}>
            <TabsTrigger value="login">Login</TabsTrigger>
            {showSignup ? <TabsTrigger value="signup">Sign Up</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">{isAdminLogin ? "Email" : "Email or Account Number"}</label>
                <Input
                  type={isAdminLogin ? "email" : "text"}
                  placeholder={isAdminLogin ? "admin@example.com" : "your@email.com or account number"}
                  value={loginData.identifier}
                  onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
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
              </div>

              <Button type="submit" className="w-full h-12" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>

              {!isAdminLogin ? (
                showCustomerDemoLogin ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
                    disabled={loading}
                    onClick={() => handleDemoLogin("customer")}
                  >
                    Try as Customer (Demo)
                  </Button>
                ) : null
              ) : showAdminDemoLogin ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
                  disabled={loading}
                  onClick={() => handleDemoLogin("admin")}
                >
                  Try as Admin (Demo)
                </Button>
              ) : null}

              <div className="text-center">
                <button
                  type="button"
                  onClick={async () => {
                    if (!loginData.identifier || !isEmailLike(loginData.identifier)) {
                      toast({
                        title: "Enter your email",
                        description: "Password reset requires your email address (account number won't work here) — enter it above, then click Forgot Password.",
                        variant: "destructive",
                      });
                      return;
                    }

                    setLoading(true);
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(loginData.identifier, {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });

                      if (error) throw error;

                      toast({
                        title: "Reset link sent!",
                        description: "Check your email for the password reset link.",
                      });
                    } catch (err: unknown) {
                      toast({
                        title: "Error",
                        description: getErrorMessage(err, "Could not send reset link."),
                        variant: "destructive",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              {showRegistrationClosed ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="font-medium">Account registration is currently closed.</p>
                  <p className="mt-1">Please contact support.</p>
                  <a
                    href={`mailto:${supportEmail}?subject=Account%20Registration%20Inquiry`}
                    className="mt-2 inline-flex text-sm font-medium text-[var(--bank-navy)] underline underline-offset-4"
                  >
                    Contact support
                  </a>
                </div>
              ) : null}
            </form>
          </TabsContent>

          {showSignup ? (
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={signupData.fullName}
                    onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
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
                </div>

                <Button type="submit" className="w-full h-12" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          ) : null}
        </Tabs>
        )}

        <div className="mt-8 pt-6 border-t border-border text-center">
          <a href="/" className="text-sm text-primary hover:underline">
            &larr; Back to Home
          </a>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
