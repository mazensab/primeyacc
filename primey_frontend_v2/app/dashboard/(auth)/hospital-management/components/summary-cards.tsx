import {
  CalendarIcon,
  CreditCardIcon,
  DollarSignIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UsersIcon
} from "lucide-react";

import { Fragment } from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import CountAnimation from "@/components/ui/custom/count-animation";
import { Separator } from "@/components/ui/separator";

const stats = [
  {
    label: "Total Appointments",
    value: 2350,
    change: "20.1%",
    trend: "up" as const,
    icon: CalendarIcon,
    iconClass: "bg-indigo-200 dark:bg-indigo-950"
  },
  {
    label: "New Patients",
    value: 145,
    change: "180.1%",
    trend: "up" as const,
    icon: UsersIcon,
    iconClass: "bg-green-200 dark:bg-green-950"
  },
  {
    label: "Operations",
    value: 89,
    change: "19%",
    trend: "down" as const,
    icon: CreditCardIcon,
    iconClass: "bg-purple-200 dark:bg-purple-950"
  },
  {
    label: "Total Revenue",
    value: 9583,
    prefix: "$",
    change: "20.1%",
    trend: "up" as const,
    icon: DollarSignIcon,
    iconClass: "bg-orange-200 dark:bg-orange-950"
  }
];

export function SummaryCards() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {stats.map((stat, index) => (
            <Fragment key={stat.label}>
              {index > 0 && (
                <>
                  <Separator className="lg:hidden" />
                  <Separator orientation="vertical" className="hidden lg:block" />
                </>
              )}
              <div className="flex flex-1 items-start justify-between gap-3 p-4 lg:p-5">
                <div className="space-y-2">
                  <p className="text-sm font-semibold">{stat.label}</p>
                  <div className="font-display text-2xl lg:text-3xl">
                    {stat.prefix}
                    <CountAnimation number={stat.value} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={stat.trend === "up" ? "success" : "destructive"}>
                      {stat.trend === "up" ? <TrendingUpIcon /> : <TrendingDownIcon />}
                      {stat.change}
                    </Badge>
                    <span className="text-muted-foreground text-xs">from last month</span>
                  </div>
                </div>
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    stat.iconClass
                  )}>
                  <stat.icon className="size-4.5" />
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
