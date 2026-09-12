import { generateMeta } from "@/lib/utils";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

import CalendarDateRangePicker from "@/components/custom-date-range-picker";

import CreditCards from "./components/my-wallet";
import Revenue from "./components/revenue";
import MonthlyExpenses from "./components/monthly-expenses";
import Summary from "./components/summary";
import Transactions from "./components/transactions";
import SavingGoal from "./components/saving-goal";
import KPICards from "./components/kpi-cards";

export async function generateMetadata() {
  return generateMeta({
    title: "Finance Admin Dashboard Template",
    description:
      "Manage income, expenses, and savings goals with interactive charts. A professional finance admin page built with React, Next.js, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/finance"
  });
}

export default function Page() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Finance Dashboard</h1>
        <div className="flex items-center space-x-2">
          <CalendarDateRangePicker />
          <Button size="icon">
            <Download />
          </Button>
        </div>
      </div>

      <KPICards />

      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
        <Revenue />
        <MonthlyExpenses />
        <Summary />
      </div>

      <div className="grid-cols-2 gap-4 lg:gap-6 space-y-4 lg:grid lg:space-y-0">
        <Transactions />
        <div className="space-y-4 lg:space-y-6">
          <SavingGoal />
          <CreditCards />
        </div>
      </div>
    </div>
  );
}
