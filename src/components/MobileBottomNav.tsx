import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  CreditCard,
  ArrowRightLeft,
  MoreHorizontal,
  Landmark,
  Receipt,
  LineChart,
  PiggyBank,
  BarChart3,
  FileText,
  Gift,
  HelpCircle,
  User,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { label: "Home", icon: Home, path: "/dashboard", match: ["/dashboard"] },
  { label: "Accounts", icon: CreditCard, path: "/accounts", match: ["/accounts"] },
  { label: "Transfer", icon: ArrowRightLeft, path: "/transfer" },
  { label: "Cards", icon: CreditCard, path: "/cards" },
  { label: "More", icon: MoreHorizontal, path: "more" },
];

const moreItems = [
  { label: "Loans", icon: Landmark, path: "/loans" },
  { label: "Bills", icon: Receipt, path: "/bills" },
  { label: "Investments", icon: LineChart, path: "/investments" },
  { label: "Savings", icon: PiggyBank, path: "/savings-goals" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
  { label: "Statements", icon: FileText, path: "/statements" },
  { label: "Referral", icon: Gift, path: "/referral" },
  { label: "Help", icon: HelpCircle, path: "/help" },
  { label: "Profile", icon: User, path: "/profile" },
  { label: "Security", icon: Shield, path: "/security" },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E5E7EB] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map(({ label, icon: Icon, path, match }) => {
          const active = path === "more"
            ? moreItems.some((item) => location.pathname === item.path)
            : (match ? match.includes(location.pathname) : location.pathname === path);

          if (path === "more") {
            return (
              <Sheet key={label}>
                <SheetTrigger asChild>
                  <button
                    className={cn(
                      "relative flex h-full w-full items-center justify-center transition-colors",
                      active ? "text-[#0A1628]" : "text-[#9CA3AF]"
                    )}
                    aria-label={label}
                  >
                    <span className={cn("absolute left-2 right-2 top-0 h-[3px] rounded-b-full", active ? "bg-[#C9A84C]" : "bg-transparent")} />
                    <Icon className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[78vh] rounded-t-2xl border-0 bg-white p-0 shadow-2xl">
                  <SheetHeader className="border-b border-[#E5E7EB] px-4 py-3">
                    <SheetTitle className="text-base font-semibold text-[#0A1628]">More</SheetTitle>
                  </SheetHeader>

                  <div className="max-h-[calc(78vh-64px)] overflow-y-auto px-4 py-2">
                    {moreItems.map(({ label: moreLabel, icon: MoreIcon, path: morePath }) => (
                      <SheetTrigger asChild key={morePath}>
                        <button
                          onClick={() => navigate(morePath)}
                          className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 text-left text-[#0A1628] active:bg-[#F4F5F7]"
                        >
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F5F7] text-[#0A1628]">
                            <MoreIcon className="h-4 w-4" />
                          </span>
                          <span className="text-sm font-medium">{moreLabel}</span>
                        </button>
                      </SheetTrigger>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            );
          }

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "relative flex h-full w-full items-center justify-center transition-colors",
                active ? "text-[#0A1628]" : "text-[#9CA3AF]"
              )}
              aria-label={label}
            >
              <span className={cn("absolute left-2 right-2 top-0 h-[3px] rounded-b-full", active ? "bg-[#C9A84C]" : "bg-transparent")} />
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
