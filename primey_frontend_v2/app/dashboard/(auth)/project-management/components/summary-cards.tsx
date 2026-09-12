import {
  Award,
  Briefcase,
  DollarSign,
  FileClock,
  TrendingDownIcon,
  TrendingUpIcon
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  {
    label: "Total Revenue",
    value: "$45,231.89",
    change: "20.1%",
    trend: "up" as const,
    icon: DollarSign
  },
  {
    label: "Active Projects",
    value: "1.423",
    change: "5.02%",
    trend: "up" as const,
    icon: Briefcase
  },
  {
    label: "New Leads",
    value: "3.500",
    change: "3.58%",
    trend: "down" as const,
    icon: Award
  },
  {
    label: "Time Spent",
    value: "168h 40m",
    change: "3.58%",
    trend: "down" as const,
    icon: FileClock
  }
];

export function SummaryCards() {
  return (
    <div className="grid gap-4 lg:gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader>
            <CardTitle>{stat.label}</CardTitle>
            <CardAction>
              <stat.icon className="text-muted-foreground/50 size-4 lg:size-5" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="font-display text-2xl lg:text-3xl">{stat.value}</div>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge variant={stat.trend === "up" ? "success" : "destructive"}>
                {stat.trend === "up" ? <TrendingUpIcon /> : <TrendingDownIcon />}
                {stat.change}
              </Badge>
              <span className="text-muted-foreground text-xs">from last month</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
