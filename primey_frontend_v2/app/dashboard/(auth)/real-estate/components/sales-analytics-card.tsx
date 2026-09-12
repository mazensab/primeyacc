"use client";

import { useMemo, useState } from "react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { Label, Pie, PieChart } from "recharts";

type MonthKey = "jan-2022" | "feb-2022" | "mar-2022";

type SalesEntry = {
  key: "online" | "offline" | "agent" | "marketing";
  label: string;
  value: number;
  color: string;
};

const salesByMonth: Record<MonthKey, SalesEntry[]> = {
  "jan-2022": [
    { key: "online", label: "Online Sale", value: 3425, color: "var(--chart-1)" },
    { key: "offline", label: "Offline Sale", value: 3120, color: "var(--chart-2)" },
    { key: "agent", label: "Agent Sale", value: 2472, color: "var(--chart-3)" },
    { key: "marketing", label: "Marketing Sale", value: 5120, color: "var(--chart-4)" }
  ],
  "feb-2022": [
    { key: "online", label: "Online Sale", value: 3560, color: "var(--chart-1)" },
    { key: "offline", label: "Offline Sale", value: 2980, color: "var(--chart-2)" },
    { key: "agent", label: "Agent Sale", value: 2610, color: "var(--chart-3)" },
    { key: "marketing", label: "Marketing Sale", value: 5040, color: "var(--chart-4)" }
  ],
  "mar-2022": [
    { key: "online", label: "Online Sale", value: 3350, color: "var(--chart-1)" },
    { key: "offline", label: "Offline Sale", value: 3260, color: "var(--chart-2)" },
    { key: "agent", label: "Agent Sale", value: 2550, color: "var(--chart-3)" },
    { key: "marketing", label: "Marketing Sale", value: 5280, color: "var(--chart-4)" }
  ]
};

const monthLabels: Record<MonthKey, string> = {
  "jan-2022": "Jan, 2022",
  "feb-2022": "Feb, 2022",
  "mar-2022": "Mar, 2022"
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const chartConfig = {
  value: {
    label: "Sales"
  },
  online: {
    label: "Online Sale",
    color: "var(--chart-1)"
  },
  offline: {
    label: "Offline Sale",
    color: "var(--chart-2)"
  },
  agent: {
    label: "Agent Sale",
    color: "var(--chart-3)"
  },
  marketing: {
    label: "Marketing Sale",
    color: "var(--chart-4)"
  }
} satisfies ChartConfig;

export function SalesAnalyticsCard() {
  const [month, setMonth] = useState<MonthKey>("jan-2022");
  const entries = salesByMonth[month];

  const { total, chartData } = useMemo(() => {
    const sum = entries.reduce((acc, item) => acc + item.value, 0);
    const normalized = entries.map((item) => ({
      ...item,
      fill: `var(--color-${item.key})`
    }));
    return { total: sum, chartData: normalized };
  }, [entries]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Sales Analytics</CardTitle>
        <CardAction>
          <Select value={month} onValueChange={(value) => setMonth(value as MonthKey)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(monthLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent className="grid grid-cols-1 items-center gap-8 md:grid-cols-[260px_1fr]">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-56 w-full">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              innerRadius={64}
              outerRadius={108}
              strokeWidth={4}>
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle">
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-3xl font-bold">
                        {currency.format(total)}
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="grid gap-4 grid-cols-2">
          {entries.map((entry) => (
            <div key={entry.label} className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.label}
              </p>
              <p className="text-2xl font-semibold">{currency.format(entry.value)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
