import { generateMeta } from "@/lib/utils";

import { ApiKeysDataTable } from "./components/datatable";
import { UpgradePlanCard } from "./components/upgrade-plan-card";
import { SuccessfulConversionsCard } from "./components/successful-conversions-card";
import { FailedConversionsCard } from "./components/failed-conversions-card";
import { ApiCallsCard } from "./components/api-calls-card";
import { ApiKey } from "./components/datatable";
import apiKeysData from "./data.json";

export async function generateMetadata() {
  return generateMeta({
    title: "Api Keys",
    additionalTitle: true,
    description:
      "Securely manage API keys, track usage analytics, and monitor conversion success rates with real-time metrics. A professional API management dashboard built with React, Next.js, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/apps/api-keys"
  });
}

export default function Page() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Api Keys Management</h1>
      </div>
      <div className="grid gap-4 lg:gap-6 md:grid-cols-2 lg:grid-cols-4">
        <UpgradePlanCard />
        <SuccessfulConversionsCard />
        <FailedConversionsCard />
        <ApiCallsCard />
      </div>
      <ApiKeysDataTable data={apiKeysData as unknown as ApiKey[]} />
    </div>
  );
}
