"use client";

import { ArrowRightIcon, InfoIcon } from "lucide-react";
import { Label, Pie, PieChart } from "recharts";

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
  { model: "gpt4", cost: 51.96, fill: "var(--color-gpt4)" },
  { model: "claude", cost: 27.68, fill: "var(--color-claude)" },
  { model: "gemini", cost: 15.97, fill: "var(--color-gemini)" },
  { model: "other", cost: 2.0, fill: "var(--color-other)" }
];

const chartConfig = {
  gpt4: {
    label: "GPT-4",
    color: "var(--chart-1)"
  },
  claude: {
    label: "Claude 3 Opus",
    color: "var(--chart-2)"
  },
  gemini: {
    label: "Gemini 1.5 Pro",
    color: "var(--chart-3)"
  },
  other: {
    label: "Other/Unclassified",
    color: "var(--chart-4)"
  }
} satisfies ChartConfig;

type ChartConfigKeys = keyof typeof chartConfig;

const total = chartData.reduce((acc, item) => acc + item.cost, 0);

export function CostBreakdownCard() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Cost Breakdown
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="text-muted-foreground size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Estimated cost per model, last 28 days</TooltipContent>
          </Tooltip>
        </CardTitle>
        <CardDescription>Share of total cost</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center gap-2 @sm/card:flex-row @sm/card:gap-4">
          <ChartContainer config={chartConfig} className="aspect-square w-full max-w-[200px]">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={chartData}
                dataKey="cost"
                nameKey="model"
                innerRadius={58}
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
                            className="fill-foreground font-display text-2xl">
                            ${total.toFixed(2)}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 22}
                            className="fill-muted-foreground">
                            Total
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="w-full space-y-4 @sm/card:w-auto @sm/card:min-w-40">
            {chartData.map((item) => {
              const config = chartConfig[item.model as ChartConfigKeys];
              return (
                <div key={item.model} className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="font-medium">{config.label}</span>
                  </div>
                  <p className="text-muted-foreground ms-4 tabular-nums">
                    ${item.cost.toFixed(2)} ({((item.cost / total) * 100).toFixed(1)}%)
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        <Button variant="link" className="text-foreground">
          View full breakdown <ArrowRightIcon />
        </Button>
      </CardFooter>
    </Card>
  );
}
