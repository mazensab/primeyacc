import { generateMeta } from "@/lib/utils";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import CalendarDateRangePicker from "@/components/custom-date-range-picker";

import { BalanceCard } from "./components/balance-card";
import { TaxCard } from "./components/tax-card";
import { IncomeCard } from "./components/income-card";
import { ExpenseCard } from "./components/expense-card";
import { BestSellingProducts } from "./components/best-selling-products";
import { TableOrderStatus } from "./components/table-order-status";
import { RevenueChart } from "./components/revenue-chart";

export async function generateMetadata() {
  return generateMeta({
    title: "Sales Admin Dashboard",
    description:
      "Analyze sales metrics, track revenue, and monitor order status. A professional admin dashboard page built with React, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/sales"
  });
}

export default function Page() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Sales Dashboard</h1>
        <div className="flex items-center space-x-2">
          <div className="grow">
            <CalendarDateRangePicker />
          </div>
          <Button>
            <Download />
            <span className="hidden lg:inline">Download</span>
          </Button>
        </div>
      </div>
      <div className="gap-4 lg:gap-6 space-y-4 md:grid md:grid-cols-2 lg:space-y-0 xl:grid-cols-8">
        <div className="md:col-span-4">
          <RevenueChart />
        </div>
        <div className="md:col-span-4">
          <div className="grid h-full auto-rows-fr grid-cols-1 gap-4 lg:gap-6 md:grid-cols-2">
            <BalanceCard />
            <IncomeCard />
            <ExpenseCard />
            <TaxCard />
          </div>
        </div>
      </div>
      <div className="gap-4 lg:gap-6 space-y-4 lg:space-y-0 xl:grid xl:grid-cols-3">
        <div className="xl:col-span-1">
          <BestSellingProducts />
        </div>
        <div className="xl:col-span-2">
          <TableOrderStatus />
        </div>
      </div>
    </div>
  );
}
