import { generateMeta } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import CalendarDateRangePicker from "@/components/custom-date-range-picker";

import { AverageDailySalesCard } from "./components/average-daily-sales";
import { WebsiteAnalyticsCard } from "./components/website-analytics-card";
import { SaleOverviewCard } from "./components/sales-overflow-card";
import { EarningReportsCard } from "./components/earning-reports-card";
import { TicketsCard } from "./components/tickets-card";
import { SalesByCountriesCard } from "./components/sales-by-countries-card";
import { TotalEarningCard } from "./components/total-earning-card";
import { MonthlyCampaignStateCard } from "./components/monthly-campaign-state";
import { StatCards } from "./components/stat-cards";

export async function generateMetadata() {
  return generateMeta({
    title: "Website Analytics Admin Dashboard",
    description:
      "Analyze website analytics, earnings, and user data with real-time reports. A professional admin page built with React, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/website-analytics"
  });
}

export default function Page() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Website Analytics</h1>
        <div className="flex items-center space-x-2">
          <div className="grow">
            <CalendarDateRangePicker />
          </div>
          <Button>Download</Button>
        </div>
      </div>
      <div className="grid gap-4 lg:gap-6 lg:grid-cols-12">
        <div className="lg:col-span-12">
          <StatCards />
        </div>
        <div className="lg:col-span-12 xl:col-span-8">
          <EarningReportsCard />
        </div>
        <div className="lg:col-span-12 xl:col-span-4">
          <TicketsCard />
        </div>
        <div className="lg:col-span-4">
          <WebsiteAnalyticsCard />
        </div>
        <div className="lg:col-span-4">
          <AverageDailySalesCard />
        </div>
        <div className="lg:col-span-4">
          <SaleOverviewCard />
        </div>
        <div className="lg:col-span-4">
          <SalesByCountriesCard />
        </div>
        <div className="lg:col-span-4">
          <TotalEarningCard />
        </div>
        <div className="lg:col-span-4">
          <MonthlyCampaignStateCard />
        </div>
      </div>
    </div>
  );
}
