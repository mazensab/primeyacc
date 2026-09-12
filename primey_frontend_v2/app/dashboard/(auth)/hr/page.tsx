import { generateMeta } from "@/lib/utils";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

import CalendarDateRangePicker from "@/components/custom-date-range-picker";

import StatCards from "./components/stat-cards";
import SummaryCards from "./components/summary-cards";
import AttendanceOverview from "./components/attendance-overview";
import WorkCalendar from "./components/work-calendar";
import NextAgenda from "./components/next-agenda";
import AttendanceReport from "./components/attendance-report";
import EmployeesTable from "./components/employees-table";
import DepartmentPerformance from "./components/department-performance";

export async function generateMetadata() {
  return generateMeta({
    title: "HR Admin Dashboard Template",
    description:
      "Track employee attendance, leave requests, KPIs and meeting schedules at a glance. A professional HR admin page built with React, Next.js, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/hr"
  });
}

export default function Page() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">HR Dashboard</h1>
        <div className="flex items-center space-x-2">
          <CalendarDateRangePicker />
          <Button size="icon">
            <Download />
          </Button>
        </div>
      </div>

      <StatCards />

      <SummaryCards />

      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
        <div className="space-y-4 lg:space-y-6 xl:col-span-2">
          <AttendanceOverview />
          <EmployeesTable />
          <DepartmentPerformance />
        </div>
        <div className="space-y-4 lg:space-y-6">
          <WorkCalendar />
          <NextAgenda />
          <AttendanceReport />
        </div>
      </div>
    </div>
  );
}
