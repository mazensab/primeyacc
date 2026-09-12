"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";
import { ClockIcon, MessageCircleReplyIcon, TicketIcon } from "lucide-react";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const chartData = [
  { browser: "new", tickets: 40, fill: "var(--color-new)" },
  { browser: "open", tickets: 25, fill: "var(--color-open)" }
];

const chartConfig = {
  new: {
    label: "New Tickets",
    color: "var(--chart-1)"
  },
  open: {
    label: "Open Tickets",
    color: "var(--chart-2)"
  }
} satisfies ChartConfig;

export function TicketsCard() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Tickets</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square lg:max-h-[250px] w-full">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="tickets"
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
                          88%
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground">
                          Completed
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="space-y-3 border-t pt-4">
          {[
            {
              label: "New Tickets",
              value: "40",
              icon: TicketIcon,
            },
            {
              label: "Open Tickets",
              value: "25",
              icon: ClockIcon,
            },
            {
              label: "Response Time",
              value: "1 Day",
              icon: MessageCircleReplyIcon,
            }
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-full border`}>
                <stat.icon className="size-4" />
              </div>
              <div className="text-sm font-medium">{stat.label}</div>
              <div className="text-muted-foreground ms-auto text-sm">{stat.value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
