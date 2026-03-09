import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import WireTransfer from "./pages/WireTransfer";
import TransferFunds from "./pages/TransferFunds";
import Beneficiaries from "./pages/Beneficiaries";
import UserProfile from "./pages/UserProfile";
import AdminDashboard from "./pages/AdminDashboard";
import ResetPassword from "./pages/ResetPassword";
import KYCVerification from "./pages/KYCVerification";
import Loans from "./pages/Loans";
import AccountsPage from "./pages/AccountsPage";
import TransactionHistory from "./pages/TransactionHistory";
import SavingsGoals from "./pages/SavingsGoals";
import Analytics from "./pages/Analytics";
import Statements from "./pages/Statements";
import SecuritySettings from "./pages/SecuritySettings";
import HelpCenter from "./pages/HelpCenter";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
