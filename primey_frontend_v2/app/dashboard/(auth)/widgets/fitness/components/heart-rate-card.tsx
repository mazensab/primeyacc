"use client";

import { Heart } from "lucide-react";
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";

import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const chartData = [{ metric: "bpm", value: 118, fill: "var(--color-rose-500)" }];

const chartConfig = {
  value: {
    label: "BPM"
  }
} satisfies ChartConfig;

const stats = [
  { label: "Resting", value: "64" },
  { label: "Average", value: "92" },
  { label: "Peak", value: "176" }
];

export function HeartRateCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-muted-foreground text-sm font-medium">Heart Rate</CardTitle>
          <Heart className="text-destructive h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-40 w-full">
          <RadialBarChart
            data={chartData}
            startAngle={90}
            endAngle={-180}
            innerRadius={56}
            outerRadius={78}>
            <RadialBar dataKey="value" background={{ fill: "var(--muted)" }} cornerRadius={10} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
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
                          className="fill-foreground text-4xl font-bold">
                          {chartData[0].value.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground">
                          BPM
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-muted rounded-lg p-3 text-center">
              <p className="text-muted-foreground mb-1 text-xs">{stat.label}</p>
              <p className="font-semibold tabular-nums">{stat.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
