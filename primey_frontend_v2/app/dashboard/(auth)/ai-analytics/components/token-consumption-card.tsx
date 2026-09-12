"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

const COST_PER_TOKEN = 0.000165;

const dailyTokens = [
  { day: 1, input: 528400, output: 248300 },
  { day: 2, input: 421600, output: 198100 },
  { day: 3, input: 598200, output: 281200 },
  { day: 4, input: 1224800, output: 575700 },
  { day: 5, input: 662300, output: 311300 },
  { day: 6, input: 512400, output: 240800 },
  { day: 7, input: 545900, output: 256600 },
  { day: 8, input: 701200, output: 329600 },
  { day: 9, input: 1318500, output: 619700 },
  { day: 10, input: 588600, output: 276700 },
  { day: 11, input: 618400, output: 290700 },
  { day: 12, input: 508900, output: 239200 },
  { day: 13, input: 724100, output: 340300 },
  { day: 14, input: 648200, output: 304700 },
  { day: 15, input: 671800, output: 315700 },
  { day: 16, input: 688400, output: 323500 },
  { day: 17, input: 742600, output: 349000 },
  { day: 18, input: 1742630, output: 823211 },
  { day: 19, input: 512800, output: 241000 },
  { day: 20, input: 498300, output: 234200 },
  { day: 21, input: 1264400, output: 594200 },
  { day: 22, input: 758200, output: 356400 },
  { day: 23, input: 642100, output: 301800 },
  { day: 24, input: 588400, output: 276500 },
  { day: 25, input: 542700, output: 255100 },
  { day: 26, input: 712300, output: 334800 },
  { day: 27, input: 1198600, output: 563300 },
  { day: 28, input: 704800, output: 331300 },
  { day: 29, input: 598100, output: 281100 },
  { day: 30, input: 478600, output: 224900 }
];

const chartConfig = {
  input: {
    label: "Input tokens",
    color: "var(--chart-1)"
  },
  output: {
    label: "Output tokens",
    color: "var(--chart-3)"
  },
  cost: {
    label: "Est. cost",
    color: "var(--chart-1)"
  }
} satisfies ChartConfig;

const months = ["Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026", "May 2026"];

function formatTokens(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function formatCost(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type TooltipProps = {
  active?: boolean;
  label?: number;
  payload?: { payload: (typeof dailyTokens)[number] }[];
  month: string;
};

function TokenTooltip({ active, label, payload, month }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;
  const total = row.input + row.output;

  return (
    <div className="bg-foreground text-background min-w-52 rounded-lg p-3 shadow-md">
      <p className="mb-2 text-sm font-medium">
        {month.split(" ")[0]} {label}, {month.split(" ")[1]}
      </p>
      <div className="space-y-1.5 text-sm">
        <div className="flex items-center justify-between gap-6">
          <span className="opacity-70">Input tokens</span>
          <span className="font-medium tabular-nums">{row.input.toLocaleString("en-US")}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="opacity-70">Output tokens</span>
          <span className="font-medium tabular-nums">{row.output.toLocaleString("en-US")}</span>
        </div>
        <div className="border-background/20 mt-2 space-y-1.5 border-t pt-2">
          <div className="flex items-center justify-between gap-6">
            <span className="opacity-70">Total tokens</span>
            <span className="font-medium tabular-nums">{total.toLocaleString("en-US")}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="opacity-70">Est. cost</span>
            <span className="font-medium tabular-nums">{formatCost(total * COST_PER_TOKEN)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TokenConsumptionCard() {
  const [view, setView] = useState("tokens");
  const [month, setMonth] = useState("Apr 2026");

  const chartData = useMemo(
    () =>
      dailyTokens.map((row) => ({
        ...row,
        cost: (row.input + row.output) * COST_PER_TOKEN
      })),
    []
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily token consumption</CardTitle>
        <CardDescription>Input and output token volume across your workspace</CardDescription>
        <CardAction>
          <div className="flex flex-wrap items-center gap-3">
            {view === "tokens" && (
              <div className="text-muted-foreground hidden items-center gap-4 text-sm lg:flex">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-(--chart-1)" />
                  Input tokens
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-(--chart-3)" />
                  Output tokens
                </span>
              </div>
            )}
            <Tabs value={view} onValueChange={setView}>
              <TabsList>
                <TabsTrigger value="tokens">Tokens</TabsTrigger>
                <TabsTrigger value="cost">Cost</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger size="sm" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {months.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
          <BarChart accessibilityLayer data={chartData} barGap={2}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              ticks={[1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29]}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={48}
              tickFormatter={(value) =>
                view === "tokens" ? formatTokens(value) : `$${Math.round(value)}`
              }
            />
            <ChartTooltip
              cursor={false}
              content={<TokenTooltip month={month} />}
            />
            {view === "tokens" ? (
              <>
                <Bar dataKey="input" fill="var(--chart-1)" radius={4} barSize={6} />
                <Bar dataKey="output" fill="var(--chart-3)" radius={4} barSize={6} />
              </>
            ) : (
              <Bar dataKey="cost" fill="var(--chart-1)" radius={4} barSize={10} />
            )}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
