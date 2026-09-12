import { WalletMinimal } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TotalRevenueCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Total Revenue</CardTitle>
        <CardAction>
          <div className="bg-card flex size-8 items-center justify-center rounded-full border">
            <WalletMinimal className="size-4" />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <h4 className="font-display text-2xl lg:text-3xl">$435,578</h4>
        <div className="text-muted-foreground text-sm">
          <span className="text-green-600">+20.1%</span> from last month
        </div>
      </CardContent>
    </Card>
  );
}
