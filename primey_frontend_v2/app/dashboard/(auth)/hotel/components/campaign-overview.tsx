"use client";

import { useState } from "react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { CalendarIcon, Download } from "lucide-react";

const data: Record<
  string,
  {
    booked: number;
    visited: number;
    performanceChange: number;
    chartData: { date: string; visited: number; booked: number }[];
  }
> = {
  "this-week": {
    booked: 290,
    visited: 638,
    performanceChange: 12,
    chartData: [
      { date: "Aug 15", visited: 45, booked: 30 },
      { date: "Aug 16", visited: 20, booked: 10 },
      { date: "Aug 17", visited: 60, booked: 25 },
      { date: "Aug 18", visited: 95, booked: 60 },
      { date: "Aug 19", visited: 140, booked: 110 },
      { date: "Aug 20", visited: 10, booked: 45 },
      { date: "Aug 21", visited: 110, booked: 90 }
    ]
  },
  "last-week": {
    booked: 245,
    visited: 520,
    performanceChange: 8,
    chartData: [
      { date: "Aug 8", visited: 35, booked: 25 },
      { date: "Aug 9", visited: 50, booked: 35 },
      { date: "Aug 10", visited: 80, booked: 45 },
      { date: "Aug 11", visited: 70, booked: 50 },
      { date: "Aug 12", visited: 100, booked: 70 },
      { date: "Aug 13", visited: 85, booked: 55 },
      { date: "Aug 14", visited: 100, booked: 65 }
    ]
  },
  "this-month": {
    booked: 850,
    visited: 1920,
    performanceChange: 15,
    chartData: [
      { date: "Aug 1", visited: 180, booked: 120 },
      { date: "Aug 6", visited: 220, booked: 150 },
      { date: "Aug 11", visited: 280, booked: 190 },
      { date: "Aug 16", visited: 320, booked: 210 },
      { date: "Aug 21", visited: 290, booked: 180 }
    ]
  },
  "last-month": {
    booked: 780,
    visited: 1750,
    performanceChange: 10,
    chartData: [
      { date: "Jul 1", visited: 150, booked: 100 },
      { date: "Jul 8", visited: 200, booked: 130 },
      { date: "Jul 15", visited: 250, booked: 170 },
      { date: "Jul 22", visited: 300, booked: 200 },
      { date: "Jul 29", visited: 280, booked: 180 }
    ]
  },
  "last-3-months": {
    booked: 2100,
    visited: 4800,
    performanceChange: 22,
    chartData: [
      { date: "Jun", visited: 1400, booked: 600 },
      { date: "Jul", visited: 1600, booked: 700 },
      { date: "Aug", visited: 1800, booked: 800 }
    ]
  }
};

const chartConfig = {
  visited: {
    label: "Visited",
    color: "var(--chart-1)"
  },
  booked: {
    label: "Booked",
    color: "var(--chart-4)"
  }
};

export function CampaignOverview() {
  const [dateRange, setDateRange] = useState("this-week");
  const campaignData = data[dateRange];

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Overview</CardTitle>
        <CardAction className="flex gap-2">
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger>
              <CalendarIcon />
              <div className="hidden lg:flex">
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="last-week">Last Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="last-3-months">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid items-end gap-4 lg:grid-cols-2 lg:gap-6">
          <div className="order-2 grid grid-cols-2 divide-x rounded-lg border lg:order-1">
            <div className="space-y-1 p-4">
              <p className="text-muted-foreground text-xs">Booked</p>
              <p className="text-xl font-semibold lg:text-2xl">{campaignData.booked}</p>
            </div>
            <div className="space-y-1 p-4">
              <p className="text-muted-foreground text-xs">Visited</p>
              <p className="text-xl font-semibold lg:text-2xl">{campaignData.visited}</p>
            </div>
          </div>
          <div className="order-1 space-y-1 lg:order-2 lg:text-end">
            <p>Performance</p>
            <p className="text-xs">
              <span className="text-green-500">{campaignData.performanceChange}+</span>
              <span className="text-muted-foreground ml-1">Compared to last week</span>
            </p>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="aspect-video w-full md:h-[205px]">
          <LineChart
            data={campaignData.chartData}
            margin={{ top: 20, right: 20, bottom: 20, left: -15 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              dx={-10}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="visited" stroke="var(--color-visited)" dot={false} />
            <Line type="monotone" dataKey="booked" stroke="var(--color-booked)" dot={false} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
