import { generateMeta } from "@/lib/utils";
import Link from "next/link";

import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { FolderUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { SummaryCards } from "./components/summary-cards";
import { AchievementByYear } from "./components/achievement-by-year";
import { ChartProjectOverview } from "./components/chart-project-overview";
import { ChartProjectEfficiency } from "./components/chart-project-efficiency";
import { TableRecentProjects } from "./components/table-recent-projects";
import { Reminders } from "./components/reminders";
import { SuccessMetrics } from "./components/success-metrics";

export async function generateMetadata() {
  return generateMeta({
    title: "Project Management Admin Dashboard",
    description:
      "Track tasks, deadlines, and team efficiency with interactive charts. A professional dashboard page built with React, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/project-management"
  });
}

export default function Page() {
  return (
    <>
      <div className="mb-4 flex flex-row items-center justify-between space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Project Dashboard</h1>
        <div className="flex items-center space-x-2">
          <CalendarDateRangePicker />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FolderUp /> <span className="hidden lg:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Excel</DropdownMenuItem>
              <DropdownMenuItem>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4 lg:space-y-6">
        <TabsList className="z-10">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports" asChild>
            <Link href="/dashboard/project-management/reports">Reports</Link>
          </TabsTrigger>
          <TabsTrigger value="activities" disabled>
            Activities
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4 lg:space-y-6">
          <SummaryCards />
          <div className="mt-4 grid gap-4 lg:gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartProjectOverview />
            </div>
            <SuccessMetrics />
          </div>
          <div className="mt-4 grid gap-4 lg:gap-6 xl:grid-cols-2 2xl:grid-cols-4">
            <Reminders />
            <AchievementByYear />
            <ChartProjectEfficiency />
          </div>
          <TableRecentProjects />
        </TabsContent>
        <TabsContent value="activities">...</TabsContent>
      </Tabs>
    </>
  );
}
