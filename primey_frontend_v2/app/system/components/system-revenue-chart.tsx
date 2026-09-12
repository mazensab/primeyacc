"use client";

import * as React from "react";
import Image from "next/image";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { BarChart3 } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type SeriesKey = "net_collected" | "subscription_value";

type Row = {
  date: string;
  net_collected: string | number;
  subscription_value: string | number;
};

type Props = {
  data: Row[];
  totals: Record<SeriesKey, string | number>;
  defaultSeries: SeriesKey;
  labels: {
    title: string;
    description: string;
    netCollected: string;
    subscriptionValue: string;
    sar: string;
    noData: string;
  };
};

function money(value: unknown) {
  const parsed = Number(String(value ?? 0).replace(/,/g, ""));
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

export function SystemRevenueChart({ data, totals, defaultSeries, labels }: Props) {
  const [activeChart, setActiveChart] = React.useState<SeriesKey>(defaultSeries);

  React.useEffect(() => {
    setActiveChart(defaultSeries);
  }, [defaultSeries]);

  const chartData = React.useMemo(
    () =>
      data.map((row) => ({
        ...row,
        net_collected: Number(row.net_collected || 0),
        subscription_value: Number(row.subscription_value || 0),
      })),
    [data],
  );

  const config = React.useMemo(
    () =>
      ({
        views: { label: labels.title },
        net_collected: { label: labels.netCollected, color: "var(--chart-2)" },
        subscription_value: { label: labels.subscriptionValue, color: "var(--chart-1)" },
      }) satisfies ChartConfig,
    [labels.netCollected, labels.subscriptionValue, labels.title],
  );

  const hasData = chartData.some(
    (row) => row.net_collected !== 0 || row.subscription_value !== 0,
  );

  return (
    <Card className="h-full">
      <CardHeader className="@max-md/card:grid!">
        <CardTitle icon={BarChart3} iconPosition="opposite">{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
        <CardAction className="flex gap-1">
          {(["subscription_value", "net_collected"] as SeriesKey[]).map((key) => (
            <button
              key={key}
              type="button"
              data-active={activeChart === key}
              className="hover:bg-card/60 data-[active=true]:bg-card data-[active=true]:ring-foreground/10 flex flex-col gap-0.5 rounded-lg px-4 py-1.5 text-start transition-colors data-[active=true]:shadow-2xs data-[active=true]:ring-1"
              onClick={() => setActiveChart(key)}
            >
              <span className="text-muted-foreground text-xs">
                {key === "net_collected" ? labels.netCollected : labels.subscriptionValue}
              </span>
              <span className="font-display inline-flex items-center gap-1 text-lg leading-none">
                <Image src="/currency/sar.svg" width={14} height={14} alt={labels.sar} />
                {money(totals[key])}
              </span>
            </button>
          ))}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col">
        {hasData ? (
          <ChartContainer
            config={config}
            className="aspect-auto min-h-[186px] w-full flex-1 [&_.recharts-responsive-container]:min-h-[186px]"
          >
            <BarChart accessibilityLayer data={chartData} margin={{ left: 0, right: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[180px]"
                    nameKey="views"
                    labelFormatter={(value) =>
                      new Date(value as string).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    }
                  />
                }
              />
              <Bar dataKey={activeChart} fill={`var(--color-${activeChart})`} radius={5} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="text-muted-foreground flex min-h-[186px] items-center justify-center text-sm">
            {labels.noData}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
