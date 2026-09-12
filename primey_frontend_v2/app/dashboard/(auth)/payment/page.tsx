import { generateMeta } from "@/lib/utils";

import { BalanceOverview } from "./components/balance-overview";
import { TransactionHistory } from "./components/transaction-history";
import { ExchangeRates } from "./components/exchange-rates";

export async function generateMetadata() {
  return generateMeta({
    title: "Payment Admin Dashboard",
    description:
      "Track balances, transaction history, and exchange rates. A professional payment admin page built with React, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/payment"
  });
}

export default function Page() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Balances</h1>
        <div className="text-muted-foreground text-sm">
          Total funds in all balances: 1.740,30 USD
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
        <div className="space-y-4 lg:space-y-6 lg:col-span-2">
          <BalanceOverview />
          <TransactionHistory />
        </div>
        <div className="space-y-4 lg:space-y-6">
          <ExchangeRates />
        </div>
      </div>
    </div>
  );
}
