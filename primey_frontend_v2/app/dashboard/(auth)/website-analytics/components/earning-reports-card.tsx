"use client";

import { AreaChartIcon, DollarSignIcon, HandCoinsIcon, ReceiptTextIcon } from "lucide-react";
import { Bar, BarChart, XAxis } from "recharts";

import { InfoIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { FolderUp } from "lucide-react";

const chartData = [
  { day: "Mo", sales: 35 },
  { day: "Thu", sales: 30 },
  { day: "We", sales: 37 },
  { day: "Th", sales: 14 },
  { day: "Fr", sales: 20 },
  { day: "Sa", sales: 24 },
  { day: "Su", sales: 38 }
];

const chartConfig = {
  desktop: {
    label: "Sales",
    color: "var(--chart-1)"
  }
} satisfies ChartConfig;

const stats = [
  { label: "Earnings", value: "$545.69", progress: 70, icon: DollarSignIcon },
  { label: "Profit", value: "$256.34", progress: 45, icon: AreaChartIcon },
  { label: "Expense", value: "$74.19", progress: 80, icon: HandCoinsIcon },
  { label: "Tax", value: "$23.10", progress: 25, icon: ReceiptTextIcon }
];

export function EarningReportsCard() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Earning Reports
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="text-muted-foreground size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Last 28 days</TooltipContent>
          </Tooltip>
        </CardTitle>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FolderUp /> <span className="hidden lg:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Excel</DropdownMenuItem>
              <DropdownMenuItem>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-4 p-(--card-spacing)">
          <div className="flex items-center gap-2">
            <div className="font-display text-2xl lg:text-3xl">$1.468</div>
            <Badge className="bg-green-600">+4.2%</Badge>
          </div>
          <ChartContainer className="aspect-auto h-[200px] w-full" config={chartConfig}>
            <BarChart accessibilityLayer data={chartData}>
              <XAxis
                dataKey="day"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent color="var(--chart-2)" hideLabel />}
              />
              <Bar dataKey="sales" fill="url(#fillGradient)" radius={5} barSize={35} />
              <defs>
                <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-2)" />
                  <stop offset="95%" stopColor="var(--chart-1)" />
                </linearGradient>
              </defs>
            </BarChart>
          </ChartContainer>
        </div>
        <div className="grid border-t sm:grid-cols-2 sm:[&>*:nth-child(2)]:border-t-0 sm:[&>*:nth-child(odd)]:border-e [&>*:not(:first-child)]:border-t">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col justify-center gap-4 p-(--card-spacing)">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="bg-background border-border flex size-9 shrink-0 items-center justify-center rounded-full border">
                    <stat.icon className="size-4" />
                  </div>
                  <span className="truncate">{stat.label}</span>
                </div>
                <div className="font-semibold tabular-nums">{stat.value}</div>
              </div>
              <Progress className="h-1" value={stat.progress} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
