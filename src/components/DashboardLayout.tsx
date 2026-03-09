import { useState, useEffect, ReactNode } from "react";
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
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import NotificationBell from "@/components/NotificationBell";
import NotificationToaster from "@/components/NotificationToaster";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  { title: "Beneficiaries", url: "/beneficiaries", icon: Users },
];

const financeNavItems = [
  { title: "Savings Goals", url: "/savings-goals", icon: PiggyBank },
  { title: "Loans", url: "/loans", icon: Landmark },
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) { navigate("/auth"); return; }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();
    if (profileData) setProfile(profileData);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    setIsAdmin(roles?.some((r) => r.role === "admin") || false);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

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
      <div className="min-h-screen flex w-full bg-secondary/20">
        <Sidebar collapsible="icon" className="hidden md:flex">
          <SidebarHeader className="border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-primary-foreground font-bold text-sm">M</span>
              </div>
              <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                <span className="font-semibold text-sm truncate">MicroFinance Bank</span>
                <span className="text-xs text-muted-foreground">Internet Banking</span>
              </div>
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

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 sticky top-0 z-10">
            <SidebarTrigger className="-ml-1 hidden md:flex" />
            <span className="font-semibold text-sm md:hidden">MicroFinance Bank</span>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => navigate("/profile")}>
                <User className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto pb-20 md:pb-0">
            {children}
          </main>
        </div>

        <MobileBottomNav />
        <NotificationToaster />
      </div>
    </SidebarProvider>
  );
}
