"use client";

import { InfoIcon } from "lucide-react";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis } from "recharts";

export function EcommerceTotalRevenueCard() {
  const chartConfig = {
    desktop: {
      label: "Desktop",
      color: "var(--chart-1)"
    },
    mobile: {
      label: "Mobile",
      color: "var(--chart-2)"
    }
  } satisfies ChartConfig;

  const chartData = [
    { month: "January", desktop: 190, mobile: 180 },
    { month: "February", desktop: 250, mobile: 200 },
    { month: "March", desktop: 240, mobile: 120 },
    { month: "April", desktop: 120, mobile: 190 },
    { month: "May", desktop: 110, mobile: 130 },
    { month: "June", desktop: 250, mobile: 140 }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Total Revenue
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="text-muted-foreground size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Income in the last 28 days</TooltipContent>
          </Tooltip>
        </CardTitle>
        <CardAction className="flex items-center gap-6 @max-md/card:w-full">
          <div className="flex items-baseline gap-2">
            <span className="text-muted-foreground text-xs tracking-wider uppercase">Desktop</span>
            <span className="font-display text-lg leading-none">24,828</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-muted-foreground text-xs tracking-wider uppercase">Mobile</span>
            <span className="font-display text-lg leading-none">25,010</span>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div>
          <ChartContainer className="!aspect-21/9 lg:h-[300px] w-full" config={chartConfig}>
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: -6,
                right: -6
              }}>
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
              <Bar dataKey="desktop" fill="var(--color-desktop)" radius={8} />
              <Bar dataKey="mobile" fill="var(--color-mobile)" radius={8} />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
