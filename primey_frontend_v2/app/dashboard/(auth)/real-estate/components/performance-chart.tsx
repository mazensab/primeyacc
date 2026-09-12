"use client";

import { useState } from "react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis } from "recharts";

const weeklyData = [
  { label: "Mon", revenue: 45, visit: 30 },
  { label: "Tue", revenue: 52, visit: 38 },
  { label: "Wed", revenue: 48, visit: 35 },
  { label: "Thu", revenue: 70, visit: 55 },
  { label: "Fri", revenue: 65, visit: 48 },
  { label: "Sat", revenue: 58, visit: 42 },
  { label: "Sun", revenue: 60, visit: 50 }
];

const monthlyData = [
  { label: "Jan", revenue: 48, visit: 36 },
  { label: "Feb", revenue: 51, visit: 39 },
  { label: "Mar", revenue: 54, visit: 41 },
  { label: "Apr", revenue: 58, visit: 44 },
  { label: "May", revenue: 57, visit: 43 },
  { label: "Jun", revenue: 61, visit: 47 },
  { label: "Jul", revenue: 59, visit: 45 },
  { label: "Aug", revenue: 63, visit: 49 },
  { label: "Sep", revenue: 62, visit: 48 },
  { label: "Oct", revenue: 66, visit: 51 },
  { label: "Nov", revenue: 65, visit: 50 },
  { label: "Dec", revenue: 69, visit: 54 }
];

const yearlyData = [
  { label: "2019", revenue: 35, visit: 25 },
  { label: "2020", revenue: 42, visit: 32 },
  { label: "2021", revenue: 55, visit: 45 },
  { label: "2022", revenue: 68, visit: 52 },
  { label: "2023", revenue: 78, visit: 62 },
  { label: "2024", revenue: 85, visit: 70 },
  { label: "2025", revenue: 92, visit: 78 }
];

const dataByPeriod = {
  weekly: weeklyData,
  monthly: monthlyData,
  yearly: yearlyData
};

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--primary)"
  },
  visit: {
    label: "Visit",
    color: "var(--muted-foreground)"
  }
} satisfies ChartConfig;

export function PerformanceChart() {
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const chartPoints = dataByPeriod[period];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance</CardTitle>
        <CardAction>
          <Tabs
            value={period}
            onValueChange={(value) => setPeriod(value as "weekly" | "monthly" | "yearly")}>
            <TabsList>
              <TabsTrigger value="weekly">W</TabsTrigger>
              <TabsTrigger value="monthly">M</TabsTrigger>
              <TabsTrigger value="yearly">Y</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col">
        <div className="text-muted-foreground mb-3 flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[var(--primary)]" />
            Revenue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[var(--muted-foreground)]" />
            Visit
          </span>
        </div>
        <div className="relative 2xl:flex-1">
          <ChartContainer
            config={chartConfig}
            className="aspect-video w-full lg:h-[240px] 2xl:aspect-auto 2xl:h-full 2xl:min-h-[240px]">
            <AreaChart data={chartPoints} margin={{ top: 12, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={34} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="visit"
                stroke="var(--muted-foreground)"
                strokeWidth={2}
                fill="transparent"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#fillRevenue)"
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
