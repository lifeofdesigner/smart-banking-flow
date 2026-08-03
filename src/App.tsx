import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import DynamicSEO from "@/components/DynamicSEO";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const WireTransfer = lazy(() => import("./pages/WireTransfer"));
const TransferFunds = lazy(() => import("./pages/TransferFunds"));
const Beneficiaries = lazy(() => import("./pages/Beneficiaries"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminCreateUser = lazy(() => import("./pages/AdminCreateUser"));
const AdminUsersManagement = lazy(() => import("./pages/AdminUsersManagement"));
const LiveChatSupport = lazy(() => import("./pages/LiveChatSupport"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const KYCVerification = lazy(() => import("./pages/KYCVerification"));
const Loans = lazy(() => import("./pages/Loans"));
const AccountsPage = lazy(() => import("./pages/AccountsPage"));
const TransactionHistory = lazy(() => import("./pages/TransactionHistory"));
const SavingsGoals = lazy(() => import("./pages/SavingsGoals"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Statements = lazy(() => import("./pages/Statements"));
const SecuritySettings = lazy(() => import("./pages/SecuritySettings"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const ReferralProgram = lazy(() => import("./pages/ReferralProgram"));
const SpendingInsights = lazy(() => import("./pages/SpendingInsights"));
const Budgets = lazy(() => import("./pages/Budgets"));
const BillPayments = lazy(() => import("./pages/BillPayments"));
const CardsPage = lazy(() => import("./pages/Cards"));
const InvestmentsPage = lazy(() => import("./pages/Investments"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const ATMWithdrawal = lazy(() => import("./pages/ATMWithdrawal"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();
const AUTH_STORAGE_KEY = "fintech-app-auth";

const decodeJwtPayload = (token: string) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = atob(normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "="));

    return JSON.parse(decodedPayload) as { iss?: string };
  } catch {
    return null;
  }
};

const clearStaleSupabaseSession = () => {
  if (typeof window === "undefined") return;

  const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawSession) return;

  try {
    const session = JSON.parse(rawSession) as { access_token?: string };
    const issuer = session.access_token ? decodeJwtPayload(session.access_token)?.iss : null;
    const expectedIssuer = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1`;

    if (!issuer || issuer !== expectedIssuer) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

clearStaleSupabaseSession();

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );
}

const App = () => {
  useEffect(() => {
    clearStaleSupabaseSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DynamicSEO />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAInstallPrompt />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin-login" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/transactions" element={<TransactionHistory />} />
              <Route path="/savings-goals" element={<SavingsGoals />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/statements" element={<Statements />} />
              <Route path="/security" element={<SecuritySettings />} />
              <Route path="/help" element={<HelpCenter />} />
              <Route path="/wire-transfer" element={<WireTransfer />} />
              <Route path="/transfer" element={<TransferFunds />} />
              <Route path="/beneficiaries" element={<Beneficiaries />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin-users" element={<AdminCreateUser />} />
              <Route path="/admin/users" element={<AdminUsersManagement />} />
              <Route path="/live-chat-support" element={<LiveChatSupport />} />
              <Route path="/kyc" element={<KYCVerification />} />
              <Route path="/loans" element={<Loans />} />
              <Route path="/referral" element={<ReferralProgram />} />
              <Route path="/spending-insights" element={<SpendingInsights />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/bills" element={<BillPayments />} />
              <Route path="/cards" element={<CardsPage />} />
              <Route path="/investments" element={<InvestmentsPage />} />
              <Route path="/products/:slug" element={<ProductPage />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/atm-withdrawal" element={<ATMWithdrawal />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
