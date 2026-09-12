import CustomDateRangePicker from "@/components/custom-date-range-picker";
import { Button } from "@/components/ui/button";
import { generateMeta } from "@/lib/utils";

import { LeadBySourceCard } from "./components/leads-by-source";
import { SalesPipeline } from "./components/sales-pipeline";
import { LeadsCard } from "./components/leads";
import { TargetCard } from "./components/target-card";
import { TotalCustomersCard } from "./components/total-customers";
import { TotalDeals } from "./components/total-deals";
import { TotalRevenueCard } from "./components/total-revenue";
import { RecentTasks } from "./components/recent-tasks";

export async function generateMetadata() {
  return generateMeta({
    title: "CRM Admin Dashboard Template",
    description:
      "Manage customer relationships, sales pipelines, and performance metrics. A professional CRM admin page built with React, Next.js, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/crm"
  });
}

export default function Page() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">CRM Dashboard</h1>
        <div className="flex items-center space-x-2">
          <CustomDateRangePicker />
          <Button>Download</Button>
        </div>
      </div>
      <div className="space-y-4 lg:space-y-6">
        <div className="grid gap-4 lg:gap-6 md:grid-cols-2 xl:grid-cols-4">
          <TargetCard />
          <TotalCustomersCard />
          <TotalDeals />
          <TotalRevenueCard />
        </div>
        <div className="grid gap-4 lg:gap-6 xl:grid-cols-3">
          <LeadBySourceCard />
          <RecentTasks />
          <SalesPipeline />
        </div>
        <LeadsCard />
      </div>
    </div>
  );
}
