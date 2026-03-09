import { CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountCardProps {
  accountType: string;
  accountNumber: string;
  balance: number;
  currency: string;
  status: string;
  onClick?: () => void;
  className?: string;
}

const gradients = [
  "from-primary via-primary/90 to-primary/70",
  "from-[hsl(250,60%,35%)] via-[hsl(250,55%,45%)] to-[hsl(280,50%,50%)]",
  "from-[hsl(200,80%,30%)] via-[hsl(200,70%,40%)] to-[hsl(180,60%,45%)]",
];

export default function AccountCard({
  accountType,
  accountNumber,
  balance,
  currency,
  status,
  onClick,
  className,
}: AccountCardProps) {
  const masked = `•••• •••• •••• ${accountNumber.slice(-4)}`;
  const gradientIdx =
    accountType === "savings" ? 0 : accountType === "checking" ? 1 : 2;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full min-w-[280px] rounded-2xl p-6 text-left text-primary-foreground shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 bg-gradient-to-br",
        gradients[gradientIdx % gradients.length],
        className
      )}
    >
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider opacity-80">
            {accountType} Account
          </p>
          <p className="text-sm font-mono mt-1 opacity-70">{masked}</p>
        </div>
        <CreditCard className="h-7 w-7 opacity-60" />
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider opacity-70 mb-1">
          Available Balance
        </p>
        <p className="text-3xl font-bold tracking-tight">
          {currency}{" "}
          {balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
      </div>

      {status !== "active" && (
        <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase bg-primary-foreground/20 rounded-full px-2 py-0.5">
          {status}
        </span>
      )}
    </button>
  );
}
