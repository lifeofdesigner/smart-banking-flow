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
  { label: "Savings", icon: PiggyBank, path: "/savings-goals" },
  { label: "Investments", icon: LineChart, path: "/investments" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
  { label: "Statements", icon: FileText, path: "/statements" },
  { label: "Referral", icon: Gift, path: "/referral" },
  { label: "Help", icon: HelpCircle, path: "/help" },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 w-full border-t border-[#F0F0F0] bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
    >
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
                      "relative flex h-full w-full flex-col items-center justify-center gap-1 transition-colors",
                      active ? "text-[#0A1628]" : "text-[#B0B8C4]",
                    )}
                    aria-label={label}
                  >
                    <span
                      className={cn(
                        "absolute left-3 right-3 top-0 h-[3px] rounded-b-full",
                        active ? "bg-[#C9A84C]" : "bg-transparent",
                      )}
                    />
                    <Icon className="h-5 w-5" />
                    <span className={cn("text-[10px] font-medium", active ? "opacity-100" : "opacity-0")}>
                      {label}
                    </span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-[28px] border-0 bg-white p-0 shadow-2xl">
                  <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-[#D7DDE6]" />
                  <SheetHeader className="px-5 py-4">
                    <SheetTitle className="text-base font-semibold text-[#0A1628]">More</SheetTitle>
                  </SheetHeader>

                  <div className="grid grid-cols-2 gap-3 px-4 pb-8">
                    {moreItems.map(({ label: moreLabel, icon: MoreIcon, path: morePath }) => (
                      <SheetTrigger asChild key={morePath}>
                        <button
                          onClick={() => navigate(morePath)}
                          className="flex min-h-[104px] flex-col items-center justify-center gap-3 rounded-2xl border border-[#EEF2F6] bg-[#FBFCFD] px-4 text-center text-[#0A1628] transition-transform active:scale-[0.98]"
                        >
                          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F6FA] text-[#0A1628] shadow-sm">
                            <MoreIcon className="h-5 w-5" />
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
                "relative flex h-full w-full flex-col items-center justify-center gap-1 transition-colors",
                active ? "text-[#0A1628]" : "text-[#B0B8C4]",
              )}
              aria-label={label}
            >
              <span
                className={cn(
                  "absolute left-3 right-3 top-0 h-[3px] rounded-b-full",
                  active ? "bg-[#C9A84C]" : "bg-transparent",
                )}
              />
              <Icon className="h-5 w-5" />
              <span className={cn("text-[10px] font-medium", active ? "opacity-100" : "opacity-0")}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
