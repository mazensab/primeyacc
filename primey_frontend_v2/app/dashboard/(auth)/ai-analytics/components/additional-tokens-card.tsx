"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";

import { TimeRangeTabs } from "./time-range-tabs";

const chartDataByRange: Record<string, { label: string; tokens: number }[]> = {
  All: [
    { label: "2020", tokens: 42000 },
    { label: "2021", tokens: 182400 },
    { label: "2022", tokens: 316800 },
    { label: "2023", tokens: 524600 },
    { label: "2024", tokens: 782300 },
    { label: "2025", tokens: 1124500 }
  ],
  "7d": [
    { label: "Mon", tokens: 8200 },
    { label: "Tue", tokens: 124600 },
    { label: "Wed", tokens: 302400 },
    { label: "Thu", tokens: 368200 },
    { label: "Fri", tokens: 341800 },
    { label: "Sat", tokens: 284600 },
    { label: "Sun", tokens: 648900 }
  ],
  "1m": [
    { label: "Week 1", tokens: 214800 },
    { label: "Week 2", tokens: 342600 },
    { label: "Week 3", tokens: 296400 },
    { label: "Week 4", tokens: 458200 }
  ],
  "6m": [
    { label: "Apr", tokens: 182400 },
    { label: "May", tokens: 264800 },
    { label: "Jun", tokens: 412600 },
    { label: "Jul", tokens: 354200 },
    { label: "Aug", tokens: 521800 },
    { label: "Sep", tokens: 642400 }
  ],
  "1y": [
    { label: "Jan", tokens: 92400 },
    { label: "Feb", tokens: 143800 },
    { label: "Mar", tokens: 212600 },
    { label: "Apr", tokens: 184200 },
    { label: "May", tokens: 263400 },
    { label: "Jun", tokens: 318600 },
    { label: "Jul", tokens: 412800 },
    { label: "Aug", tokens: 384200 },
    { label: "Sep", tokens: 524600 },
    { label: "Oct", tokens: 612400 },
    { label: "Nov", tokens: 568200 },
    { label: "Dec", tokens: 724800 }
  ]
};

const costByRange: Record<string, string> = {
  All: "1.2K$",
  "7d": "23$",
  "1m": "68$",
  "6m": "142$",
  "1y": "297$"
};

function formatAvg(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return String(Math.round(value));
}

const chartConfig = {
  tokens: {
    label: "Tokens",
    color: "var(--chart-1)"
  }
} satisfies ChartConfig;

function formatTokens(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("en-US")}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

export function AdditionalTokensCard() {
  const [range, setRange] = useState("7d");
  const chartData = chartDataByRange[range];
  const avg = chartData.reduce((sum, item) => sum + item.tokens, 0) / chartData.length;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Additional Tokens</CardTitle>
        <CardDescription>
          Avg {formatAvg(avg)}{" "}
          <span className="text-foreground font-medium">({costByRange[range]})</span>
        </CardDescription>
        <CardAction>
          <TimeRangeTabs value={range} onValueChange={setRange} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[190px] w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={44}
              domain={[0, 1_250_000]}
              ticks={[0, 250_000, 500_000, 750_000, 1_000_000, 1_250_000]}
              tickFormatter={formatTokens}
            />
            <ReferenceLine
              y={1_000_000}
              stroke="var(--destructive)"
              strokeOpacity={0.4}
              strokeDasharray="6 6"
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value) => (
                    <span className="font-medium tabular-nums">
                      {Number(value).toLocaleString("en-US")} tokens
                    </span>
                  )}
                />
              }
            />
            <Line
              dataKey="tokens"
              type="monotone"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "var(--card)", stroke: "var(--chart-1)" }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
