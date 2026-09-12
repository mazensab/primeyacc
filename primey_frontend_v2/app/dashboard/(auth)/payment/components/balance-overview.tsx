import { ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { NotificationBanner } from "./notification-banner";

const balances = [
  { currency: "USD", amount: "1,240.30", flag: "🇺🇸" },
  { currency: "EUR", amount: "500.00", flag: "🇪🇺" },
  { currency: "GBP", amount: "0.00", flag: "🇬🇧" }
];

export function BalanceOverview() {
  return (
    <div className="space-y-4">
      <NotificationBanner />

      <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-3">
        {balances.map((balance) => (
          <Card
            key={balance.currency}
            className={`cursor-pointer transition-shadow hover:shadow-md`}>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{balance.flag}</span>
                  <div>
                    <div className="text-foreground text-2xl font-bold">
                      {balance.amount} {balance.currency}
                    </div>
                  </div>
                </div>
                <ChevronRight className="text-muted-foreground h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
