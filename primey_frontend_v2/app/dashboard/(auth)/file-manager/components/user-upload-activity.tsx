"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const monthlyData = [
  { label: "Jan", uploads: 48 },
  { label: "Feb", uploads: 131 },
  { label: "Mar", uploads: 94 },
  { label: "Apr", uploads: 156 },
  { label: "May", uploads: 87 },
  { label: "Jun", uploads: 132 },
  { label: "Jul", uploads: 64 },
  { label: "Aug", uploads: 148 },
  { label: "Sep", uploads: 102 },
  { label: "Oct", uploads: 121 },
  { label: "Nov", uploads: 76 },
  { label: "Dec", uploads: 139 }
];

const dailyData = [
  { label: "1", uploads: 22 },
  { label: "3", uploads: 41 },
  { label: "5", uploads: 28 },
  { label: "7", uploads: 56 },
  { label: "9", uploads: 34 },
  { label: "11", uploads: 62 },
  { label: "13", uploads: 45 },
  { label: "15", uploads: 71 },
  { label: "17", uploads: 39 },
  { label: "19", uploads: 58 },
  { label: "21", uploads: 47 },
  { label: "23", uploads: 66 },
  { label: "25", uploads: 31 },
  { label: "27", uploads: 52 },
  { label: "29", uploads: 44 }
];

const weeklyData = [
  { label: "Mon", uploads: 18 },
  { label: "Tue", uploads: 32 },
  { label: "Wed", uploads: 24 },
  { label: "Thu", uploads: 41 },
  { label: "Fri", uploads: 35 },
  { label: "Sat", uploads: 12 },
  { label: "Sun", uploads: 9 }
];

const dataByPeriod = {
  "12m": monthlyData,
  "30d": dailyData,
  "7d": weeklyData
};

type Period = keyof typeof dataByPeriod;

const chartConfig = {
  uploads: {
    label: "Uploads",
    color: "var(--primary)"
  }
} satisfies ChartConfig;

export function UserUploadActivity() {
  const [period, setPeriod] = React.useState<Period>("12m");

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>User Upload Activity</CardTitle>
        <CardAction className="@max-md/card:w-full">
          <Tabs value={period} onValueChange={(value) => setPeriod(value as Period)}>
            <TabsList className="@max-md/card:w-full @max-md/card:*:flex-1">
              <TabsTrigger value="12m">12 Months</TabsTrigger>
              <TabsTrigger value="30d">30 Days</TabsTrigger>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col">
        <ChartContainer config={chartConfig} className="aspect-auto min-h-[250px] w-full flex-1 [&_.recharts-responsive-container]:min-h-[250px]">
          <LineChart
            accessibilityLayer
            data={dataByPeriod[period]}
            margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={34} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Line
              dataKey="uploads"
              type="monotone"
              stroke="var(--color-uploads)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
