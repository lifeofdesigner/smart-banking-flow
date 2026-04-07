import { Users, CreditCard, Send, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminSummaryStatsProps {
  usersCount: number;
  accountsCount: number;
  wireTransfersCount: number;
  transactionsCount: number;
}

export default function AdminSummaryStats({
  usersCount,
  accountsCount,
  wireTransfersCount,
  transactionsCount,
}: AdminSummaryStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <Users className="h-4 w-4 text-muted-foreground mr-2" />
            <span className="text-2xl font-bold">{usersCount}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <CreditCard className="h-4 w-4 text-muted-foreground mr-2" />
            <span className="text-2xl font-bold">{accountsCount}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Wire Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <Send className="h-4 w-4 text-muted-foreground mr-2" />
            <span className="text-2xl font-bold">{wireTransfersCount}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 text-muted-foreground mr-2" />
            <span className="text-2xl font-bold">{transactionsCount}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
