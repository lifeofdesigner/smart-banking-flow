import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, Circle, Globe } from "lucide-react";
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
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    // Get user's account
    const { data: accountData } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", session.user.id)
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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !accountId) throw new Error("Not authenticated");

      // Create wire transfer
      const { data: wireTransfer, error } = await supabase
        .from("wire_transfers")
        .insert({
          user_id: session.user.id,
          account_id: accountId,
          beneficiary_name: validated.beneficiaryName,
          beneficiary_account: validated.beneficiaryAccount,
          beneficiary_bank: validated.beneficiaryBank,
          beneficiary_country: validated.beneficiaryCountry,
          swift_code: validated.swiftCode,
          amount: validated.amount,
          purpose: validated.purpose || null,
          status: "awaiting_cot",
          current_stage: 1,
        })
        .select()
        .single();

      if (error) throw error;

      if (wireTransfer) {
        setWireTransferId(wireTransfer.id);
        
        // Generate security codes
        for (const stage of securityStages) {
          await supabase
            .from("wire_transfer_codes")
            .insert({
              wire_transfer_id: wireTransfer.id,
              code_type: stage.code,
              code_value: `${stage.code}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            });
        }

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
      
      // Get the code for this stage
      const { data: codeData, error: codeError } = await supabase
        .from("wire_transfer_codes")
        .select("*")
        .eq("wire_transfer_id", wireTransferId)
        .eq("code_type", currentStageCode.code)
        .single();

      if (codeError) throw codeError;

      // Verify the code
      if (codeData.code_value !== securityCodeInput.trim()) {
        toast({
          title: "Invalid code",
          description: "The security code you entered is incorrect. Please contact support to receive the correct code.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Update code as verified
      await supabase
        .from("wire_transfer_codes")
        .update({ 
          is_verified: true,
          verified_at: new Date().toISOString()
        })
        .eq("id", codeData.id);

      // Check if this is the last stage
      if (currentStep === securityStages.length) {
        // All codes verified - complete transfer
        await supabase
          .from("wire_transfers")
          .update({ 
            status: "completed",
            current_stage: currentStep
          })
          .eq("id", wireTransferId);

        toast({
          title: "Transfer completed!",
          description: "Your wire transfer has been successfully processed.",
        });

        setTimeout(() => navigate("/dashboard"), 2000);
      } else {
        // Move to next stage
        const nextStage = currentStep + 1;
        const statusMap: { [key: number]: string } = {
          2: "awaiting_imf",
          3: "awaiting_tax",
          4: "awaiting_levy",
          5: "awaiting_fin",
        };

        await supabase
          .from("wire_transfers")
          .update({ 
            status: statusMap[nextStage],
            current_stage: nextStage
          })
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
    <div className="min-h-screen bg-secondary/20">
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Wire Transfer</h1>
              <p className="text-sm text-muted-foreground">International Money Transfer</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Indicator */}
        {currentStep > 0 && (
          <Card className="p-6 mb-8">
            <h3 className="font-bold mb-4">Security Verification Progress</h3>
            <div className="space-y-3">
              {securityStages.map((stage, index) => (
                <div key={stage.code} className="flex items-center space-x-3">
                  {index < currentStep ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : index === currentStep ? (
                    <Circle className="w-6 h-6 text-primary flex-shrink-0 animate-pulse" />
                  ) : (
                    <Circle className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                  )}
                  <div>
                    <p className={`font-medium ${index === currentStep ? "text-primary" : ""}`}>
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
          <Card className="p-8">
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
              <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <p className="text-sm font-medium text-accent mb-2">Important</p>
                <p className="text-sm">
                  Please contact our support team to receive your {securityStages[currentStep - 1].code} code. 
                  For security reasons, codes are sent separately via email or SMS.
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
                  className="h-12 text-center text-lg font-mono"
                />
              </div>

              <Button 
                onClick={handleVerifyCode} 
                size="lg" 
                className="w-full h-12" 
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
