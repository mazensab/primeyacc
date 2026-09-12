"use client";

import { ArrowUpIcon, CreditCardIcon, TrendingUpIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const incomeData = [
  { category: "Rental", amount: 35000, className: "bg-blue-500" },
  { category: "Investments", amount: 28000, className: "bg-teal-500" },
  { category: "Business", amount: 18000, className: "bg-amber-500" },
  { category: "Freelance", amount: 11000, className: "bg-purple-500" }
];

export default function Revenue() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Sources</CardTitle>
        <CardAction>
          <Button variant="ghost" size="icon-sm" aria-label="Open income report">
            <ArrowUpIcon className="rotate-45" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col">
        <div className="space-y-4 lg:space-y-6">
          <div>
            <div className="text-muted-foreground mb-1 text-sm">Total Income</div>
            <div className="font-display mb-2 text-2xl lg:text-3xl">$92,000</div>
            <div className="flex items-center gap-1.5">
              <Badge variant="success">
                <TrendingUpIcon />
                15.5%
              </Badge>
              <span className="text-muted-foreground text-xs">compared to last month</span>
            </div>
          </div>

          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
            {incomeData.map((item, index) => (
              <div
                key={index}
                className={`h-full ${item.className}`}
                style={{ width: `${(item.amount / 92000) * 100}%` }}
              />
            ))}
          </div>

          <div className="space-y-4 lg:space-y-6">
            {incomeData.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <div className={`size-3 rounded-full ${item.className}`} />
                  <span className="text-muted-foreground">{item.category}</span>
                </div>
                <span className="font-medium">${item.amount.toLocaleString("en-US")}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
