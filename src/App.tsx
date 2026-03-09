import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const WireTransfer = lazy(() => import("./pages/WireTransfer"));
const TransferFunds = lazy(() => import("./pages/TransferFunds"));
const Beneficiaries = lazy(() => import("./pages/Beneficiaries"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
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
const ATMWithdrawal = lazy(() => import("./pages/ATMWithdrawal"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
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
            <Route path="/kyc" element={<KYCVerification />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/referral" element={<ReferralProgram />} />
            <Route path="/spending-insights" element={<SpendingInsights />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/bills" element={<BillPayments />} />
            <Route path="/cards" element={<CardsPage />} />
            <Route path="/investments" element={<InvestmentsPage />} />
            <Route path="/products/:slug" element={<ProductPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
