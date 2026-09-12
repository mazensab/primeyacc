"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";

const chartData = [
  { month: "January", weight: 68 },
  { month: "February", weight: 55 },
  { month: "March", weight: 70 },
  { month: "April", weight: 45 },
  { month: "May", weight: 68 },
  { month: "June", weight: 57 }
];
const chartConfig = {
  weight: {
    label: "Weight",
    color: "var(--chart-1)"
  }
} satisfies ChartConfig;

export function BodyWeightCard() {
  return (
    <Card className="relative overflow-hidden border-0 bg-slate-900 text-white">
      <img
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/attachments/gen-images/public/fitness-person-lifting-weights-dramatic-lighting-oApiCHq5LsUhdfcVwBSzDhOZFaufqL.jpg"
        alt="Body weight tracking"
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-transparent" />
      <CardHeader className="relative pb-2">
        <CardTitle className="text-2xl font-bold">Body Weight</CardTitle>
        <p className="text-sm text-white/80">72 kg target</p>
      </CardHeader>
      <CardContent className="relative">
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 0,
              right: 0
            }}>
            <defs>
              <linearGradient id="bodyWeightFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-amber-300)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-amber-300)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-slate-600)" strokeOpacity={0.5} vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Area
              dataKey="weight"
              type="natural"
              stroke="var(--color-amber-300)"
              strokeWidth={2}
              fill="url(#bodyWeightFill)"
              dot={{
                fill: "var(--color-amber-300)",
                strokeWidth: 0,
                r: 3
              }}
              activeDot={{
                r: 5
              }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
