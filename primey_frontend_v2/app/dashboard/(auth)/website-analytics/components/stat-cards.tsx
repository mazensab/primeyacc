"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";

const data = [
  {
    name: "Daily active users",
    stat: "3,450",
    change: "+12.1%",
    changeType: "positive"
  },
  {
    name: "Weekly sessions",
    stat: "1,342",
    change: "-9.8%",
    changeType: "negative"
  },
  {
    name: "Duration",
    stat: "5.2min",
    change: "+7.7%",
    changeType: "positive"
  },
  {
    name: "Conversion Rate",
    stat: "2.8%",
    change: "+4.3%",
    changeType: "positive"
  }
];

export function StatCards() {
  return (
    <div className="flex w-full items-center justify-center">
      <div className="grid w-full grid-cols-1 gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((item) => (
          <Card key={item.name} className="w-full">
            <CardHeader>
              <CardTitle>{item.name}</CardTitle>
              <CardAction>
                <Badge
                  variant={item.changeType === "positive" ? "success" : "destructive"}
                  className="text-xs font-medium">
                  {item.changeType === "positive" ? <TrendingUp /> : <TrendingDown />}
                  <span className="sr-only">
                    {item.changeType === "positive" ? "Increased" : "Decreased"} by{" "}
                  </span>
                  {item.change}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="text-foreground text-3xl font-semibold">{item.stat}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
