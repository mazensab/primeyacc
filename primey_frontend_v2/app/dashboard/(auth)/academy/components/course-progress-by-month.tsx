"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import CalendarDateRangePicker from "@/components/custom-date-range-picker";

const chartData = [
  { month: "January", progress: 32 },
  { month: "February", progress: 41 },
  { month: "March", progress: 38 },
  { month: "April", progress: 46 },
  { month: "May", progress: 52 },
  { month: "June", progress: 49 },
  { month: "July", progress: 58 },
  { month: "August", progress: 64 },
  { month: "September", progress: 61 },
  { month: "October", progress: 68 },
  { month: "November", progress: 72 },
  { month: "December", progress: 78 }
];

const chartConfig = {
  progress: {
    label: "Avg. completion",
    color: "var(--chart-1)"
  }
} satisfies ChartConfig;

export function CourseProgressByMonth() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Progress by Month</CardTitle>
        <CardDescription className="flex items-center gap-2">
          Average course completion across all students
          <Badge variant="success">+2.5%</Badge>
        </CardDescription>
        <CardAction>
          <CalendarDateRangePicker />
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer className="aspect-auto h-[300px] w-full" config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 0,
              right: 12,
              top: 12
            }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: string) => value.slice(0, 3)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={40}
              tickFormatter={(value: number) => `${value}%`}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <linearGradient id="fillProgress" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-progress)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-progress)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              dataKey="progress"
              type="natural"
              fill="url(#fillProgress)"
              fillOpacity={0.4}
              stroke="var(--color-progress)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
