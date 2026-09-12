import { ArrowUpIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BalanceCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Total Balance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="font-display text-2xl lg:text-3xl">$103,045</div>
        <div className="flex items-center text-xs">
          <ArrowUpIcon className="mr-1 size-3 text-green-500" />
          <span className="font-medium text-green-500">3.6%</span>
          <span className="text-muted-foreground ml-1">Compare from last month</span>
        </div>
      </CardContent>
    </Card>
  );
}
