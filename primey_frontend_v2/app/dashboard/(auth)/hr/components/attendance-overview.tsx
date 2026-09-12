"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";

/* Weekday stacks sum to the 1,198-person headcount; weekends run reduced shifts */
const chartData = [
  { day: "Mon", onTime: 930, late: 152, absent: 116 },
  { day: "Tue", onTime: 960, late: 136, absent: 102 },
  { day: "Wed", onTime: 985, late: 122, absent: 91 },
  { day: "Thu", onTime: 925, late: 158, absent: 115 },
  { day: "Fri", onTime: 860, late: 188, absent: 150 },
  { day: "Sat", onTime: 400, late: 66, absent: 54 },
  { day: "Sun", onTime: 170, late: 36, absent: 22 }
];

const chartConfig = {
  onTime: { label: "On-Time", color: "var(--chart-1)" },
  late: { label: "Late", color: "var(--chart-4)" },
  absent: { label: "Absent", color: "var(--chart-5)" }
} satisfies ChartConfig;

const segmentKeys = Object.keys(chartConfig) as (keyof typeof chartConfig)[];

const totals = segmentKeys.map((key) => ({
  key,
  ...chartConfig[key],
  total: chartData.reduce((sum, day) => sum + day[key], 0)
}));

const grandTotal = totals.reduce((sum, segment) => sum + segment.total, 0);

export default function AttendanceOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Overview</CardTitle>
        <CardAction>
          <Button variant="outline" size="sm">
            See Detail
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl">90.3%</span>
              <Badge variant="success">+2.7%</Badge>
            </div>
            <p className="text-muted-foreground text-sm">Attendance Rate</p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl">
                1,082<span className="text-muted-foreground text-lg">/1,198</span>
              </span>
              <Badge variant="success">+1.3%</Badge>
            </div>
            <p className="text-muted-foreground text-sm">Today&apos;s Attendance</p>
          </div>
          <div className="flex gap-6 sm:ms-auto">
            {totals.map((segment) => (
              <div key={segment.key}>
                <span
                  className="mb-1 block h-1.5 w-8 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <p className="text-muted-foreground text-xs">{segment.label}</p>
                <p className="text-sm font-medium">
                  {Math.round((segment.total / grandTotal) * 100)}%
                </p>
              </div>
            ))}
          </div>
        </div>
        <ChartContainer config={chartConfig} className="lg:h-64 w-full">
          <BarChart accessibilityLayer data={chartData} barCategoryGap="30%">
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="day" tickLine={false} tickMargin={10} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={40}
              tickFormatter={(value: number) => (value === 0 ? "0" : `${value / 1000}k`)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="onTime" stackId="a" fill="var(--color-onTime)" maxBarSize={36} />
            <Bar dataKey="late" stackId="a" fill="var(--color-late)" maxBarSize={36} />
            <Bar
              dataKey="absent"
              stackId="a"
              fill="var(--color-absent)"
              maxBarSize={36}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
