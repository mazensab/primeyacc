import {
  CalendarOffIcon,
  StarIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UserCheckIcon,
  UsersIcon,
  type LucideIcon
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Stat = {
  title: string;
  value: string;
  suffix?: string;
  change: number;
  icon: LucideIcon;
};

const stats: Stat[] = [
  { title: "Total Employees", value: "1,198", change: 2.8, icon: UsersIcon },
  { title: "Attendance Rate", value: "90.3%", change: 2.7, icon: UserCheckIcon },
  { title: "Leave Requests", value: "118", change: -0.5, icon: CalendarOffIcon },
  { title: "Average KPI", value: "8.9", suffix: "/10", change: 0.8, icon: StarIcon }
];

export default function StatCards() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const up = stat.change > 0;
        const Trend = up ? TrendingUpIcon : TrendingDownIcon;
        return (
          <Card key={stat.title}>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm">
                <stat.icon className="mr-3 inline size-7 rounded-md border p-1.5" />
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex h-full flex-col justify-between">
              <div className="font-display mb-2 text-3xl">
                {stat.value}
                {stat.suffix && (
                  <span className="text-muted-foreground text-lg">{stat.suffix}</span>
                )}
              </div>
              <div
                className={cn("flex items-center text-sm", up ? "text-green-600" : "text-red-600")}
              >
                <Trend className="mr-1 size-4" />
                {up ? "+" : ""}
                {stat.change}%<span className="text-muted-foreground ml-1">vs last week</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
