import { useState, useEffect, useRef, ReactNode, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  SidebarProvider,
  SidebarTrigger,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import NotificationBell from "@/components/NotificationBell";
import NotificationToaster from "@/components/NotificationToaster";
import MobileBottomNav from "@/components/MobileBottomNav";
import LiveChatWidget from "@/components/LiveChatWidget";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { canAccessLiveChatSupport, chatSupabase, isPrivilegedRole } from "@/lib/live-chat";
import {
  LayoutDashboard,
  CreditCard,
  ArrowRightLeft,
  Globe,
  Users,
  PiggyBank,
  Landmark,
  BarChart3,
  FileText,
  User,
  Shield,
  HelpCircle,
  LogOut,
  Settings,
  ListFilter,
  CheckSquare,
  TrendingUp,
  Wallet,
  Gift,
  Receipt,
  CreditCard as CardIcon,
  LineChart,
  MessageSquareText,
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

interface Profile {
  full_name: string;
  email: string;
}

const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Accounts", url: "/accounts", icon: CreditCard },
  { title: "Transactions", url: "/transactions", icon: ListFilter },
];

const transferNavItems = [
  { title: "Transfer Funds", url: "/transfer", icon: ArrowRightLeft },
  { title: "Wire Transfer", url: "/wire-transfer", icon: Globe },
  { title: "ATM Withdrawal", url: "/atm-withdrawal", icon: Wallet },
  { title: "Beneficiaries", url: "/beneficiaries", icon: Users },
];

const financeNavItems = [
  { title: "Savings Goals", url: "/savings-goals", icon: PiggyBank },
  { title: "Loans", url: "/loans", icon: Landmark },
  { title: "Pay Bills", url: "/bills", icon: Receipt },
  { title: "Cards", url: "/cards", icon: CardIcon },
  { title: "Investments", url: "/investments", icon: LineChart },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Spending Insights", url: "/spending-insights", icon: TrendingUp },
  { title: "Budgets", url: "/budgets", icon: Wallet },
  { title: "Statements", url: "/statements", icon: FileText },
  { title: "Referral Program", url: "/referral", icon: Gift },
];

const accountNavItems = [
  { title: "Profile", url: "/profile", icon: User },
  { title: "Security", url: "/security", icon: Shield },
  { title: "Help Center", url: "/help", icon: HelpCircle },
  { title: "KYC Verification", url: "/kyc", icon: CheckSquare },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const siteSettings = useSiteSettings();
  const siteName = siteSettings["site_name"] || "Your Bank";
  const logoUrl = siteSettings["site_logo_url"];
  const showBrandNameBesideLogo = siteSettings.show_brand_name_beside_logo !== "false";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [liveChatNotificationCount, setLiveChatNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const syncedUserIdRef = useRef<string | null>(null);
  const canViewLiveChatSupport = canAccessLiveChatSupport(userRoles);
  const authRedirectPath = ["/admin", "/admin-users", "/live-chat-support"].some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
  )
    ? "/admin-login"
    : "/auth";
  const pageTitle = useMemo(() => {
    const pageMap: Record<string, string> = {
      "/dashboard": "Home",
      "/accounts": "Accounts",
      "/transactions": "Transactions",
      "/transfer": "Transfer",
      "/wire-transfer": "Wire Transfer",
      "/atm-withdrawal": "ATM Withdrawal",
      "/beneficiaries": "Beneficiaries",
      "/savings-goals": "Savings Goals",
      "/loans": "Loans",
      "/bills": "Pay Bills",
      "/cards": "Cards",
      "/investments": "Investments",
      "/analytics": "Analytics",
      "/spending-insights": "Insights",
      "/budgets": "Budgets",
      "/statements": "Statements",
      "/referral": "Referral Program",
      "/profile": "My Profile",
      "/security": "Security Settings",
      "/help": "Help Center",
      "/kyc": "KYC Verification",
      "/admin": "Admin Dashboard",
      "/admin/users": "User Management",
      "/admin-users": "User Management",
      "/live-chat-support": "Live Chat",
    };

    const matchedPath = Object.keys(pageMap)
      .sort((a, b) => b.length - a.length)
      .find((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));

    return matchedPath ? pageMap[matchedPath] : "Dashboard";
  }, [location.pathname]);

  useEffect(() => {
    let isMounted = true;

    const resetAuthState = () => {
      if (!isMounted) return;

      syncedUserIdRef.current = null;
      setProfile(null);
      setCurrentUserId(null);
      setUserRoles([]);
      setIsAdmin(false);
      setLiveChatNotificationCount(0);
      setLoading(false);
    };

    const syncAuthState = async (showLoading = false) => {
      if (!isMounted) return;

      if (showLoading) {
        setLoading(true);
      }

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (error || !user) {
        resetAuthState();
        navigate(authRedirectPath);
        return;
      }

      const [{ data: profileData }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("id", user.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      if (!isMounted) return;

      syncedUserIdRef.current = user.id;
      const resolvedRoles = (roles ?? []).map((roleRow) => roleRow.role);
      setProfile(profileData ?? null);
      setCurrentUserId(user.id);
      setUserRoles(resolvedRoles);
      setIsAdmin(resolvedRoles.some((role) => isPrivilegedRole(role)));
      setLoading(false);
    };

    void syncAuthState(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT" || !session?.user) {
        resetAuthState();
        navigate(authRedirectPath);
        return;
      }

      const userChanged = session.user.id !== syncedUserIdRef.current;

      if ((event === "SIGNED_IN" && userChanged) || event === "USER_UPDATED") {
        void syncAuthState();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [authRedirectPath, navigate]);

  useEffect(() => {
    if (!currentUserId || !canViewLiveChatSupport) {
      setLiveChatNotificationCount(0);
      return;
    }

    let isMounted = true;

    const loadLiveChatNotificationCount = async () => {
      const { count, error } = await chatSupabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_type", "customer")
        .eq("is_read", false);

      if (!error && isMounted) {
        setLiveChatNotificationCount(count ?? 0);
      }
    };

    void loadLiveChatNotificationCount();

    const waitingChannel = chatSupabase
      .channel(`dashboard-live-chat-count-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_conversations",
        },
        () => {
          void loadLiveChatNotificationCount();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
        },
        () => {
          void loadLiveChatNotificationCount();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      void chatSupabase.removeChannel(waitingChannel);
    };
  }, [canViewLiveChatSupport, currentUserId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const profileMenuItems = [
    { label: "My Profile", icon: User, path: "/profile" },
    { label: "Security Settings", icon: Shield, path: "/security" },
    { label: "Help Center", icon: HelpCircle, path: "/help" },
    { label: "KYC Verification", icon: CheckSquare, path: "/kyc" },
    { label: "Referral Program", icon: Gift, path: "/referral" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const renderNavGroup = (label: string, items: typeof mainNavItems) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                <NavLink to={item.url} className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden bg-secondary/20">
        <Sidebar collapsible="icon" className="hidden md:flex">
          <SidebarHeader className="border-b border-border p-4">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={siteName}
                  style={{ height: "32px", width: "auto", objectFit: "contain" }}
                  className="flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground font-bold text-sm">M</span>
                </div>
              )}
              {showBrandNameBesideLogo ? (
                <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                  <span className="font-semibold text-sm truncate">{siteName}</span>
                  <span className="text-xs text-muted-foreground">Internet Banking</span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2 py-4">
            {renderNavGroup("Overview", mainNavItems)}
            {renderNavGroup("Transfers", transferNavItems)}
            {renderNavGroup("Finance", financeNavItems)}
            {renderNavGroup("Account", accountNavItems)}

            {isAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel>Administration</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.pathname === "/admin"}>
                        <NavLink to="/admin" className="flex items-center gap-3">
                          <Settings className="h-4 w-4" />
                          <span>Admin Dashboard</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.pathname === "/admin/users"}>
                        <NavLink to="/admin/users" className="flex items-center gap-3">
                          <Users className="h-4 w-4" />
                          <span>User Management</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {canViewLiveChatSupport ? (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={location.pathname === "/live-chat-support"}>
                          <NavLink to="/live-chat-support" className="flex items-center gap-3">
                            <MessageSquareText className="h-4 w-4" />
                            <span>Live Chat Support</span>
                          </NavLink>
                        </SidebarMenuButton>
                        {liveChatNotificationCount > 0 ? (
                          <SidebarMenuBadge className="rounded-full bg-red-500 px-1.5 text-white">
                            {liveChatNotificationCount}
                          </SidebarMenuBadge>
                        ) : null}
                      </SidebarMenuItem>
                    ) : null}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {profile?.full_name ? getInitials(profile.full_name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium truncate">{profile?.full_name}</span>
                <span className="text-xs text-muted-foreground truncate">{profile?.email}</span>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex min-w-0 flex-col overflow-x-hidden">
          <header className="sticky top-0 z-50">
            <div className="hidden h-14 items-center justify-between border-b border-border bg-background px-4 md:flex">
              <SidebarTrigger className="-ml-1" />
              <div className="flex items-center gap-2">
                <NotificationBell />
                <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
                  <User className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex h-[60px] items-center justify-between bg-[#0A1628] px-4 md:hidden">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={siteName}
                    style={{ height: "32px", width: "32px", objectFit: "contain" }}
                    className="h-8 w-8 rounded-full bg-white/5 p-1"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A84C] text-sm font-semibold text-[#0A1628]">
                    {(siteSettings.brand_initials || siteName.slice(0, 1)).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  {showBrandNameBesideLogo ? (
                    <p className="truncate text-[11px] font-medium uppercase tracking-[0.24em] text-white/45">
                      {siteName}
                    </p>
                  ) : null}
                  <p className="truncate text-[14px] font-medium text-white">{pageTitle}</p>
                </div>
              </div>

              <div className="ml-3 flex items-center gap-2">
                <NotificationBell variant="mobile" />
                <Sheet>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#C9A84C] text-[12px] font-semibold text-[#0A1628] shadow-sm"
                      aria-label="Open profile menu"
                    >
                      {profile?.full_name ? getInitials(profile.full_name) : "U"}
                    </button>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    className="rounded-t-[28px] border-0 bg-white px-0 pb-6 pt-3 shadow-2xl md:hidden"
                  >
                    <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#D8DEE8]" />
                    <SheetHeader className="px-5 pb-4 text-left">
                      <SheetTitle className="text-base font-semibold text-[#0A1628]">
                        {profile?.full_name || "User"}
                      </SheetTitle>
                      <p className="text-sm text-[#6B7280]">{profile?.email || "No email available"}</p>
                    </SheetHeader>

                    <div className="space-y-1 px-3">
                      {profileMenuItems.map((item) => (
                        <SheetTrigger asChild key={item.path}>
                          <button
                            type="button"
                            onClick={() => navigate(item.path)}
                            className="flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-4 text-left text-[#0A1628] transition-colors active:bg-[#F5F7FA]"
                          >
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F7FA] text-[#0A1628]">
                              <item.icon className="h-4 w-4" />
                            </span>
                            <span className="text-sm font-medium">{item.label}</span>
                          </button>
                        </SheetTrigger>
                      ))}
                    </div>

                    <div className="px-5 pt-5">
                      <SheetTrigger asChild>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-[#FFF4F4] px-4 text-sm font-semibold text-[#DC2626]"
                        >
                          Logout
                        </button>
                      </SheetTrigger>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#F4F5F7] pb-24 md:bg-transparent md:pb-0">
            {children}
          </main>
        </div>

        <MobileBottomNav />
        <NotificationToaster />
        {currentUserId && !isAdmin ? (
          <LiveChatWidget
            customerId={currentUserId}
            customerName={profile?.full_name}
            customerEmail={profile?.email}
          />
        ) : null}
      </div>
    </SidebarProvider>
  );
}
