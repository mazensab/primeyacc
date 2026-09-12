import { BriefcaseBusiness } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TotalDeals() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Total Deals</CardTitle>
        <CardAction>
          <div className="bg-card flex size-8 items-center justify-center rounded-full border">
            <BriefcaseBusiness className="size-4" />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <h4 className="font-display text-2xl lg:text-3xl">1,300</h4>
        <div className="text-muted-foreground text-sm">
          <span className="text-red-600">-0.8%</span> from last month
        </div>
      </CardContent>
    </Card>
  );
}
