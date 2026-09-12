"use client";

import React from "react";
import { Label, Pie, PieChart } from "recharts";
import { ChevronRightIcon, InfoIcon } from "lucide-react";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";

const chartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 287, fill: "var(--color-firefox)" },
  { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
  { browser: "other", visitors: 190, fill: "var(--color-other)" }
];

const chartConfig = {
  visitors: {
    label: "Visitors"
  },
  chrome: {
    label: "Chrome",
    color: "var(--chart-1)"
  },
  safari: {
    label: "Safari",
    color: "var(--chart-2)"
  },
  firefox: {
    label: "Firefox",
    color: "var(--chart-3)"
  },
  edge: {
    label: "Edge",
    color: "var(--chart-4)"
  },
  other: {
    label: "Other",
    color: "var(--chart-5)"
  }
} satisfies ChartConfig;

const summaryData = [
  { name: "Food & Drink", value: 48, color: "var(--chart-1)" },
  { name: "Grocery", value: 32, color: "var(--chart-2)" },
  { name: "Shopping", value: 13, color: "var(--chart-3)" },
  { name: "Transport", value: 7, color: "var(--chart-4)" }
];

export default function Summary() {
  const totalVisitors = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.visitors, 0);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Summary
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="text-muted-foreground size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Data from 1-12 Apr, 2024</TooltipContent>
          </Tooltip>
        </CardTitle>
        <CardAction>
          <Button size="icon-sm" variant="outline" aria-label="View summary details">
            <ChevronRightIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-1 items-center justify-center">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[200px] w-full">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={chartData}
                dataKey="visitors"
                nameKey="browser"
                innerRadius={50}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle">
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-2xl font-bold">
                            ${totalVisitors.toLocaleString("en-US")}
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {summaryData.map((item, index) => (
            <div key={index} className="bg-muted flex items-center justify-between rounded-md p-4">
              <div className="flex items-center space-x-2">
                <div className="size-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-muted-foreground text-sm">{item.name}</span>
              </div>
              <span className="text-sm font-medium">{item.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
