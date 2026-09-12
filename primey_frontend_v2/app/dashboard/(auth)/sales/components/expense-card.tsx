import { ArrowDownIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ExpenseCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Total Expense</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="font-display text-2xl lg:text-3xl">$15,010</div>
        <div className="flex items-center text-xs">
          <ArrowDownIcon className="mr-1 size-3 text-red-500" />
          <span className="font-medium text-red-500">6.0%</span>
          <span className="text-muted-foreground ml-1">Compare from last month</span>
        </div>
      </CardContent>
    </Card>
  );
}
