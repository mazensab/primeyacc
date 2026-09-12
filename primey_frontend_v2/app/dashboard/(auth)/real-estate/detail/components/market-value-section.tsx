"use client";

import { useMemo, useState } from "react";
import { InfoIcon } from "lucide-react";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import type { ListingData } from "../../types";

type MarketValueSectionProps = {
  marketValue: ListingData["marketValue"];
};

const chartConfig = {
  sales: {
    label: "Sales",
    color: "var(--chart-2)"
  },
  rent: {
    label: "Rent",
    color: "var(--chart-5)"
  },
  buy: {
    label: "Buy",
    color: "var(--chart-3)"
  }
} satisfies ChartConfig;

export function MarketValueSection({ marketValue }: MarketValueSectionProps) {
  const years = useMemo(
    () =>
      Array.from(new Set(marketValue.history.map((item) => item.year))).sort(
        (a, b) => Number(b) - Number(a)
      ),
    [marketValue.history]
  );
  const [selectedYear, setSelectedYear] = useState(years[0] ?? "");
  const filteredHistory = useMemo(
    () => marketValue.history.filter((item) => item.year === selectedYear),
    [marketValue.history, selectedYear]
  );

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold lg:text-2xl">{marketValue.title}</h2>

      <div className="space-y-4">
        <div className="grid gap-4 lg:gap-6 md:grid-cols-3">
          {[
            { label: "Zestimate", value: marketValue.stats.zestimate },
            { label: "Sales range", value: marketValue.stats.salesRange },
            { label: "Rent", value: marketValue.stats.rent }
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader>
                <CardTitle>{stat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              History
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="text-muted-foreground size-3.5" />
                </TooltipTrigger>
                <TooltipContent>Market trend overview</TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardAction>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
              <AreaChart accessibilityLayer data={filteredHistory} margin={{ left: 12, right: 12 }}>
                <defs>
                  <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillRent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-rent)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-rent)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillBuy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-buy)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-buy)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value: string) => value.slice(0, 3)}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Area
                  dataKey="sales"
                  type="natural"
                  fill="url(#fillSales)"
                  fillOpacity={0.4}
                  stroke="var(--color-sales)"
                  stackId="a"
                />
                <Area
                  dataKey="rent"
                  type="natural"
                  fill="url(#fillRent)"
                  fillOpacity={0.4}
                  stroke="var(--color-rent)"
                  stackId="a"
                />
                <Area
                  dataKey="buy"
                  type="natural"
                  fill="url(#fillBuy)"
                  fillOpacity={0.4}
                  stroke="var(--color-buy)"
                  stackId="a"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
