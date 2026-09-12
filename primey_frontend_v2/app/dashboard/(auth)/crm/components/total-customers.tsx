import { Users2Icon } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TotalCustomersCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Total Customers</CardTitle>
        <CardAction>
          <div className="bg-card flex size-8 items-center justify-center rounded-full border">
            <Users2Icon className="size-4" />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <h4 className="font-display text-2xl lg:text-3xl">1890</h4>
        <div className="text-muted-foreground text-sm">
          <span className="text-green-600">+10.4%</span> from last month
        </div>
      </CardContent>
    </Card>
  );
}
