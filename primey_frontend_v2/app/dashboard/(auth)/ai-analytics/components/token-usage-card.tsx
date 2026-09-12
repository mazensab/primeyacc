"use client";

import { ArrowRightIcon, ArrowUpRightIcon, InfoIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const chartData = [
  { date: "Aug 1", tokens: 23400 },
  { date: "Aug 2", tokens: 17100 },
  { date: "Aug 3", tokens: 11200 },
  { date: "Aug 4", tokens: 18800 },
  { date: "Aug 5", tokens: 16400 },
  { date: "Aug 6", tokens: 8200 },
  { date: "Aug 7", tokens: 17300 },
  { date: "Aug 8", tokens: 21400 },
  { date: "Aug 9", tokens: 9400 },
  { date: "Aug 10", tokens: 14200 },
  { date: "Aug 11", tokens: 4800 },
  { date: "Aug 12", tokens: 17600 },
  { date: "Aug 13", tokens: 13800 },
  { date: "Aug 14", tokens: 16600 },
  { date: "Aug 15", tokens: 12400 },
  { date: "Aug 16", tokens: 19100 },
  { date: "Aug 17", tokens: 8800 },
  { date: "Aug 18", tokens: 15600 },
  { date: "Aug 19", tokens: 11000 },
  { date: "Aug 20", tokens: 6400 },
  { date: "Aug 21", tokens: 14400 },
  { date: "Aug 22", tokens: 17800 },
  { date: "Aug 23", tokens: 16200 },
  { date: "Aug 24", tokens: 22800 },
  { date: "Aug 25", tokens: 17400 }
];

const chartConfig = {
  tokens: {
    label: "Tokens",
    color: "var(--chart-2)"
  }
} satisfies ChartConfig;

export function TokenUsageCard() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Token Usage
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="text-muted-foreground size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Total tokens over time</TooltipContent>
          </Tooltip>
        </CardTitle>
        <CardDescription>Total tokens over time</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="space-y-1">
          <div className="font-display text-2xl lg:text-3xl">339,170</div>
          <p className="flex items-center gap-1 text-sm">
            <span className="flex items-center gap-0.5 font-medium text-green-600">
              <ArrowUpRightIcon className="size-3.5" />
              8.3%
            </span>
            <span className="text-muted-foreground">vs last month</span>
          </p>
        </div>
        <ChartContainer config={chartConfig} className="aspect-auto min-h-[180px] w-full flex-1">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              ticks={["Aug 1", "Aug 6", "Aug 11", "Aug 16", "Aug 21"]}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={36}
              domain={[0, 30_000]}
              ticks={[0, 10_000, 20_000, 30_000]}
              tickFormatter={(value) => (value === 0 ? "0" : `${value / 1_000}K`)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-medium tabular-nums">
                      {Number(value).toLocaleString("en-US")} tokens
                    </span>
                  )}
                />
              }
            />
            <Bar dataKey="tokens" fill="var(--chart-2)" radius={3} barSize={7} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="justify-center">
        <Button variant="link" className="text-foreground">
          View data table <ArrowRightIcon />
        </Button>
      </CardFooter>
    </Card>
  );
}
