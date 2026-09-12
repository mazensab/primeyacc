import { generateMeta } from "@/lib/utils";

import { DownloadReportButton } from "./components/download-report-button";
import { HeaderFilters } from "./components/header-filters";

import { StatCards } from "./components/stat-cards";
import { TokenConsumptionCard } from "./components/token-consumption-card";
import { AdditionalTokensCard } from "./components/additional-tokens-card";
import { UsageByModelCard } from "./components/usage-by-model-card";
import { RequestsByCountryCard } from "./components/requests-by-country-card";
import { CostBreakdownCard } from "./components/cost-breakdown-card";
import { TokenUsageCard } from "./components/token-usage-card";
import { ModelUsageComparisonCard } from "./components/model-usage-comparison-card";
import { MemberUsageTable } from "./components/member-usage-table";

export async function generateMetadata() {
  return generateMeta({
    title: "AI Analytics Admin Dashboard",
    description:
      "Track AI token consumption, model usage, costs, and member activity with real-time reports. A professional admin page built with React, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/ai-analytics"
  });
}

export default function Page() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="space-y-3">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">AI Analytics</h1>
        <div className="flex flex-row items-center justify-between gap-4">
          <HeaderFilters />
          <DownloadReportButton />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-12">
          <StatCards />
        </div>
        <div className="lg:col-span-12">
          <TokenConsumptionCard />
        </div>
        <div className="lg:col-span-6 xl:col-span-4">
          <AdditionalTokensCard />
        </div>
        <div className="lg:col-span-6 xl:col-span-4">
          <UsageByModelCard />
        </div>
        <div className="lg:col-span-12 xl:col-span-4">
          <RequestsByCountryCard />
        </div>
        <div className="lg:col-span-6 xl:col-span-4">
          <CostBreakdownCard />
        </div>
        <div className="lg:col-span-6 xl:col-span-4">
          <TokenUsageCard />
        </div>
        <div className="lg:col-span-12 xl:col-span-4">
          <ModelUsageComparisonCard />
        </div>
        <div className="lg:col-span-12">
          <MemberUsageTable />
        </div>
      </div>
    </div>
  );
}
