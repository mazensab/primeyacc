"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { Label, Pie, PieChart } from "recharts";

export function EcommerceVisitBySourceCard() {
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
      label: "Direct",
      color: "var(--chart-1)"
    },
    safari: {
      label: "Social",
      color: "var(--chart-2)"
    },
    firefox: {
      label: "Email",
      color: "var(--chart-3)"
    },
    edge: {
      label: "Referrals",
      color: "var(--chart-4)"
    },
    other: {
      label: "Other",
      color: "var(--chart-5)"
    }
  } satisfies ChartConfig;

  const totalVisitors = chartData.reduce((acc, curr) => acc + curr.visitors, 0);

  return (
    <Card className="lg:col-span-6 xl:col-span-3">
      <CardHeader>
        <CardTitle>Store Visits by Source</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="visitors"
              nameKey="browser"
              innerRadius={60}
              strokeWidth={5}>
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
                          className="fill-foreground font-display text-3xl">
                          {totalVisitors.toLocaleString("en-US")}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground">
                          Visitors
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {chartData.map((item) => (
            <div key={item.browser} className="flex items-center gap-2">
              <span
                className="block size-2 rounded-full"
                style={{
                  backgroundColor:
                    chartConfig[item.browser as Exclude<keyof typeof chartConfig, "visitors">].color
                }}></span>
              <span className="text-xs tracking-wide uppercase">
                {chartConfig[item.browser as keyof typeof chartConfig]?.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
