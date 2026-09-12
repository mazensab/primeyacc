"use client";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { FolderUp, InfoIcon } from "lucide-react";

type SalesData = {
  country: string;
  percentage: number;
  value: number;
  change: number;
};

export function EcommerceSalesByLocationCard() {
  const salesData: SalesData[] = [
    { country: "Canada", percentage: 85, value: 1275000, change: 5.2 },
    { country: "Greenland", percentage: 80, value: 1200000, change: 7.8 },
    { country: "Russia", percentage: 63, value: 945000, change: -2.1 },
    { country: "China", percentage: 60, value: 900000, change: 3.4 },
    { country: "Australia", percentage: 45, value: 675000, change: 1.2 },
    { country: "Greece", percentage: 40, value: 475000, change: 1 }
  ];

  return (
    <Card className="lg:col-span-6 xl:col-span-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Sales by Location
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="text-muted-foreground size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Income in the last 28 days</TooltipContent>
          </Tooltip>
        </CardTitle>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FolderUp /> <span className="hidden lg:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Excel</DropdownMenuItem>
              <DropdownMenuItem>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {salesData.map((item, key) => (
            <div key={item.country} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{item.country}</span>
                  {item.change > 0 ? (
                    <Badge variant="outline" className="text-green-500">
                      +{item.change}%
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-500">
                      {item.change}%
                    </Badge>
                  )}
                </div>
                <div className="text-sm">{item.percentage}%</div>
              </div>
              <Progress value={item.percentage} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
