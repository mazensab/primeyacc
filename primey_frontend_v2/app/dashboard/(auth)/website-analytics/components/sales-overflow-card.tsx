import { TrendingUp } from "lucide-react";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SaleOverviewCard() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Sales Overview</CardTitle>
        <CardAction>
          <TrendingUp className="size-4 text-green-600" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <div className="font-display text-2xl lg:text-3xl">$42.5K</div>
        <div>
        <div className="grid grid-cols-2 gap-4 divide-x">
          <div className="flex items-center gap-3 text-sm">
            <Badge variant="secondary" className="border-border w-12 border">
              62.2%
            </Badge>
            <span>Orders</span>
          </div>
          <div className="flex items-center justify-end gap-3 text-sm">
            <Badge variant="secondary" className="border-border w-12 border">
              25.5%
            </Badge>
            <span>Visits</span>
          </div>
        </div>
          <div className="mt-4 flex overflow-hidden rounded-md">
            <span className="h-4 bg-orange-600" style={{ width: "70%" }}></span>
            <span className="h-4 bg-green-600" style={{ width: "30%" }}></span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
