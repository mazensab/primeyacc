import { CalendarCheck2Icon, CalendarClockIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const stats = [
  {
    label: "In Progress",
    detail: "30 courses",
    percent: 65,
    icon: CalendarClockIcon,
    iconClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    indicatorColor: "bg-orange-500"
  },
  {
    label: "Completed",
    detail: "18 courses",
    percent: 50,
    icon: CalendarCheck2Icon,
    iconClass: "bg-green-500/10 text-green-600 dark:text-green-400",
    indicatorColor: "bg-green-500"
  }
];

export function ProgressStatisticsCard() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Progress Statistics</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="space-y-1 py-2 text-center">
          <div className="text-muted-foreground text-sm">Total Activity</div>
          <div className="font-display text-4xl">72.5%</div>
          <div className="text-muted-foreground text-xs">
            Average completion across all courses
          </div>
        </div>
        <div className="space-y-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    stat.iconClass
                  )}>
                  <stat.icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{stat.label}</div>
                  <div className="text-muted-foreground text-xs">{stat.detail}</div>
                </div>
                <span className="text-muted-foreground text-sm tabular-nums">{stat.percent}%</span>
              </div>
              <Progress
                className="mt-3 h-1.5"
                value={stat.percent}
                indicatorColor={stat.indicatorColor}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
