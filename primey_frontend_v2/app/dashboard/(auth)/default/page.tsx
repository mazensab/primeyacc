import { generateMeta } from "@/lib/utils";

import CustomDateRangePicker from "@/components/custom-date-range-picker";
import { Button } from "@/components/ui/button";

import { ChatWidget } from "./components/chat-widget";
import { ExerciseMinutes } from "./components/exercise-minutes";
import { LatestPayments } from "./components/latest-payments";
import { PaymentMethodCard } from "./components/payment-method";
import { SubscriptionsCard } from "./components/subscriptions";
import { TeamMembersCard } from "./components/theme-members";
import { TotalRevenueCard } from "./components/total-revenue";

import { Download } from "lucide-react";

export async function generateMetadata() {
  return generateMeta({
    title: "Admin Dashboard Template",
    description:
      "Track revenue, subscriptions, and team activity with a modern interface. A professional admin page built with React, Next.js, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/default"
  });
}

export default function Page() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <CustomDateRangePicker />
          <Button>
            <Download />
            <span className="hidden lg:inline">Download</span>
          </Button>
        </div>
      </div>
      <div className="gap-4 lg:gap-6 space-y-4 lg:grid lg:grid-cols-3 lg:space-y-0">
        <TeamMembersCard />
        <SubscriptionsCard />
        <TotalRevenueCard />
        <ChatWidget />
        <div className="lg:col-span-2">
          <ExerciseMinutes />
        </div>
        <div className="lg:col-span-2">
          <LatestPayments />
        </div>
        <PaymentMethodCard />
      </div>
    </div>
  );
}
