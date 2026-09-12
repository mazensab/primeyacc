import { ArrowUpIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TaxCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Total Sales Tax</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="font-display text-2xl lg:text-3xl">$9,090</div>
        <div className="flex items-center text-xs">
          <ArrowUpIcon className="mr-1 size-3 text-green-500" />
          <span className="font-medium text-green-500">5.0%</span>
          <span className="text-muted-foreground ml-1">Compare from last month</span>
        </div>
      </CardContent>
    </Card>
  );
}
