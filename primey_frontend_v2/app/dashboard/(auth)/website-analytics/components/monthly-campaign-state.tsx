import { cn } from "@/lib/utils";

import { InfoIcon } from "lucide-react";

import Icon from "@/components/icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const data = {
  title: "Monthly Campaign State",
  metrics: [
    {
      name: "Emails",
      value: 1.503,
      percentage: -0.3,
      icon: "Mail"
    },
    {
      name: "Opened",
      value: 6.043,
      percentage: 2.1,
      icon: "Eye"
    },
    {
      name: "Clicked",
      value: 600,
      percentage: -2.1,
      icon: "MousePointer"
    },
    {
      name: "Subscribe",
      value: 490,
      percentage: 8.5,
      icon: "UserPlus"
    },
    {
      name: "Complaints",
      value: 490,
      percentage: 4.5,
      icon: "CircleAlert"
    },
    {
      name: "Unsubscribe",
      value: 1.2,
      percentage: -0.5,
      icon: "UserMinus"
    }
  ]
};

export function MonthlyCampaignStateCard() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          {data.title}
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="text-muted-foreground size-3.5" />
            </TooltipTrigger>
            <TooltipContent>8.5K social visitors</TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-full flex-col gap-4">
          {data.metrics.map((metric, key) => (
            <div key={key} className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-full border">
                <Icon name={metric.icon} className="size-4" />
              </div>
              <p>{metric.name}</p>
              <div className="ml-auto flex items-center justify-between space-x-3">
                <span className="text-sm text-muted-foreground">{metric.value}</span>
                <div className="w-14 text-end">
                  <Badge
                    variant="outline"
                    className={cn({
                      "text-green-600": metric.percentage >= 0,
                      "text-red-600": metric.percentage < 0
                    })}>
                    {metric.percentage}%
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
